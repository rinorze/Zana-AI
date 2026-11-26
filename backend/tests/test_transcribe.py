"""Whisper gets the page language and a vocabulary prompt in that language."""
import asyncio

from app.voice import transcribe


class _FakeTranscriptions:
    def __init__(self):
        self.calls = []

    async def create(self, **kwargs):
        self.calls.append(kwargs)
        return type("R", (), {"text": " Sa kushton pasaporta? "})()


class _FakeClient:
    def __init__(self):
        self.audio = type("A", (), {"transcriptions": _FakeTranscriptions()})()


def test_albanian_hint_and_prompt_are_sent(monkeypatch):
    client = _FakeClient()
    monkeypatch.setattr(transcribe, "_get_client", lambda: client)
    text = asyncio.run(transcribe.transcribe_audio(b"audio", language="sq"))
    call = client.audio.transcriptions.calls[0]
    assert text == "Sa kushton pasaporta?"
    assert call["language"] == "sq"
    assert "letërnjoftimi" in call["prompt"]


def test_no_hint_means_no_prompt(monkeypatch):
    client = _FakeClient()
    monkeypatch.setattr(transcribe, "_get_client", lambda: client)
    asyncio.run(transcribe.transcribe_audio(b"audio"))
    call = client.audio.transcriptions.calls[0]
    assert "language" not in call and "prompt" not in call
