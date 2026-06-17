"""Smoke tests for the RAG pipeline.

Unit tests run with no external dependencies. The live retrieval test is
skipped automatically when OPENAI_API_KEY is not set so contributors can clone
the repo and run pytest without paying for an OpenAI key.
"""
from __future__ import annotations

import os

import pytest

from app.rag.chunker import chunk_text


def test_chunk_text_short_returns_single_chunk():
    text = "Pasaporta është dokument udhëtimi."
    assert chunk_text(text) == [text]


def test_chunk_text_long_splits_with_overlap():
    words = [f"w{i}" for i in range(1500)]
    text = " ".join(words)

    chunks = chunk_text(text, chunk_size=500, overlap=50)

    assert len(chunks) > 1
    for chunk in chunks:
        assert len(chunk.split(" ")) <= 500
    # Adjacent chunks must share their overlap window.
    first_tail = chunks[0].split(" ")[-50:]
    second_head = chunks[1].split(" ")[:50]
    assert first_tail == second_head


def test_chunk_text_rejects_bad_overlap():
    with pytest.raises(ValueError):
        chunk_text("hello world", chunk_size=10, overlap=10)


@pytest.mark.asyncio
@pytest.mark.skipif(
    not os.environ.get("OPENAI_API_KEY"),
    reason="OPENAI_API_KEY not set; live retrieval test skipped.",
)
async def test_retrieve_finds_pasaporta():
    """End-to-end check: the indexed catalogue should be searchable.

    Assumes scripts.seed and scripts.index_catalogue have already been run.
    """
    from app.rag.retriever import retrieve

    chunks = await retrieve("Sa kushton pasaporta?", top_k=5)

    assert chunks, "Retriever returned no chunks; did you run scripts.index_catalogue?"
    assert any(c.service_id == "pasaporta" for c in chunks), (
        f"Expected pasaporta in top-5; got service_ids={[c.service_id for c in chunks]}"
    )
