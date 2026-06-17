"""Citizen-facing API: services catalogue, search, streaming chat, voice transcribe."""
from __future__ import annotations

import json
import re
from typing import Any

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.catalogue import crud
from app.catalogue.models import Service
from app.db.database import get_db
from app.llm import claude
from app.llm.language import SUPPORTED, detect_language
from app.llm.prompts import build_citizen_system
from app.rag.retriever import RetrievalResult, expand_query, retrieve, retrieve_hybrid
from app.rag.search import smart_search
from app.voice.transcribe import transcribe_audio

router = APIRouter(prefix="/api", tags=["citizen"])


# ---------------------------------------------------------------- schemas


class ServiceListItem(BaseModel):
    id: int
    service_id: str
    category: str
    name: str
    description: str
    fee: str
    duration: str
    office: str


class ServicesPage(BaseModel):
    items: list[ServiceListItem]
    total: int
    limit: int
    offset: int


class ServiceDetail(BaseModel):
    id: int
    service_id: str
    category: str
    names: dict[str, str]
    description: dict[str, str]
    fee: str
    duration: str
    office: str
    office_locations: list[dict[str, Any]]
    required_documents: list[str]
    source_urls: list[str]
    last_verified: str
    steps: list[dict[str, Any]]
    faqs: list[dict[str, Any]]
    response_templates: list[dict[str, Any]]


class ChatMessage(BaseModel):
    role: str = Field(..., pattern="^(user|assistant)$")
    content: str


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    history: list[ChatMessage] = Field(default_factory=list)
    language: str | None = None
    simple_mode: bool = False
    service_id: str | None = None
    active_service_id: str | None = None


class FeedbackRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=2000)
    answer: str = Field(default="", max_length=4000)
    helpful: bool
    language: str | None = None
    service_id: str | None = None


# ---------------------------------------------------------------- helpers


def _localized(payload: dict[str, str], language: str) -> str:
    if not isinstance(payload, dict):
        return ""
    return payload.get(language) or payload.get("sq") or next(iter(payload.values()), "")


def _to_list_item(service: Service, language: str) -> ServiceListItem:
    return ServiceListItem(
        id=service.id,
        service_id=service.service_id,
        category=service.category,
        name=_localized(service.names_json, language),
        description=_localized(service.description_json, language),
        fee=service.fee,
        duration=service.duration,
        office=service.office,
    )


def _build_chat_context(chunks: list, max_chars: int = 6000) -> tuple[str, list[dict[str, Any]]]:
    """Render retrieved chunks into a context block + citation list."""
    if not chunks:
        return "(asnjë informacion i indeksuar)", []

    context_parts: list[str] = []
    citations: list[dict[str, Any]] = []
    used = 0
    for idx, ch in enumerate(chunks, start=1):
        snippet = ch.text.strip()
        block = f"[{idx}] (service={ch.service_id}, lang={ch.language})\n{snippet}\n"
        if used + len(block) > max_chars:
            break
        context_parts.append(block)
        used += len(block)
        citations.append(
            {
                "marker": idx,
                "service_id": ch.service_id,
                "language": ch.language,
                "source_url": ch.source_url,
                "snippet": snippet[:240],
            }
        )
    return "\n---\n".join(context_parts), citations


def _structured_procedure(service: Service | None, language: str) -> dict[str, Any] | None:
    if service is None:
        return None
    return {
        "service_id": service.service_id,
        "name": _localized(service.names_json, language),
        "documents": list(service.required_documents_json or []),
        "fee": service.fee,
        "duration": service.duration,
        "office": service.office,
        "source_urls": list(service.source_urls_json or []),
    }


def _sse(event: str, payload: dict[str, Any] | str) -> str:
    data = payload if isinstance(payload, str) else json.dumps(payload, ensure_ascii=False)
    return f"event: {event}\ndata: {data}\n\n"


def _service_summary_block(service: Service, language: str) -> str:
    """Compact summary of a service used as a stable anchor in the LLM context."""
    name = _localized(service.names_json, language) or service.service_id
    desc = _localized(service.description_json, language) or ""
    parts = [f"[SHËRBIMI: {name}]"]
    if desc:
        parts.append(desc)
    if service.fee:
        parts.append(f"Tarifa: {service.fee}")
    if service.duration:
        parts.append(f"Koha: {service.duration}")
    if service.office:
        parts.append(f"Zyra: {service.office}")
    if service.required_documents_json:
        docs = ", ".join(service.required_documents_json[:6])
        parts.append(f"Dokumentet: {docs}")
    return "\n".join(parts)


_FALLBACK_LINES: dict[str, str] = {
    "sq": (
        "Nuk kam informacion të saktë për këtë në burimet e mia. "
        "Ju lutem vizitoni eKosova.rks-gov.net ose telefononi 038 200 30 900."
    ),
    "en": (
        "I do not have reliable information about this in my sources. "
        "Please visit eKosova.rks-gov.net or call 038 200 30 900."
    ),
    "sr": (
        "Nemam pouzdane informacije o tome u svojim izvorima. "
        "Posetite eKosova.rks-gov.net ili pozovite 038 200 30 900."
    ),
}


def _fallback_line(language: str) -> str:
    return _FALLBACK_LINES.get(language, _FALLBACK_LINES["sq"])


_CITATION_MARKER_RE = re.compile(r"\[(\d+)\]")

_FOLLOWUP_PREFIXES = (
    # sq
    "po për ", "po a ", "po nëse ", "po çfarë ", "po sa ", "po ku ", "po kur ",
    "edhe për ", "dhe për ",
    # en
    "and for ", "what about ", "and if ", "and what ", "what if ",
    # sr
    "a za ", "šta za ", "a šta ",
)


_CLARIFICATION_PROMPTS: dict[str, str] = {
    "sq": "Po flet për cilin shërbim?",
    "en": "Which service did you mean?",
    "sr": "O kojoj usluzi je reč?",
}

CLARIFICATION_CONFIDENCE_LOW = 0.40
CLARIFICATION_CONFIDENCE_HIGH = 0.70


def _clarification_prompt(language: str) -> str:
    return _CLARIFICATION_PROMPTS.get(language, _CLARIFICATION_PROMPTS["sq"])


def _clarification_candidates(
    retrieval: "RetrievalResult",
    db: Session,
    language: str,
    anchor_service_id: str | None,
) -> list[dict[str, Any]]:
    """Return up to 3 candidate services when retrieval looks ambiguous.

    Triggered only when:
      - the conversation isn't already anchored to a service, AND
      - confidence is in the [0.40, 0.70] band ("we found stuff, but spread"), AND
      - the top chunks reference at least 2 distinct service_ids.
    """
    if anchor_service_id:
        return []
    if not retrieval.grounded:
        return []
    if not (CLARIFICATION_CONFIDENCE_LOW <= retrieval.confidence <= CLARIFICATION_CONFIDENCE_HIGH):
        return []

    seen: dict[str, int] = {}
    for chunk in retrieval.chunks[:5]:
        sid = chunk.service_id
        if sid and sid not in seen:
            seen[sid] = len(seen)
    if len(seen) < 2:
        return []

    candidates: list[dict[str, Any]] = []
    for sid in seen:
        svc = crud.get_service_by_service_id(db, sid)
        if svc is None:
            continue
        candidates.append(
            {
                "service_id": svc.service_id,
                "name": _localized(svc.names_json, language) or svc.service_id,
                "category": svc.category or "",
            }
        )
        if len(candidates) >= 3:
            break
    return candidates


def _looks_like_followup(text: str) -> bool:
    """Heuristic: short, vague replies that reference the previous topic.

    Matches a curated list of conversational prefixes plus very short utterances
    that lack a service noun. Tuned to avoid false positives on standalone
    questions like "Sa kushton pasaporta?".
    """
    if not text:
        return False
    stripped = text.strip().lower()
    if len(stripped.split()) <= 3:
        return True
    return any(stripped.startswith(p) for p in _FOLLOWUP_PREFIXES)


def _extract_used_citations(answer_text: str, citations: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Return only the citation rows whose markers appear in the answer."""
    if not citations:
        return []
    used = {int(m) for m in _CITATION_MARKER_RE.findall(answer_text or "")}
    if not used:
        return []
    return [c for c in citations if c.get("marker") in used]


# ---------------------------------------------------------------- routes


@router.get("/compare")
def compare_services(
    a: str = Query(..., description="First service_id"),
    b: str = Query(..., description="Second service_id"),
    language: str = Query("sq"),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Return two services side-by-side for a comparison UI."""
    if language not in SUPPORTED:
        language = "sq"
    svc_a = crud.get_service_by_service_id(db, a)
    svc_b = crud.get_service_by_service_id(db, b)
    if svc_a is None or svc_b is None:
        raise HTTPException(status_code=404, detail="One or both services not found")

    def shape(svc: Service) -> dict[str, Any]:
        return {
            "service_id": svc.service_id,
            "category": svc.category,
            "name": _localized(svc.names_json, language),
            "description": _localized(svc.description_json, language),
            "fee": svc.fee,
            "duration": svc.duration,
            "office": svc.office,
            "required_documents": list(svc.required_documents_json or []),
            "source_urls": list(svc.source_urls_json or []),
            "last_verified": svc.last_verified or "",
            "step_count": len(svc.steps),
            "faq_count": len(svc.faqs),
        }

    return {"a": shape(svc_a), "b": shape(svc_b), "language": language}


@router.get("/services", response_model=ServicesPage)
def list_services(
    category: str | None = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    language: str = Query("sq"),
    db: Session = Depends(get_db),
) -> ServicesPage:
    if language not in SUPPORTED:
        language = "sq"
    services = crud.list_services(db, category=category, limit=limit, offset=offset)
    total = crud.count_services(db, category=category)
    return ServicesPage(
        items=[_to_list_item(s, language) for s in services],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/services/{service_id}", response_model=ServiceDetail)
def get_service(service_id: str, db: Session = Depends(get_db)) -> ServiceDetail:
    service = crud.get_service_by_service_id(db, service_id)
    if service is None:
        raise HTTPException(status_code=404, detail="Service not found")
    return ServiceDetail(**crud.serialize_service(service))


@router.get("/search")
async def search(
    q: str = Query(..., min_length=1, max_length=200),
    language: str = Query("sq"),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    if language not in SUPPORTED:
        language = "sq"
    return await smart_search(db, q, language=language)


@router.post("/chat")
async def chat(req: ChatRequest, db: Session = Depends(get_db)) -> StreamingResponse:
    language = (req.language or detect_language(req.message)).lower()
    if language not in SUPPORTED:
        language = "sq"

    # Pick the effective anchor service: explicit (current page) wins, falling
    # back to the active service the client is tracking across the conversation.
    # The "follow-up" heuristic keeps retrieval anchored when the user types a
    # short reply ("po për fëmijët?" / "and for children?") that obviously
    # references the previous topic.
    anchor_service_id = req.service_id
    if not anchor_service_id and req.active_service_id and _looks_like_followup(req.message):
        anchor_service_id = req.active_service_id

    where_filter: dict[str, Any] | None = {"language": language}
    if anchor_service_id:
        where_filter = {
            "$and": [{"language": language}, {"service_id": anchor_service_id}]
        }

    # If the citizen is already on a service page, prepend the service summary
    # to give the LLM a stable anchor regardless of which chunks come back.
    service_summary = ""
    structured_service = None
    if anchor_service_id:
        structured_service = crud.get_service_by_service_id(db, anchor_service_id)
        if structured_service is not None:
            service_summary = _service_summary_block(structured_service, language)

    expanded = expand_query(
        req.message,
        service_name=_localized(structured_service.names_json, language) if structured_service else None,
    )

    retrieval: RetrievalResult = RetrievalResult.empty()
    retrieval_error = ""
    try:
        retrieval = await retrieve_hybrid(db, expanded, top_k=5, where=where_filter)
    except Exception as exc:
        retrieval_error = str(exc)

    chunks = retrieval.chunks
    context, citations = _build_chat_context(chunks)
    if service_summary:
        context = f"{service_summary}\n\n---\n\n{context}" if context else service_summary

    if structured_service is None and chunks:
        first_sid = chunks[0].service_id
        if first_sid:
            structured_service = crud.get_service_by_service_id(db, first_sid)
    structured = _structured_procedure(structured_service, language)

    system_prompt = build_citizen_system(context, simple_mode=req.simple_mode)
    messages: list[dict[str, Any]] = [
        {"role": m.role, "content": m.content} for m in req.history
    ]
    messages.append({"role": "user", "content": req.message})

    # Persist intent immediately; we update the answer text after the stream finishes.
    log_entry = crud.log_query(
        db,
        role="citizen",
        query=req.message,
        found_match=retrieval.grounded,
        language=language,
    )
    db.commit()
    log_id = log_entry.id

    async def event_stream():
        full_answer_parts: list[str] = []
        try:
            if retrieval_error:
                yield _sse("warning", {"message": "retrieval_failed", "detail": retrieval_error})

            yield _sse("language", {"language": language})
            yield _sse(
                "retrieval",
                {
                    "grounded": retrieval.grounded,
                    "confidence": retrieval.confidence,
                    "method": retrieval.method,
                    "chunks": len(retrieval.chunks),
                    "active_service_id": structured_service.service_id if structured_service else None,
                    "active_service_name": _localized(structured_service.names_json, language)
                    if structured_service
                    else None,
                },
            )

            if citations:
                yield _sse("citations", {"citations": citations})

            # Hard guard: when there is no grounded context, refuse to answer
            # and serve the verified fallback line. Cheap (no LLM call) and
            # guarantees we never invent fees / dates / offices.
            if not retrieval.grounded and not service_summary:
                yield _sse(
                    "token",
                    {"content": _fallback_line(language)},
                )
                yield _sse("done", {"ok": True, "grounded": False})
                return

            # Medium-confidence path: the chunks point to more than one service,
            # so emit a clarification offer alongside the streamed answer. The
            # citizen can either let the answer stream or click a candidate to
            # narrow the question. We still continue with the answer below.
            candidates = _clarification_candidates(retrieval, db, language, anchor_service_id)
            if candidates:
                yield _sse(
                    "clarification",
                    {"prompt": _clarification_prompt(language), "candidates": candidates},
                )

            async for token in claude.stream_complete(
                system=system_prompt,
                messages=messages,
                max_tokens=1024,
                temperature=0.3,
            ):
                full_answer_parts.append(token)
                yield _sse("token", {"content": token})

            if structured is not None:
                yield _sse("structured", structured)

            # Citation hygiene: only keep markers the LLM actually referenced.
            answer_text = "".join(full_answer_parts)
            used = _extract_used_citations(answer_text, citations)
            if used and len(used) != len(citations):
                yield _sse("citations_final", {"citations": used})

            yield _sse("done", {"ok": True, "grounded": retrieval.grounded})
        except Exception as exc:
            yield _sse("error", {"message": str(exc)})
        finally:
            answer = "".join(full_answer_parts)
            if answer:
                try:
                    crud.update_query_answer(db, log_id, answer[:4000])
                    db.commit()
                except Exception:
                    db.rollback()

    headers = {"Cache-Control": "no-cache", "X-Accel-Buffering": "no"}
    return StreamingResponse(event_stream(), media_type="text/event-stream", headers=headers)


@router.post("/voice/transcribe")
async def voice_transcribe(
    audio: UploadFile = File(...),
    language: str | None = Form(None),
) -> dict[str, Any]:
    if not audio.filename:
        raise HTTPException(status_code=400, detail="Missing audio filename")

    raw = await audio.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Empty audio payload")

    hint = language if language in SUPPORTED else None
    try:
        text = await transcribe_audio(raw, filename=audio.filename, language=hint)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Transcription failed: {exc}") from exc

    return {"text": text, "language": hint or detect_language(text)}


@router.post("/feedback")
def submit_feedback(req: FeedbackRequest, db: Session = Depends(get_db)) -> dict[str, bool]:
    """Log a citizen 👍/👎 against an assistant answer.

    Lives next to the chat endpoint and feeds the same QueryLog table so the
    admin analytics surface honest "did this actually help" numbers in addition
    to the retrieval-grounding signal.
    """
    language = (req.language or detect_language(req.query)).lower()
    if language not in SUPPORTED:
        language = "sq"
    crud.log_query(
        db,
        role="feedback",
        query=req.query,
        answer=req.answer[:4000],
        found_match=req.helpful,
        language=language,
    )
    db.commit()
    return {"ok": True}
