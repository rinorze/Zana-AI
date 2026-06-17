"""Async LLM client used by every ZANA persona.

Two entry points:
- ``stream_complete`` — async generator yielding text tokens (SSE).
- ``complete`` — single-shot string response (used for templates, summaries, JSON).
"""
from __future__ import annotations

import asyncio
from collections.abc import AsyncIterator
from typing import Any

from anthropic import APIStatusError, AsyncAnthropic
from openai import APIStatusError as OpenAIAPIStatusError
from openai import AsyncOpenAI

from app.config import get_settings

DEFAULT_MAX_TOKENS = 1024
MAX_RETRIES = 2
RETRYABLE_STATUS = {429, 500, 502, 503, 504}
GEMINI_OPENAI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai/"
GROQ_OPENAI_BASE_URL = "https://api.groq.com/openai/v1"


async def _retry_sleep(attempt: int) -> None:
    await asyncio.sleep(0.6 * (2 ** attempt))

_anthropic_client: AsyncAnthropic | None = None
_gemini_client: AsyncOpenAI | None = None
_groq_client: AsyncOpenAI | None = None


def _get_anthropic_client() -> AsyncAnthropic:
    global _anthropic_client
    if _anthropic_client is None:
        settings = get_settings()
        if not settings.anthropic_api_key:
            raise RuntimeError(
                "ANTHROPIC_API_KEY is not set; cannot call Claude. "
                "Add it to backend/.env."
            )
        _anthropic_client = AsyncAnthropic(api_key=settings.anthropic_api_key)
    return _anthropic_client


def _get_gemini_client() -> AsyncOpenAI:
    global _gemini_client
    if _gemini_client is None:
        settings = get_settings()
        if not settings.gemini_api_key:
            raise RuntimeError("GEMINI_API_KEY is not set.")
        _gemini_client = AsyncOpenAI(
            api_key=settings.gemini_api_key,
            base_url=GEMINI_OPENAI_BASE_URL,
        )
    return _gemini_client


def _get_groq_client() -> AsyncOpenAI:
    global _groq_client
    if _groq_client is None:
        settings = get_settings()
        if not settings.groq_api_key:
            raise RuntimeError("GROQ_API_KEY is not set.")
        _groq_client = AsyncOpenAI(
            api_key=settings.groq_api_key,
            base_url=GROQ_OPENAI_BASE_URL,
        )
    return _groq_client


def _provider_order() -> list[str]:
    settings = get_settings()
    raw = [p.strip().lower() for p in settings.llm_provider_chain.split(",")]
    return [p for p in raw if p in {"anthropic", "gemini", "groq"}]


def _available_providers() -> list[str]:
    settings = get_settings()
    enabled: list[str] = []
    for provider in _provider_order():
        if provider == "anthropic" and settings.anthropic_api_key:
            enabled.append(provider)
        elif provider == "gemini" and settings.gemini_api_key:
            enabled.append(provider)
        elif provider == "groq" and settings.groq_api_key:
            enabled.append(provider)
    return enabled


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


def _normalize_openai_messages(
    system: str,
    messages: list[dict[str, Any]],
) -> list[dict[str, str]]:
    normalized: list[dict[str, str]] = []
    if system:
        normalized.append({"role": "system", "content": system})
    for message in messages:
        role = str(message.get("role", "user"))
        content = message.get("content", "")
        normalized.append({"role": role, "content": str(content)})
    return normalized


async def _stream_anthropic(
    system: str,
    messages: list[dict[str, Any]],
    *,
    max_tokens: int,
    model: str | None,
    temperature: float,
) -> AsyncIterator[str]:
    settings = get_settings()
    client = _get_anthropic_client()

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


async def _stream_openai_compatible(
    provider: str,
    system: str,
    messages: list[dict[str, Any]],
    *,
    max_tokens: int,
    model: str | None,
    temperature: float,
) -> AsyncIterator[str]:
    settings = get_settings()
    if provider == "gemini":
        client = _get_gemini_client()
        resolved_model = model or settings.gemini_model
    elif provider == "groq":
        client = _get_groq_client()
        resolved_model = model or settings.groq_model
    else:
        raise ValueError(f"Unsupported OpenAI-compatible provider: {provider}")

    stream = await client.chat.completions.create(
        model=resolved_model,
        messages=_normalize_openai_messages(system, messages),
        max_tokens=max_tokens,
        temperature=temperature,
        stream=True,
    )
    async for chunk in stream:
        token = chunk.choices[0].delta.content if chunk.choices else None
        if token:
            yield token


async def _complete_anthropic(
    system: str,
    messages: list[dict[str, Any]],
    *,
    max_tokens: int,
    model: str | None,
    temperature: float,
) -> str:
    settings = get_settings()
    client = _get_anthropic_client()

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


async def _complete_openai_compatible(
    provider: str,
    system: str,
    messages: list[dict[str, Any]],
    *,
    max_tokens: int,
    model: str | None,
    temperature: float,
) -> str:
    settings = get_settings()
    if provider == "gemini":
        client = _get_gemini_client()
        resolved_model = model or settings.gemini_model
    elif provider == "groq":
        client = _get_groq_client()
        resolved_model = model or settings.groq_model
    else:
        raise ValueError(f"Unsupported OpenAI-compatible provider: {provider}")

    response = await client.chat.completions.create(
        model=resolved_model,
        messages=_normalize_openai_messages(system, messages),
        max_tokens=max_tokens,
        temperature=temperature,
    )
    return response.choices[0].message.content or ""


async def stream_complete(
    system: str,
    messages: list[dict[str, Any]],
    *,
    max_tokens: int = DEFAULT_MAX_TOKENS,
    model: str | None = None,
    temperature: float = 0.3,
) -> AsyncIterator[str]:
    """Yield text deltas, falling back across configured providers."""
    providers = _available_providers()
    if not providers:
        raise RuntimeError(
            "No LLM provider API key is set. Configure ANTHROPIC_API_KEY, "
            "GEMINI_API_KEY, or GROQ_API_KEY."
        )

    last_exc: Exception | None = None
    for provider in providers:
        emitted = False
        try:
            if provider == "anthropic":
                stream = _stream_anthropic(
                    system,
                    messages,
                    max_tokens=max_tokens,
                    model=model,
                    temperature=temperature,
                )
            else:
                stream = _stream_openai_compatible(
                    provider,
                    system,
                    messages,
                    max_tokens=max_tokens,
                    model=model,
                    temperature=temperature,
                )
            async for token in stream:
                emitted = True
                yield token
            return
        except Exception as exc:
            if emitted:
                raise
            last_exc = exc
            continue
    if last_exc:
        raise last_exc


async def complete(
    system: str,
    messages: list[dict[str, Any]],
    *,
    max_tokens: int = DEFAULT_MAX_TOKENS,
    model: str | None = None,
    temperature: float = 0.3,
) -> str:
    """Single-shot completion, falling back across configured providers."""
    providers = _available_providers()
    if not providers:
        raise RuntimeError(
            "No LLM provider API key is set. Configure ANTHROPIC_API_KEY, "
            "GEMINI_API_KEY, or GROQ_API_KEY."
        )

    last_exc: Exception | None = None
    for provider in providers:
        for attempt in range(MAX_RETRIES + 1):
            try:
                if provider == "anthropic":
                    return await _complete_anthropic(
                        system,
                        messages,
                        max_tokens=max_tokens,
                        model=model,
                        temperature=temperature,
                    )
                return await _complete_openai_compatible(
                    provider,
                    system,
                    messages,
                    max_tokens=max_tokens,
                    model=model,
                    temperature=temperature,
                )
            except (APIStatusError, OpenAIAPIStatusError) as exc:
                if exc.status_code in RETRYABLE_STATUS and attempt < MAX_RETRIES:
                    last_exc = exc
                    await _retry_sleep(attempt)
                    continue
                last_exc = exc
                break
            except Exception as exc:
                last_exc = exc
                break
    if last_exc:
        raise last_exc
    return ""
