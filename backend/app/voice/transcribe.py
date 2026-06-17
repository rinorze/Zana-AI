"""Voice transcription via OpenAI Whisper.

Used by the citizen voice input. Frontend POSTs an audio blob (webm/ogg/wav);
backend forwards it to OpenAI's transcription endpoint and returns the text.

If the language hint isn't supported by the current Whisper model (Albanian/sq
intermittently raises 'unsupported_language'), we retry once without the hint
so Whisper falls back to auto-detection — robust against the supported-language
list shifting between model revisions.
"""
from __future__ import annotations

from openai import AsyncOpenAI, BadRequestError

from app.config import get_settings

WHISPER_MODEL = "whisper-1"

_client: AsyncOpenAI | None = None


def _get_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        settings = get_settings()
        if not settings.openai_api_key:
            raise RuntimeError(
                "OPENAI_API_KEY is not set; cannot transcribe audio."
            )
        _client = AsyncOpenAI(api_key=settings.openai_api_key)
    return _client


async def transcribe_audio(
    audio_bytes: bytes,
    filename: str = "audio.webm",
    language: str | None = None,
) -> str:
    """Return the transcribed text for an audio blob."""
    if not audio_bytes:
        return ""

    client = _get_client()

    async def _call(use_language: str | None) -> str:
        kwargs: dict = {"model": WHISPER_MODEL, "file": (filename, audio_bytes)}
        if use_language:
            kwargs["language"] = use_language
        response = await client.audio.transcriptions.create(**kwargs)
        return (response.text or "").strip()

    try:
        return await _call(language)
    except BadRequestError as exc:
        # Whisper returns unsupported_language for some hints (e.g. 'sq' under
        # whisper-1). Retry once with auto-detect.
        detail = str(exc)
        if language and "unsupported_language" in detail:
            return await _call(None)
        raise
