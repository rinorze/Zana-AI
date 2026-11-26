"""Production startup guard: default secrets must stop the server."""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.config import get_settings
from app.main import app


def test_production_refuses_default_secrets(monkeypatch):
    settings = get_settings()
    monkeypatch.setattr(settings, "environment", "production")
    monkeypatch.setattr(settings, "jwt_secret", "dev-secret-do-not-use-in-production")
    with pytest.raises(RuntimeError, match="JWT_SECRET"):
        with TestClient(app):  # entering the context runs the lifespan
            pass


def test_production_starts_with_real_secrets(monkeypatch):
    settings = get_settings()
    monkeypatch.setattr(settings, "environment", "production")
    monkeypatch.setattr(settings, "jwt_secret", "x" * 64)
    monkeypatch.setattr(settings, "admin_password", "a-real-admin-password")
    monkeypatch.setattr(settings, "agent_password", "a-real-agent-password")
    with TestClient(app) as client:
        assert client.get("/health").json()["status"] == "ok"
