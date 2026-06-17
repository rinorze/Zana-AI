"""Agent co-pilot smoke tests.

Covers JWT login + auth gating, JSON-block extraction from Claude output, and
the summary/template endpoints with the Claude client stubbed.
"""
from __future__ import annotations

import json

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.routers import agent as agent_module


@pytest.fixture()
def client() -> TestClient:
    return TestClient(app)


def _login(client: TestClient, role: str) -> str:
    from app.config import get_settings

    s = get_settings()
    username = s.agent_username if role == "agent" else s.admin_username
    password = s.agent_password if role == "agent" else s.admin_password
    response = client.post("/api/auth/login", json={"username": username, "password": password})
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["role"] == role
    return body["access_token"]


def test_login_rejects_bad_credentials(client: TestClient):
    response = client.post("/api/auth/login", json={"username": "no", "password": "no"})
    assert response.status_code == 401


def test_login_returns_jwt_for_agent(client: TestClient):
    token = _login(client, "agent")
    assert token.count(".") == 2  # header.payload.signature


def test_extract_json_block_handles_prose_wrapping():
    raw = "Ja sugjerimet:\n{\n  \"suggestions\": [{\"text\": \"hi\", \"confidence\": 0.9}]\n}\nFundi."
    parsed = agent_module._extract_json_block(raw)
    assert parsed["suggestions"][0]["text"] == "hi"


def test_extract_json_block_returns_empty_on_garbage():
    parsed = agent_module._extract_json_block("totally not json")
    assert parsed["suggestions"] == []


def test_agent_template_personalize_requires_auth(client: TestClient):
    response = client.post(
        "/api/agent/template/personalize",
        json={"template_text": "Hi {name}", "variables": {"name": "A"}},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_agent_summary_uses_claude(client: TestClient, monkeypatch):
    async def fake_complete(system, messages, max_tokens=512, temperature=0.3, model=None):  # noqa: ARG001
        # Verify the summary prompt threaded through.
        prompt = messages[0]["content"]
        assert "pasaporta" in prompt
        assert "Klienti pyeti" in prompt or "queries" in prompt.lower() or "pyetjet" in prompt.lower()
        return "Klienti pyeti për pasaportë. Agjenti i tregoi dokumentet dhe tarifën. Rast i mbyllur."

    monkeypatch.setattr(agent_module.claude, "complete", fake_complete)

    token = _login(client, "agent")
    response = client.post(
        "/api/agent/summary",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "service": "pasaporta",
            "queries": ["Klienti pyeti për kosto"],
            "suggestions": ["Tarifa është 25 EUR"],
            "notes": "Klienti i kënaqur.",
        },
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert "Klienti" in body["summary"]
