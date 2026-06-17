"""OpenAI text embedding wrapper.

Batches up to BATCH_SIZE inputs per request. Configured by EMBEDDING_MODEL +
OPENAI_API_KEY in settings.
"""
from __future__ import annotations

from openai import AsyncOpenAI

from app.config import get_settings

BATCH_SIZE = 100

_client: AsyncOpenAI | None = None


def _get_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        settings = get_settings()
        if not settings.openai_api_key:
            raise RuntimeError(
                "OPENAI_API_KEY is not set; cannot embed text. "
                "Add it to backend/.env."
            )
        _client = AsyncOpenAI(api_key=settings.openai_api_key)
    return _client


async def embed_texts(texts: list[str]) -> list[list[float]]:
    if not texts:
        return []

    settings = get_settings()
    client = _get_client()

    vectors: list[list[float]] = []
    for start in range(0, len(texts), BATCH_SIZE):
        batch = texts[start : start + BATCH_SIZE]
        response = await client.embeddings.create(
            model=settings.embedding_model,
            input=batch,
        )
        # OpenAI guarantees order matches the input.
        vectors.extend(item.embedding for item in response.data)
    return vectors


async def embed_text(text: str) -> list[float]:
    result = await embed_texts([text])
    return result[0]
