"""Shared indexing helpers for the admin ingestion pipelines.

Both PDF/DOCX uploads and URL sources funnel through this module so chunking,
embedding, and Chroma upserts stay consistent.
"""
from __future__ import annotations

from app.llm.language import detect_language
from app.rag import vectorstore
from app.rag.chunker import chunk_text
from app.rag.embedder import embed_texts


async def index_text(
    *,
    text: str,
    source_id: str,
    kind: str,
    metadata: dict | None = None,
) -> int:
    """Chunk, embed, and upsert ``text`` into the Chroma collection.

    Returns the number of chunks indexed.
    """
    if not text or not text.strip():
        return 0

    chunks = chunk_text(text)
    if not chunks:
        return 0

    language = detect_language(text[:2000])
    meta = {
        "source_id": source_id,
        "type": kind,
        "language": language,
        **(metadata or {}),
    }

    ids = [f"{kind}::{source_id}::{i}" for i in range(len(chunks))]
    metadatas = [meta for _ in chunks]
    embeddings = await embed_texts(chunks)
    vectorstore.add(ids=ids, embeddings=embeddings, metadatas=metadatas, documents=chunks)
    return len(chunks)


def delete_indexed(*, source_id: str, kind: str) -> None:
    """Drop chunks for a given document/source from the vector store."""
    vectorstore.delete(where={"$and": [{"source_id": source_id}, {"type": kind}]})
