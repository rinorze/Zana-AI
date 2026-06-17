"""Hybrid search used by the citizen /api/search endpoint.

Combines a cheap keyword scan (SQLite LIKE over service_id / names / category /
description) with a semantic top-3 over the Chroma vector store, and produces a
short chat_starter suggestion to seed the chat UI.
"""
from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from app.catalogue import crud
from app.catalogue.models import Service, ServiceFAQ
from app.rag.retriever import retrieve


def _localized(name_or_desc: dict[str, str], language: str) -> str:
    if not isinstance(name_or_desc, dict):
        return ""
    return name_or_desc.get(language) or name_or_desc.get("sq") or next(iter(name_or_desc.values()), "")


def _service_summary(service: Service, language: str) -> dict[str, Any]:
    return {
        "id": service.id,
        "service_id": service.service_id,
        "category": service.category,
        "name": _localized(service.names_json, language),
        "description": _localized(service.description_json, language),
        "fee": service.fee,
        "duration": service.duration,
    }


def _faq_summary(faq: ServiceFAQ, language: str) -> dict[str, Any]:
    return {
        "service_id": faq.service.service_id if faq.service else "",
        "question": _localized(faq.questions_json, language),
        "answer": _localized(faq.answers_json, language),
    }


def _chat_starter(query: str, services: list[Service], language: str) -> str:
    if not services:
        return query
    name = _localized(services[0].names_json, language) or query
    if language == "en":
        return f"Tell me about {name.lower()}."
    if language == "sr":
        return f"Recite mi nešto o: {name}."
    # Default sq
    return f"Më trego për {name}."


async def smart_search(
    db: Session,
    query: str,
    language: str = "sq",
    top_k_semantic: int = 3,
) -> dict[str, Any]:
    services_kw = crud.search_services_keyword(db, query, limit=10)

    semantic_chunks = []
    try:
        semantic_chunks = await retrieve(query, top_k=top_k_semantic)
    except Exception as exc:  # pragma: no cover — surfaced as part of result
        semantic_chunks = []
        semantic_error = str(exc)
    else:
        semantic_error = ""

    # Pull services referenced by semantic chunks but not already in kw results.
    seen_ids = {s.service_id for s in services_kw}
    for chunk in semantic_chunks:
        sid = chunk.service_id
        if not sid or sid in seen_ids:
            continue
        svc = crud.get_service_by_service_id(db, sid)
        if svc is not None:
            services_kw.append(svc)
            seen_ids.add(sid)

    # Collect FAQs whose question contains the keyword.
    needle = query.lower().strip()
    faqs: list[ServiceFAQ] = []
    if needle:
        for svc in services_kw:
            for faq in svc.faqs:
                q_text = " ".join(str(v).lower() for v in (faq.questions_json or {}).values())
                if needle in q_text:
                    faqs.append(faq)

    return {
        "query": query,
        "language": language,
        "services": [_service_summary(s, language) for s in services_kw[:10]],
        "faqs": [_faq_summary(f, language) for f in faqs[:10]],
        "chat_starter": _chat_starter(query, services_kw, language),
        "semantic_chunks": [
            {
                "id": c.id,
                "text": c.text,
                "service_id": c.service_id,
                "language": c.language,
                "distance": c.distance,
            }
            for c in semantic_chunks
        ],
        "semantic_error": semantic_error,
    }
