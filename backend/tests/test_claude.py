"""Smoke tests for the Claude wrapper.

Unit tests run with no external dependencies. The live tests skip automatically
when ANTHROPIC_API_KEY is missing.
"""
from __future__ import annotations

import os

import pytest

from app.llm.prompts import (
    build_agent_system,
    build_citizen_system,
    build_summary_prompt,
    build_template_prompt,
)


def test_citizen_prompt_includes_context_and_rules():
    prompt = build_citizen_system("FAKT 1: Pasaporta kushton 25 EUR.")
    assert "FAKT 1" in prompt
    assert "shqip / anglisht / serbisht" in prompt


def test_citizen_simple_mode_appends_addition():
    base = build_citizen_system("ctx")
    extended = build_citizen_system("ctx", simple_mode=True)
    assert "SIMPLE MODE" in extended
    assert len(extended) > len(base)


def test_agent_prompt_has_json_schema_hint():
    prompt = build_agent_system("ctx")
    assert "suggestions" in prompt
    assert "confidence" in prompt


def test_template_prompt_substitutes_template_and_vars():
    prompt = build_template_prompt("Hello {name}", '{"name": "Arben"}')
    assert "Hello {name}" in prompt
    assert "Arben" in prompt


def test_summary_prompt_substitutes_fields():
    prompt = build_summary_prompt("pasaporta", "kostua?", "S1", "manual note")
    assert "pasaporta" in prompt
    assert "manual note" in prompt


@pytest.mark.asyncio
@pytest.mark.skipif(
    not os.environ.get("ANTHROPIC_API_KEY"),
    reason="ANTHROPIC_API_KEY not set; live Claude test skipped.",
)
async def test_claude_responds_in_albanian():
    from app.llm import claude

    chunks: list[str] = []
    async for token in claude.stream_complete(
        system=build_citizen_system("FAKT 1: Pasaporta kushton 25 EUR."),
        messages=[{"role": "user", "content": "Sa kushton pasaporta?"}],
        max_tokens=128,
    ):
        chunks.append(token)

    answer = "".join(chunks).lower()
    assert answer, "Claude returned empty stream"
    # Albanian keyword sanity check — model should mirror input language.
    assert any(token in answer for token in ("pasaport", "tarif", "25"))
