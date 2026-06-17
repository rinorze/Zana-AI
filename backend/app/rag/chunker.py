"""Word-based text chunker used before embedding.

Splits on whitespace and groups words into fixed-size windows with overlap.
Good enough for the catalogue's short descriptions/FAQs; the dedicated tiktoken
splitter can be added later if longer documents (PDFs, scraped pages) need it.
"""
from __future__ import annotations

import re

_WHITESPACE_RE = re.compile(r"\s+")


def _normalize(text: str) -> str:
    return _WHITESPACE_RE.sub(" ", text).strip()


def chunk_text(text: str, chunk_size: int = 700, overlap: int = 100) -> list[str]:
    if chunk_size <= 0:
        raise ValueError("chunk_size must be positive")
    if overlap < 0 or overlap >= chunk_size:
        raise ValueError("overlap must be in [0, chunk_size)")

    cleaned = _normalize(text)
    if not cleaned:
        return []

    words = cleaned.split(" ")
    if len(words) <= chunk_size:
        return [cleaned]

    step = chunk_size - overlap
    chunks: list[str] = []
    for start in range(0, len(words), step):
        window = words[start : start + chunk_size]
        if not window:
            break
        chunks.append(" ".join(window))
        if start + chunk_size >= len(words):
            break
    return chunks
