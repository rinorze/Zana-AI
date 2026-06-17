"""Admin API.

All endpoints require an admin JWT. Covers:
- Services CRUD (+ partial reindex of one service).
- Response templates CRUD.
- Document upload/list/delete with PDF/DOCX parsing → Chroma.
- URL sources add/list/delete with scrape + reindex.
- Analytics summary (top queries, no-match rate).
- Full catalogue reindex.
"""
from __future__ import annotations

import asyncio
from datetime import datetime
from pathlib import Path
from typing import Any

import aiofiles
from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.catalogue import crud
from app.catalogue.models import Document, ResponseTemplate, Source
from app.config import get_settings
from app.db.database import get_db
from app.ingestion import indexer
from app.ingestion.docx_parser import parse_docx
from app.ingestion.pdf_parser import parse_pdf
from app.ingestion.scraper import scrape_url
from app.middleware.auth import require_admin
from app.rag import vectorstore
from scripts.index_catalogue import _build_service_chunks  # noqa: PLC2701

router = APIRouter(prefix="/api/admin", tags=["admin"], dependencies=[Depends(require_admin)])

UPLOAD_DIR = Path(get_settings().chroma_persist_dir).parent / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

MAX_UPLOAD_BYTES = 15 * 1024 * 1024  # 15 MB ceiling per upload


# ---------------------------------------------------------------- schemas


class ServicePayload(BaseModel):
    service_id: str
    category: str = ""
    names: dict[str, str] = Field(default_factory=dict)
    description: dict[str, str] = Field(default_factory=dict)
    fee: str = ""
    duration: str = ""
    office: str = ""
    office_locations: list[dict[str, Any]] = Field(default_factory=list)
    required_documents: list[str] = Field(default_factory=list)
    source_urls: list[str] = Field(default_factory=list)
    last_verified: str = ""
    steps: list[dict[str, Any]] = Field(default_factory=list)
    faqs: list[dict[str, Any]] = Field(default_factory=list)
    response_templates: list[dict[str, Any]] = Field(default_factory=list)


class TemplatePayload(BaseModel):
    service_service_id: str
    scenario: str
    templates: dict[str, str] = Field(default_factory=dict)
    placeholders: list[str] = Field(default_factory=list)


class SourceCreate(BaseModel):
    url: str
    title: str = ""


# ---------------------------------------------------------------- services CRUD


@router.get("/services")
def admin_list_services(db: Session = Depends(get_db)) -> list[dict[str, Any]]:
    services = crud.list_services(db, limit=500)
    return [crud.serialize_service(s) for s in services]


@router.get("/services/{service_id}")
def admin_get_service(service_id: str, db: Session = Depends(get_db)) -> dict[str, Any]:
    service = crud.get_service_by_service_id(db, service_id)
    if service is None:
        raise HTTPException(status_code=404, detail="Service not found")
    return crud.serialize_service(service)


@router.post("/services")
def admin_create_or_update_service(
    payload: ServicePayload,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    service = crud.upsert_service(db, payload.model_dump())
    db.commit()
    db.refresh(service)
    return crud.serialize_service(service)


@router.delete("/services/{service_id}")
def admin_delete_service(service_id: str, db: Session = Depends(get_db)) -> dict[str, bool]:
    service = crud.get_service_by_service_id(db, service_id)
    if service is None:
        raise HTTPException(status_code=404, detail="Service not found")
    # Drop indexed chunks for this service from Chroma too.
    vectorstore.delete(where={"service_id": service_id})
    crud.delete_service(db, service.id)
    db.commit()
    return {"ok": True}


async def _reindex_service(service_id: str) -> int:
    """Re-embed a single service's chunks into Chroma (idempotent)."""
    from app.db.database import SessionLocal

    with SessionLocal() as db:
        service = crud.get_service_by_service_id(db, service_id)
        if service is None:
            return 0
        chunks = _build_service_chunks(service)

    if not chunks:
        return 0

    # Drop stale chunks first so removed FAQs/steps disappear from search.
    vectorstore.delete(where={"service_id": service_id})

    ids = [c[0] for c in chunks]
    documents = [c[1] for c in chunks]
    metadatas = [c[2] for c in chunks]
    from app.rag.embedder import embed_texts

    embeddings = await embed_texts(documents)
    vectorstore.add(ids=ids, embeddings=embeddings, metadatas=metadatas, documents=documents)
    return len(ids)


@router.post("/services/{service_id}/reindex")
async def admin_reindex_service(service_id: str, db: Session = Depends(get_db)) -> dict[str, Any]:
    service = crud.get_service_by_service_id(db, service_id)
    if service is None:
        raise HTTPException(status_code=404, detail="Service not found")
    indexed = await _reindex_service(service_id)
    return {"service_id": service_id, "chunks_indexed": indexed}


@router.post("/reindex-all")
async def admin_reindex_all(background: BackgroundTasks, db: Session = Depends(get_db)) -> dict[str, Any]:
    services = crud.list_services(db, limit=1000)
    service_ids = [s.service_id for s in services]

    def _run() -> None:
        async def _job() -> None:
            for sid in service_ids:
                try:
                    await _reindex_service(sid)
                except Exception:
                    continue

        asyncio.run(_job())

    background.add_task(_run)
    return {"queued": len(service_ids)}


# ---------------------------------------------------------------- templates CRUD


@router.get("/templates")
def admin_list_templates(db: Session = Depends(get_db)) -> list[dict[str, Any]]:
    return [
        {
            "id": t.id,
            "service_id": t.service_id,
            "scenario": t.scenario,
            "templates": t.templates_json or {},
            "placeholders": list(t.placeholders_json or []),
        }
        for t in crud.list_templates(db)
    ]


@router.post("/templates")
def admin_upsert_template(payload: TemplatePayload, db: Session = Depends(get_db)) -> dict[str, Any]:
    svc = crud.get_service_by_service_id(db, payload.service_service_id)
    if svc is None:
        raise HTTPException(status_code=404, detail="Parent service not found")

    existing = next(
        (t for t in svc.response_templates if t.scenario == payload.scenario),
        None,
    )
    if existing is None:
        tpl = ResponseTemplate(
            service_id=svc.id,
            scenario=payload.scenario,
            templates_json=payload.templates,
            placeholders_json=payload.placeholders,
        )
        db.add(tpl)
    else:
        existing.templates_json = payload.templates
        existing.placeholders_json = payload.placeholders
        tpl = existing

    db.flush()
    db.commit()
    return {
        "id": tpl.id,
        "service_id": tpl.service_id,
        "scenario": tpl.scenario,
        "templates": tpl.templates_json,
        "placeholders": list(tpl.placeholders_json or []),
    }


@router.delete("/templates/{template_id}")
def admin_delete_template(template_id: int, db: Session = Depends(get_db)) -> dict[str, bool]:
    tpl = crud.get_template(db, template_id)
    if tpl is None:
        raise HTTPException(status_code=404, detail="Template not found")
    db.delete(tpl)
    db.commit()
    return {"ok": True}


# ---------------------------------------------------------------- documents


@router.get("/documents")
def admin_list_documents(db: Session = Depends(get_db)) -> list[dict[str, Any]]:
    return [
        {
            "id": d.id,
            "filename": d.filename,
            "file_type": d.file_type,
            "uploaded_at": d.uploaded_at.isoformat() if d.uploaded_at else None,
            "indexed": d.indexed,
            "chunk_count": d.chunk_count,
        }
        for d in crud.list_documents(db)
    ]


def _parse_document(content: bytes, filename: str) -> str:
    name = filename.lower()
    if name.endswith(".pdf"):
        return parse_pdf(content)
    if name.endswith(".docx"):
        return parse_docx(content)
    if name.endswith((".txt", ".md")):
        try:
            return content.decode("utf-8", errors="ignore")
        except Exception:
            return ""
    raise HTTPException(status_code=415, detail="Unsupported file type (use pdf/docx/txt/md)")


async def _index_uploaded_document(doc_id: int, stored_path: Path, filename: str) -> None:
    from app.db.database import SessionLocal

    try:
        async with aiofiles.open(stored_path, "rb") as f:
            content = await f.read()
        text = _parse_document(content, filename)
        chunks_indexed = await indexer.index_text(
            text=text,
            source_id=f"doc-{doc_id}",
            kind="document",
            metadata={"filename": filename},
        )
    except Exception:
        chunks_indexed = 0

    with SessionLocal() as db:
        doc = db.get(Document, doc_id)
        if doc is not None:
            doc.indexed = chunks_indexed > 0
            doc.chunk_count = chunks_indexed
            db.commit()


@router.post("/documents")
async def admin_upload_document(
    background: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    if not file.filename:
        raise HTTPException(status_code=400, detail="Missing filename")

    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Empty file")
    if len(raw) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="File too large (max 15 MB)")

    suffix = Path(file.filename).suffix.lower() or ".bin"
    safe_name = f"{int(datetime.utcnow().timestamp() * 1000)}{suffix}"
    stored = UPLOAD_DIR / safe_name
    async with aiofiles.open(stored, "wb") as f:
        await f.write(raw)

    doc = crud.create_document(db, filename=file.filename, file_type=suffix.lstrip("."))
    db.commit()

    doc_id = doc.id
    file_name = file.filename
    background.add_task(lambda: asyncio.run(_index_uploaded_document(doc_id, stored, file_name)))

    return {
        "id": doc.id,
        "filename": doc.filename,
        "file_type": doc.file_type,
        "indexed": False,
        "chunk_count": 0,
        "queued": True,
    }


@router.delete("/documents/{document_id}")
def admin_delete_document(document_id: int, db: Session = Depends(get_db)) -> dict[str, bool]:
    doc = db.get(Document, document_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Document not found")
    indexer.delete_indexed(source_id=f"doc-{document_id}", kind="document")
    db.delete(doc)
    db.commit()
    return {"ok": True}


# ---------------------------------------------------------------- sources (URLs)


@router.get("/sources")
def admin_list_sources(db: Session = Depends(get_db)) -> list[dict[str, Any]]:
    return [
        {
            "id": s.id,
            "url": s.url,
            "title": s.title,
            "last_indexed": s.last_indexed.isoformat() if s.last_indexed else None,
            "chunk_count": s.chunk_count,
            "status": s.status,
        }
        for s in crud.list_sources(db)
    ]


async def _scrape_and_index_source(source_id: int) -> None:
    from app.db.database import SessionLocal

    with SessionLocal() as db:
        source = db.get(Source, source_id)
        if source is None:
            return
        url = source.url
        source.status = "scraping"
        db.commit()

    try:
        page = await scrape_url(url)
        chunks_indexed = await indexer.index_text(
            text=page.text,
            source_id=f"src-{source_id}",
            kind="source",
            metadata={"url": url, "title": page.title},
        )
        status = "indexed" if chunks_indexed > 0 else "empty"
    except Exception:
        page = None
        chunks_indexed = 0
        status = "error"

    with SessionLocal() as db:
        source = db.get(Source, source_id)
        if source is None:
            return
        source.title = (page.title if page else source.title) or source.title
        source.chunk_count = chunks_indexed
        source.last_indexed = datetime.utcnow()
        source.status = status
        db.commit()


@router.post("/sources")
async def admin_add_source(
    payload: SourceCreate,
    background: BackgroundTasks,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    if not payload.url.startswith(("http://", "https://")):
        raise HTTPException(status_code=400, detail="URL must start with http(s)://")

    existing = next((s for s in crud.list_sources(db) if s.url == payload.url), None)
    if existing is not None:
        source = existing
        source.title = payload.title or source.title
    else:
        source = crud.create_source(db, url=payload.url, title=payload.title)
    source.status = "queued"
    db.commit()

    new_id = source.id
    background.add_task(lambda: asyncio.run(_scrape_and_index_source(new_id)))

    return {
        "id": source.id,
        "url": source.url,
        "title": source.title,
        "status": source.status,
        "chunk_count": source.chunk_count,
    }


@router.post("/sources/{source_id}/reindex")
async def admin_reindex_source(
    source_id: int,
    background: BackgroundTasks,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    src = db.get(Source, source_id)
    if src is None:
        raise HTTPException(status_code=404, detail="Source not found")
    indexer.delete_indexed(source_id=f"src-{source_id}", kind="source")
    src.status = "queued"
    db.commit()
    background.add_task(lambda: asyncio.run(_scrape_and_index_source(source_id)))
    return {"id": source_id, "status": "queued"}


@router.delete("/sources/{source_id}")
def admin_delete_source(source_id: int, db: Session = Depends(get_db)) -> dict[str, bool]:
    src = db.get(Source, source_id)
    if src is None:
        raise HTTPException(status_code=404, detail="Source not found")
    indexer.delete_indexed(source_id=f"src-{source_id}", kind="source")
    db.delete(src)
    db.commit()
    return {"ok": True}


# ---------------------------------------------------------------- analytics


@router.get("/analytics")
def admin_analytics(db: Session = Depends(get_db)) -> dict[str, Any]:
    from sqlalchemy import func, select

    from app.catalogue.models import QueryLog

    total = int(db.execute(select(func.count(QueryLog.id))).scalar_one())
    no_match = int(
        db.execute(
            select(func.count(QueryLog.id)).where(QueryLog.found_match.is_(False))
        ).scalar_one()
    )

    by_role = {
        row[0]: int(row[1])
        for row in db.execute(
            select(QueryLog.role, func.count(QueryLog.id)).group_by(QueryLog.role)
        ).all()
    }

    by_language = {
        row[0] or "?": int(row[1])
        for row in db.execute(
            select(QueryLog.language, func.count(QueryLog.id)).group_by(QueryLog.language)
        ).all()
    }

    return {
        "total_queries": total,
        "no_match_count": no_match,
        "no_match_rate": (no_match / total) if total else 0.0,
        "by_role": by_role,
        "by_language": by_language,
        "top_queries": [
            {"query": q, "count": n} for q, n in crud.top_queries(db, limit=20)
        ],
        "top_no_match": [
            {"query": q, "count": n}
            for q, n in crud.top_queries(db, limit=10, only_no_match=True)
        ],
    }
