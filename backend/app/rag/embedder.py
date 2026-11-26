"""Text embedding wrapper for any OpenAI-compatible embeddings API.

Batches up to BATCH_SIZE inputs per request. Uses OpenAI (OPENAI_API_KEY) by
default; set EMBEDDING_BASE_URL + EMBEDDING_API_KEY to use another provider
with the same API shape, such as Gemini's OpenAI-compatible endpoint.
"""
from __future__ import annotations

import asyncio
import logging
import re

from openai import AsyncOpenAI, RateLimitError

from app.config import get_settings

BATCH_SIZE = 100
MAX_RATE_LIMIT_RETRIES = 6
logger = logging.getLogger("zana.embedder")

_client: AsyncOpenAI | None = None


def _get_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        settings = get_settings()
        api_key = settings.embedding_api_key or settings.openai_api_key
        if not api_key:
            raise RuntimeError(
                "No embedding API key: set OPENAI_API_KEY, or EMBEDDING_API_KEY "
                "with EMBEDDING_BASE_URL. Add it to backend/.env."
            )
        _client = AsyncOpenAI(api_key=api_key, base_url=settings.embedding_base_url or None)
    return _client


def _retry_delay(exc: RateLimitError) -> float:
    """Seconds to wait before retrying, from the provider's hint if it gives one."""
    match = re.search(r"retry in ([0-9.]+)s", str(exc))
    return float(match.group(1)) + 1 if match else 60.0


async def _create_with_retry(client: AsyncOpenAI, model: str, batch: list[str]):
    # Free tiers limit requests per minute (Gemini counts every text in a batch
    # as one request), so building the whole index can hit the limit. Wait for
    # the window to reset instead of failing.
    for attempt in range(MAX_RATE_LIMIT_RETRIES + 1):
        try:
            return await client.embeddings.create(model=model, input=batch)
        except RateLimitError as exc:
            if attempt == MAX_RATE_LIMIT_RETRIES:
                raise
            delay = _retry_delay(exc)
            logger.warning("Embedding rate limit hit; retrying in %.0fs", delay)
            await asyncio.sleep(delay)
    raise AssertionError("unreachable")


async def embed_texts(texts: list[str]) -> list[list[float]]:
    if not texts:
        return []

    settings = get_settings()
    client = _get_client()

    vectors: list[list[float]] = []
    for start in range(0, len(texts), BATCH_SIZE):
        batch = texts[start : start + BATCH_SIZE]
        response = await _create_with_retry(client, settings.embedding_model, batch)
        # The API returns vectors in input order.
        vectors.extend(item.embedding for item in response.data)
    return vectors


async def embed_text(text: str) -> list[float]:
    result = await embed_texts([text])
    return result[0]
