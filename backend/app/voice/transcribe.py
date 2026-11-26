"""Voice transcription via Whisper (OpenAI, or any OpenAI-compatible host such as Groq).

Used by the citizen voice input. Frontend POSTs an audio blob (webm/ogg/wav);
backend forwards it to OpenAI's transcription endpoint and returns the text.

The frontend sends the page language as a hint. Whisper's own detection is
unreliable for Albanian, so the hint matters (see VOCABULARY_PROMPTS).

If the language hint isn't supported by the current Whisper model (Albanian/sq
intermittently raises 'unsupported_language'), we retry once without the hint
so Whisper falls back to auto-detection — robust against the supported-language
list shifting between model revisions.
"""
from __future__ import annotations

from openai import AsyncOpenAI, BadRequestError

from app.config import get_settings

_client: AsyncOpenAI | None = None

# A short text in the expected language, with the service names people ask
# about. Whisper uses it as context: it keeps the output in that language and
# spells the terms right ("ARBK", "letërnjoftimin"). Measured on Albanian clips:
# without a language hint Whisper heard 2 of 3 as Romanian or Catalan.
VOCABULARY_PROMPTS = {
    "sq": "Pyetje për shërbimet publike në Kosovë: pasaporta, letërnjoftimi, "
    "certifikata e lindjes, patentë shoferi, regjistrimi i biznesit në ARBK, eKosova.",
    "sr": "Pitanja o javnim uslugama na Kosovu: pasoš, lična karta, izvod iz "
    "matične knjige rođenih, vozačka dozvola, registracija biznisa u ARBK, eKosova.",
    "en": "Questions about public services in Kosovo: passport, ID card, birth "
    "certificate, driving licence, business registration at ARBK, eKosova.",
}


def _get_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        settings = get_settings()
        api_key = settings.transcribe_api_key or settings.openai_api_key
        if not api_key:
            raise RuntimeError(
                "No transcription API key: set OPENAI_API_KEY, or TRANSCRIBE_API_KEY "
                "with TRANSCRIBE_BASE_URL."
            )
        _client = AsyncOpenAI(api_key=api_key, base_url=settings.transcribe_base_url or None)
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
        kwargs: dict = {"model": get_settings().transcribe_model, "file": (filename, audio_bytes)}
        if use_language:
            kwargs["language"] = use_language
        if language in VOCABULARY_PROMPTS:
            kwargs["prompt"] = VOCABULARY_PROMPTS[language]
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
