"""Index the SQLite catalogue into the Chroma 'zana' vector store.

For each service we build chunks per (type, language) — description, steps,
FAQs, response templates — and upsert with stable IDs so re-runs replace
content rather than duplicating it.

Run from the backend/ directory:
    python -m scripts.index_catalogue
"""
from __future__ import annotations

import asyncio
import sys
from typing import Any

from app.catalogue.models import Service, ServiceFAQ, ServiceStep, ResponseTemplate
from app.db.database import SessionLocal, init_db
from app.rag import vectorstore
from app.rag.chunker import chunk_text
from app.rag.embedder import embed_texts

LANGUAGES = ("sq", "en", "sr")


def _first_source(service: Service) -> str:
    urls = service.source_urls_json or []
    return urls[0] if urls else ""


def _build_service_chunks(service: Service) -> list[tuple[str, str, dict[str, Any]]]:
    """Return [(chunk_id, text, metadata), ...] for one service."""
    source = _first_source(service)
    base_meta = {
        "service_id": service.service_id,
        "category": service.category,
        "source_url": source,
    }
    out: list[tuple[str, str, dict[str, Any]]] = []

    for lang in LANGUAGES:
        name = (service.names_json or {}).get(lang, "")
        description = (service.description_json or {}).get(lang, "")
        if not description and not name:
            continue
        text = f"{name}\n\n{description}".strip()
        for i, chunk in enumerate(chunk_text(text)):
            out.append(
                (
                    f"{service.service_id}::description::{lang}::{i}",
                    chunk,
                    {**base_meta, "type": "description", "language": lang},
                )
            )

    for step in service.steps:
        for lang in LANGUAGES:
            title = (step.titles_json or {}).get(lang, "")
            desc = (step.descriptions_json or {}).get(lang, "")
            if not title and not desc:
                continue
            items = ", ".join(step.required_items_json or [])
            body = f"Step {step.order}: {title}\n{desc}".strip()
            if items:
                body += f"\nRequired: {items}"
            for i, chunk in enumerate(chunk_text(body)):
                out.append(
                    (
                        f"{service.service_id}::step::{step.order}::{lang}::{i}",
                        chunk,
                        {
                            **base_meta,
                            "type": "step",
                            "language": lang,
                            "step_order": step.order,
                        },
                    )
                )

    for idx, faq in enumerate(service.faqs):
        for lang in LANGUAGES:
            q = (faq.questions_json or {}).get(lang, "")
            a = (faq.answers_json or {}).get(lang, "")
            if not q and not a:
                continue
            body = f"Q: {q}\nA: {a}".strip()
            for i, chunk in enumerate(chunk_text(body)):
                out.append(
                    (
                        f"{service.service_id}::faq::{idx}::{lang}::{i}",
                        chunk,
                        {**base_meta, "type": "faq", "language": lang},
                    )
                )

    for tpl in service.response_templates:
        for lang in LANGUAGES:
            template_text = (tpl.templates_json or {}).get(lang, "")
            if not template_text:
                continue
            body = f"Scenario: {tpl.scenario}\n{template_text}"
            for i, chunk in enumerate(chunk_text(body)):
                out.append(
                    (
                        f"{service.service_id}::template::{tpl.scenario}::{lang}::{i}",
                        chunk,
                        {
                            **base_meta,
                            "type": "template",
                            "language": lang,
                            "scenario": tpl.scenario,
                        },
                    )
                )

    return out


async def index_all() -> int:
    init_db()
    with SessionLocal() as db:
        from app.catalogue.crud import list_services

        services = list_services(db, limit=1000)
        if not services:
            print("No services in DB — run scripts.seed first.", file=sys.stderr)
            return 1

        ids: list[str] = []
        documents: list[str] = []
        metadatas: list[dict[str, Any]] = []
        for svc in services:
            for chunk_id, text, meta in _build_service_chunks(svc):
                ids.append(chunk_id)
                documents.append(text)
                metadatas.append(meta)

        if not ids:
            print("No chunks produced.", file=sys.stderr)
            return 1

        print(f"Embedding {len(ids)} chunks for {len(services)} services...")
        embeddings = await embed_texts(documents)
        print("Embedded. Upserting into Chroma...")
        vectorstore.add(ids=ids, embeddings=embeddings, metadatas=metadatas, documents=documents)

        total = vectorstore.count()
        print(f"Chroma 'zana' collection now contains {total} documents.")
        return 0


def main() -> int:
    return asyncio.run(index_all())


if __name__ == "__main__":
    raise SystemExit(main())
