"""Agent co-pilot API.

- `WS /ws/agent/suggest` — debounced suggestion stream. The agent types into the
  call screen and we feed RAG-grounded Claude JSON back as suggestions.
- `POST /api/agent/template/personalize` — fill placeholders in a saved template.
- `POST /api/agent/summary` — 3-4 sentence Albanian summary for the CRM.
- `GET  /api/agent/templates` — list templates (optionally filtered by service).
- `POST /api/agent/log-helpful` — track which suggestions agents accepted.
"""
from __future__ import annotations

import asyncio
import json
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.catalogue import crud
from app.db.database import get_db
from app.llm import claude
from app.llm.language import SUPPORTED, detect_language
from app.llm.prompts import build_agent_system, build_summary_prompt, build_template_prompt
from app.middleware.auth import ROLE_AGENT, authenticate_ws, require_agent
from app.rag.retriever import retrieve

router = APIRouter(tags=["agent"])

DEBOUNCE_MS = 300


# ---------------------------------------------------------------- helpers


def _localized(payload: dict[str, str] | None, language: str) -> str:
    if not isinstance(payload, dict):
        return ""
    return payload.get(language) or payload.get("sq") or next(iter(payload.values()), "")


def _format_context(chunks) -> str:
    if not chunks:
        return "(asnjë informacion i indeksuar)"
    lines: list[str] = []
    for idx, c in enumerate(chunks, 1):
        lines.append(f"[{idx}] ({c.service_id}/{c.language}) {c.text.strip()}")
    return "\n".join(lines)


def _extract_json_block(text: str) -> dict[str, Any]:
    """Best-effort JSON extraction from Claude output.

    The model is asked for strict JSON but occasionally wraps it in prose; this
    finds the first `{` ... matching `}` to recover gracefully.
    """
    cleaned = text.strip()
    if not cleaned:
        return {"suggestions": []}

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass

    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start != -1 and end > start:
        try:
            return json.loads(cleaned[start : end + 1])
        except json.JSONDecodeError:
            return {"suggestions": [], "raw": cleaned}
    return {"suggestions": [], "raw": cleaned}


async def _generate_suggestions(input_text: str, current_service: str | None) -> dict[str, Any]:
    language = detect_language(input_text)
    where: dict[str, Any] | None = {"language": language}
    if current_service:
        where = {"$and": [{"language": language}, {"service_id": current_service}]}

    try:
        chunks = await retrieve(input_text, top_k=4, where=where)
    except Exception as exc:
        return {"suggestions": [], "error": f"retrieval_failed: {exc}", "language": language}

    system = build_agent_system(_format_context(chunks))
    response_text = await claude.complete(
        system=system,
        messages=[{"role": "user", "content": input_text}],
        max_tokens=512,
        temperature=0.2,
    )
    parsed = _extract_json_block(response_text)
    parsed.setdefault("suggestions", [])
    parsed["language"] = language
    parsed["chunks_used"] = len(chunks)
    return parsed


# ---------------------------------------------------------------- WebSocket


@router.websocket("/ws/agent/suggest")
async def agent_suggest(websocket: WebSocket) -> None:
    """Debounced suggestion stream.

    Client sends {"input": str, "current_service": str | None}. We cancel the
    previous in-flight request whenever new keystrokes arrive — only the latest
    payload after the debounce window gets a Claude call.
    """
    await authenticate_ws(websocket, expected_role=ROLE_AGENT)
    await websocket.accept()

    pending_task: asyncio.Task[Any] | None = None

    async def respond(payload: dict[str, Any]) -> None:
        text = (payload.get("input") or "").strip()
        if not text:
            await websocket.send_json({"suggestions": [], "reason": "empty_input"})
            return
        try:
            await asyncio.sleep(DEBOUNCE_MS / 1000)
            result = await _generate_suggestions(text, payload.get("current_service"))
            await websocket.send_json(result)
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            await websocket.send_json({"suggestions": [], "error": str(exc)})

    try:
        while True:
            data = await websocket.receive_json()
            if pending_task is not None and not pending_task.done():
                pending_task.cancel()
            pending_task = asyncio.create_task(respond(data))
    except WebSocketDisconnect:
        pass
    finally:
        if pending_task is not None and not pending_task.done():
            pending_task.cancel()


# ---------------------------------------------------------------- HTTP routes


class TemplatePersonalizeRequest(BaseModel):
    template_id: int | None = None
    template_text: str | None = None
    language: str = "sq"
    variables: dict[str, Any] = Field(default_factory=dict)


class TemplatePersonalizeResponse(BaseModel):
    text: str
    language: str


@router.post("/api/agent/template/personalize", response_model=TemplatePersonalizeResponse)
async def template_personalize(
    req: TemplatePersonalizeRequest,
    db: Session = Depends(get_db),
    _principal: dict = Depends(require_agent),
) -> TemplatePersonalizeResponse:
    """Personalize a template. Either pass `template_id` (loads from DB) or
    `template_text` directly."""
    language = req.language if req.language in SUPPORTED else "sq"

    template_text = (req.template_text or "").strip()
    if not template_text and req.template_id is not None:
        tpl = crud.get_template(db, req.template_id)
        if tpl is None:
            raise HTTPException(status_code=404, detail="Template not found")
        template_text = _localized(tpl.templates_json, language)

    if not template_text:
        raise HTTPException(status_code=400, detail="Provide template_id or template_text")

    variables_json = json.dumps(req.variables, ensure_ascii=False, indent=2)
    system = build_template_prompt(template=template_text, variables=variables_json)

    text = await claude.complete(
        system="Ti je ZANA Template Engine. Plotëso template-in si i specifikuar.",
        messages=[{"role": "user", "content": system}],
        max_tokens=512,
        temperature=0.2,
    )
    return TemplatePersonalizeResponse(text=text.strip(), language=language)


class SummaryRequest(BaseModel):
    service: str = ""
    queries: list[str] = Field(default_factory=list)
    suggestions: list[str] = Field(default_factory=list)
    notes: str = ""


class SummaryResponse(BaseModel):
    summary: str


@router.post("/api/agent/summary", response_model=SummaryResponse)
async def after_call_summary(
    req: SummaryRequest,
    _principal: dict = Depends(require_agent),
) -> SummaryResponse:
    prompt = build_summary_prompt(
        service=req.service,
        queries="\n".join(f"- {q}" for q in req.queries),
        suggestions="\n".join(f"- {s}" for s in req.suggestions),
        notes=req.notes,
    )
    text = await claude.complete(
        system="Ti je ZANA. Krijo një përmbledhje të shkurtër në shqip për CRM.",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=400,
        temperature=0.4,
    )
    return SummaryResponse(summary=text.strip())


class TemplateOut(BaseModel):
    id: int
    service_id: int
    scenario: str
    templates: dict[str, str]
    placeholders: list[str]


@router.get("/api/agent/templates", response_model=list[TemplateOut])
def list_templates_for_agent(
    service_id: str | None = Query(None),
    db: Session = Depends(get_db),
    _principal: dict = Depends(require_agent),
) -> list[TemplateOut]:
    service_pk: int | None = None
    if service_id:
        svc = crud.get_service_by_service_id(db, service_id)
        if svc is None:
            return []
        service_pk = svc.id
    templates = crud.list_templates(db, service_id=service_pk)
    return [
        TemplateOut(
            id=t.id,
            service_id=t.service_id,
            scenario=t.scenario,
            templates=t.templates_json or {},
            placeholders=list(t.placeholders_json or []),
        )
        for t in templates
    ]


class LogHelpfulRequest(BaseModel):
    query: str
    answer: str
    suggestion_index: int = 0
    helpful: bool = True


@router.post("/api/agent/log-helpful")
def log_helpful(
    req: LogHelpfulRequest,
    db: Session = Depends(get_db),
    _principal: dict = Depends(require_agent),
) -> dict[str, bool]:
    crud.log_query(
        db,
        role="agent",
        query=req.query,
        answer=req.answer,
        found_match=req.helpful,
        language=detect_language(req.query),
    )
    db.commit()
    return {"ok": True}
