from __future__ import annotations

from collections.abc import Iterable
from typing import Any

from sqlalchemy import String, func, select
from sqlalchemy.orm import Session, selectinload

from app.catalogue.models import (
    Document,
    QueryLog,
    ResponseTemplate,
    Service,
    ServiceFAQ,
    ServiceStep,
    Source,
)


def get_service_by_service_id(db: Session, service_id: str) -> Service | None:
    stmt = (
        select(Service)
        .where(Service.service_id == service_id)
        .options(
            selectinload(Service.steps),
            selectinload(Service.faqs),
            selectinload(Service.response_templates),
        )
    )
    return db.execute(stmt).scalar_one_or_none()


def get_service(db: Session, pk: int) -> Service | None:
    return db.get(Service, pk)


def list_services(
    db: Session,
    category: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> list[Service]:
    stmt = (
        select(Service)
        .options(
            selectinload(Service.steps),
            selectinload(Service.faqs),
            selectinload(Service.response_templates),
        )
        .order_by(Service.category, Service.service_id)
        .limit(limit)
        .offset(offset)
    )
    if category:
        stmt = stmt.where(Service.category == category)
    return list(db.execute(stmt).scalars().all())


def count_services(db: Session, category: str | None = None) -> int:
    stmt = select(func.count(Service.id))
    if category:
        stmt = stmt.where(Service.category == category)
    return int(db.execute(stmt).scalar_one())


def upsert_service(db: Session, payload: dict[str, Any]) -> Service:
    """Create-or-update a service plus its nested steps, FAQs, and response templates.

    Idempotent on service_id: re-running with the same input replaces nested rows
    rather than duplicating them.
    """
    service_id = payload["service_id"]
    existing = get_service_by_service_id(db, service_id)

    service_fields = dict(
        service_id=service_id,
        category=payload.get("category", ""),
        names_json=payload.get("names", {}),
        description_json=payload.get("description", {}),
        fee=payload.get("fee", ""),
        duration=payload.get("duration", ""),
        office=payload.get("office", ""),
        office_locations_json=payload.get("office_locations", []),
        required_documents_json=payload.get("required_documents", []),
        source_urls_json=payload.get("source_urls", []),
        last_verified=payload.get("last_verified", ""),
    )

    if existing is None:
        service = Service(**service_fields)
        db.add(service)
        db.flush()
    else:
        service = existing
        for key, value in service_fields.items():
            setattr(service, key, value)
        # Clear nested rows; cascade will delete them on flush.
        service.steps.clear()
        service.faqs.clear()
        service.response_templates.clear()
        db.flush()

    for step in payload.get("steps", []):
        service.steps.append(
            ServiceStep(
                order=step.get("order", 0),
                titles_json=step.get("titles", {}),
                descriptions_json=step.get("descriptions", {}),
                required_items_json=step.get("required_items", []),
            )
        )

    for faq in payload.get("faqs", []):
        service.faqs.append(
            ServiceFAQ(
                questions_json=faq.get("questions", {}),
                answers_json=faq.get("answers", {}),
            )
        )

    for tpl in payload.get("response_templates", []):
        service.response_templates.append(
            ResponseTemplate(
                scenario=tpl.get("scenario", ""),
                templates_json=tpl.get("templates", {}),
                placeholders_json=tpl.get("placeholders", []),
            )
        )

    db.flush()
    return service


def delete_service(db: Session, pk: int) -> bool:
    service = db.get(Service, pk)
    if service is None:
        return False
    db.delete(service)
    return True


def search_services_keyword(db: Session, query: str, limit: int = 10) -> list[Service]:
    """Cheap keyword fallback used alongside semantic search.

    Matches against service_id, category, and the raw JSON of names/description.
    """
    pattern = f"%{query.lower()}%"
    stmt = (
        select(Service)
        .options(
            selectinload(Service.steps),
            selectinload(Service.faqs),
        )
        .where(
            func.lower(Service.service_id).like(pattern)
            | func.lower(Service.category).like(pattern)
            | func.lower(func.cast(Service.names_json, String)).like(pattern)
            | func.lower(func.cast(Service.description_json, String)).like(pattern)
        )
        .limit(limit)
    )
    return list(db.execute(stmt).scalars().all())


# Response templates ----------------------------------------------------------


def list_templates(db: Session, service_id: int | None = None) -> list[ResponseTemplate]:
    stmt = select(ResponseTemplate).order_by(ResponseTemplate.scenario)
    if service_id is not None:
        stmt = stmt.where(ResponseTemplate.service_id == service_id)
    return list(db.execute(stmt).scalars().all())


def get_template(db: Session, pk: int) -> ResponseTemplate | None:
    return db.get(ResponseTemplate, pk)


# Documents -------------------------------------------------------------------


def create_document(db: Session, filename: str, file_type: str) -> Document:
    doc = Document(filename=filename, file_type=file_type)
    db.add(doc)
    db.flush()
    return doc


def list_documents(db: Session) -> list[Document]:
    return list(db.execute(select(Document).order_by(Document.uploaded_at.desc())).scalars().all())


def delete_document(db: Session, pk: int) -> bool:
    doc = db.get(Document, pk)
    if doc is None:
        return False
    db.delete(doc)
    return True


# Sources ---------------------------------------------------------------------


def create_source(db: Session, url: str, title: str = "") -> Source:
    src = Source(url=url, title=title)
    db.add(src)
    db.flush()
    return src


def list_sources(db: Session) -> list[Source]:
    return list(db.execute(select(Source).order_by(Source.id.desc())).scalars().all())


def get_source(db: Session, pk: int) -> Source | None:
    return db.get(Source, pk)


def delete_source(db: Session, pk: int) -> bool:
    src = db.get(Source, pk)
    if src is None:
        return False
    db.delete(src)
    return True


# Query logs ------------------------------------------------------------------


def log_query(
    db: Session,
    role: str,
    query: str,
    answer: str = "",
    found_match: bool = False,
    language: str = "",
) -> QueryLog:
    entry = QueryLog(
        role=role,
        query=query,
        answer=answer,
        found_match=found_match,
        language=language,
    )
    db.add(entry)
    db.flush()
    return entry


def update_query_answer(db: Session, log_id: int, answer: str) -> bool:
    entry = db.get(QueryLog, log_id)
    if entry is None:
        return False
    entry.answer = answer
    db.flush()
    return True


def top_queries(db: Session, limit: int = 20, only_no_match: bool = False) -> list[tuple[str, int]]:
    stmt = (
        select(QueryLog.query, func.count(QueryLog.id).label("n"))
        .group_by(QueryLog.query)
        .order_by(func.count(QueryLog.id).desc())
        .limit(limit)
    )
    if only_no_match:
        stmt = stmt.where(QueryLog.found_match.is_(False))
    return [(row[0], int(row[1])) for row in db.execute(stmt).all()]


def serialize_service(service: Service) -> dict[str, Any]:
    """Return a JSON-safe dict for API responses or reindexing."""
    return {
        "id": service.id,
        "service_id": service.service_id,
        "category": service.category,
        "names": service.names_json,
        "description": service.description_json,
        "fee": service.fee,
        "duration": service.duration,
        "office": service.office,
        "office_locations": service.office_locations_json,
        "required_documents": service.required_documents_json,
        "source_urls": service.source_urls_json,
        "last_verified": service.last_verified,
        "steps": [
            {
                "id": s.id,
                "order": s.order,
                "titles": s.titles_json,
                "descriptions": s.descriptions_json,
                "required_items": s.required_items_json,
            }
            for s in sorted(service.steps, key=lambda s: s.order)
        ],
        "faqs": [
            {"id": f.id, "questions": f.questions_json, "answers": f.answers_json}
            for f in service.faqs
        ],
        "response_templates": [
            {
                "id": t.id,
                "scenario": t.scenario,
                "templates": t.templates_json,
                "placeholders": t.placeholders_json,
            }
            for t in service.response_templates
        ],
    }


def serialize_services(services: Iterable[Service]) -> list[dict[str, Any]]:
    return [serialize_service(s) for s in services]
