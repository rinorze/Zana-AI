"""Rate limiter: per-minute, per-IP-per-day and global daily cap."""
from __future__ import annotations

from fastapi.testclient import TestClient

from app.config import get_settings
from app.main import app
from app.middleware.rate_limit import RateLimiter, limiter

DAY_START = 1_790_000_000.0  # a fixed UTC timestamp; tests never depend on the real clock


def test_per_minute_limit_resets_next_minute():
    rl = RateLimiter()
    per_minute = get_settings().login_per_minute
    for _ in range(per_minute):
        assert rl.check("login", "1.1.1.1", now=DAY_START) is None
    assert rl.check("login", "1.1.1.1", now=DAY_START) == "minute"
    # Another caller is unaffected, and the same caller is allowed next minute.
    assert rl.check("login", "2.2.2.2", now=DAY_START) is None
    assert rl.check("login", "1.1.1.1", now=DAY_START + 60) is None


def test_chat_global_daily_cap_applies_across_ips(monkeypatch):
    settings = get_settings()
    monkeypatch.setattr(settings, "chat_daily_cap", 3)
    rl = RateLimiter()
    for i in range(3):
        assert rl.check("chat", f"10.0.0.{i}", now=DAY_START) is None
    assert rl.check("chat", "10.0.0.99", now=DAY_START) == "day"


def test_refused_request_is_not_counted(monkeypatch):
    settings = get_settings()
    monkeypatch.setattr(settings, "chat_per_minute", 1)
    monkeypatch.setattr(settings, "chat_daily_cap", 2)
    rl = RateLimiter()
    assert rl.check("chat", "a", now=DAY_START) is None
    # Refused by the per-minute limit, so it must not use up the daily cap.
    assert rl.check("chat", "a", now=DAY_START) == "minute"
    assert rl.check("chat", "b", now=DAY_START) is None
    assert rl.check("chat", "c", now=DAY_START) == "day"


def test_login_returns_429_with_retry_after_and_message():
    limiter.reset()
    client = TestClient(app)
    body = {"username": "nobody", "password": "wrong"}
    codes = [client.post("/api/auth/login", json=body).status_code
             for _ in range(get_settings().login_per_minute)]
    assert set(codes) == {401}
    response = client.post("/api/auth/login", json=body, headers={"accept-language": "en"})
    assert response.status_code == 429
    assert response.headers["retry-after"] == "60"
    assert "Too many requests" in response.json()["detail"]
