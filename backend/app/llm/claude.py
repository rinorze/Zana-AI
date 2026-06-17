"""Async Claude (Anthropic) client used by every ZANA persona.

Two entry points:
- ``stream_complete`` — async generator yielding text tokens (SSE).
- ``complete`` — single-shot string response (used for templates, summaries, JSON).
"""
from __future__ import annotations

import asyncio
from collections.abc import AsyncIterator
from typing import Any

from anthropic import APIStatusError, AsyncAnthropic

from app.config import get_settings

DEFAULT_MAX_TOKENS = 1024
MAX_RETRIES = 2
RETRYABLE_STATUS = {429, 500, 502, 503, 504}


async def _retry_sleep(attempt: int) -> None:
    await asyncio.sleep(0.6 * (2 ** attempt))

_client: AsyncAnthropic | None = None


def _get_client() -> AsyncAnthropic:
    global _client
    if _client is None:
        settings = get_settings()
        if not settings.anthropic_api_key:
            raise RuntimeError(
                "ANTHROPIC_API_KEY is not set; cannot call Claude. "
                "Add it to backend/.env."
            )
        _client = AsyncAnthropic(api_key=settings.anthropic_api_key)
    return _client


def _normalize_messages(messages: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Ensure every message has role + content in the Anthropic schema."""
    normalized: list[dict[str, Any]] = []
    for m in messages:
        role = m.get("role", "user")
        content = m.get("content", "")
        if isinstance(content, list):
            normalized.append({"role": role, "content": content})
        else:
            normalized.append({"role": role, "content": str(content)})
    return normalized


async def stream_complete(
    system: str,
    messages: list[dict[str, Any]],
    *,
    max_tokens: int = DEFAULT_MAX_TOKENS,
    model: str | None = None,
    temperature: float = 0.3,
) -> AsyncIterator[str]:
    """Yield text deltas as Claude streams its response."""
    settings = get_settings()
    client = _get_client()

    async with client.messages.stream(
        model=model or settings.claude_model,
        max_tokens=max_tokens,
        temperature=temperature,
        system=system,
        messages=_normalize_messages(messages),
    ) as stream:
        async for text in stream.text_stream:
            if text:
                yield text


async def complete(
    system: str,
    messages: list[dict[str, Any]],
    *,
    max_tokens: int = DEFAULT_MAX_TOKENS,
    model: str | None = None,
    temperature: float = 0.3,
) -> str:
    """Single-shot completion; concatenates the full response."""
    settings = get_settings()
    client = _get_client()

    last_exc: Exception | None = None
    for attempt in range(MAX_RETRIES + 1):
        try:
            response = await client.messages.create(
                model=model or settings.claude_model,
                max_tokens=max_tokens,
                temperature=temperature,
                system=system,
                messages=_normalize_messages(messages),
            )
            parts: list[str] = []
            for block in response.content:
                text = getattr(block, "text", None)
                if text:
                    parts.append(text)
            return "".join(parts)
        except APIStatusError as exc:
            if exc.status_code in RETRYABLE_STATUS and attempt < MAX_RETRIES:
                last_exc = exc
                await _retry_sleep(attempt)
                continue
            raise
    if last_exc:
        raise last_exc
    return ""
