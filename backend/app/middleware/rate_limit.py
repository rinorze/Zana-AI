"""Rate limits for the public, unauthenticated endpoints.

Why: /api/chat, /api/search and /api/voice/transcribe spend money on every
call (OpenAI embeddings, Claude, Whisper), and /api/auth/login can be
brute-forced. The public demo must not let one visitor, or a bot, drain the
API budget.

How: fixed windows kept in memory.

- Every bucket has a per-IP limit for the current minute.
- "chat" also has a per-IP limit for the current UTC day and one global cap for
  the day across all visitors (CHAT_DAILY_CAP).

In-memory state is enough for a single-process demo server. It resets when the
process restarts and is not shared between workers, which is acceptable here
and documented in the README. A multi-instance deployment would move these
counters to Redis.
"""
from __future__ import annotations

import threading
import time
from dataclasses import dataclass
from datetime import datetime, timezone

from fastapi import HTTPException, Request

from app.config import get_settings


@dataclass(frozen=True)
class Limits:
    per_minute: int
    per_ip_per_day: int | None = None
    global_per_day: int | None = None


def _limits_for(bucket: str) -> Limits:
    s = get_settings()
    table = {
        "chat": Limits(s.chat_per_minute, s.chat_per_ip_per_day, s.chat_daily_cap),
        "search": Limits(s.search_per_minute),
        "voice": Limits(s.voice_per_minute, s.voice_per_ip_per_day),
        "login": Limits(s.login_per_minute),
        # Shares the global daily cap with chat: both spend the same LLM quota.
        "agent": Limits(s.agent_per_minute, s.agent_per_ip_per_day, s.chat_daily_cap),
    }
    return table[bucket]


_MESSAGES = {
    "minute": {
        "sq": "Shumë kërkesa njëherësh. Ju lutem prisni një minutë dhe provoni përsëri.",
        "en": "Too many requests at once. Please wait a minute and try again.",
        "sr": "Previše zahteva odjednom. Sačekajte minut i pokušajte ponovo.",
    },
    "day": {
        "sq": "Demo-ja publike ka arritur limitin e sotëm. Provoni nesër, ose vizitoni eKosova.rks-gov.net.",
        "en": "The public demo has reached today's limit. Please try again tomorrow, or visit eKosova.rks-gov.net.",
        "sr": "Javni demo je dostigao današnje ograničenje. Pokušajte sutra ili posetite eKosova.rks-gov.net.",
    },
}


class RateLimiter:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._counts: dict[tuple, int] = {}

    def reset(self) -> None:
        with self._lock:
            self._counts.clear()

    def check(self, bucket: str, client_ip: str, now: float | None = None) -> str | None:
        """Return None when allowed, or "minute" / "day" naming the limit hit."""
        limits = _limits_for(bucket)
        now = time.time() if now is None else now
        minute = int(now // 60)
        day = datetime.fromtimestamp(now, tz=timezone.utc).strftime("%Y-%m-%d")

        with self._lock:
            # Drop windows from earlier minutes/days so memory stays bounded.
            self._counts = {
                k: v for k, v in self._counts.items() if k[-1] in (minute, day)
            }
            # Check every limit before counting, so a refused request costs nothing.
            checks: list[tuple[tuple, int, str]] = [
                ((bucket, "ip", client_ip, minute), limits.per_minute, "minute"),
            ]
            if limits.per_ip_per_day is not None:
                checks.append(((bucket, "ip", client_ip, day), limits.per_ip_per_day, "day"))
            if limits.global_per_day is not None:
                checks.append(((bucket, "all", day), limits.global_per_day, "day"))

            for key, limit, kind in checks:
                if self._counts.get(key, 0) >= limit:
                    return kind
            for key, _, _ in checks:
                self._counts[key] = self._counts.get(key, 0) + 1
        return None


limiter = RateLimiter()


def client_ip(request: Request) -> str:
    """Caller's IP. Behind a proxy (Hugging Face, Render) the socket address is
    the proxy's, so the first X-Forwarded-For hop is used when
    TRUST_PROXY_HEADERS is on. It stays off by default because the header is
    trivial to fake when there is no proxy in front."""
    if get_settings().trust_proxy_headers:
        forwarded = request.headers.get("x-forwarded-for", "")
        if forwarded:
            return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _language(request: Request) -> str:
    lang = (request.query_params.get("language") or "").lower()
    if lang in ("sq", "en", "sr"):
        return lang
    accept = request.headers.get("accept-language", "").lower()
    for code in ("en", "sr"):
        if accept.startswith(code):
            return code
    return "sq"


def rate_limit(bucket: str):
    """FastAPI dependency: `Depends(rate_limit("chat"))` on a route."""

    def dependency(request: Request) -> None:
        if not get_settings().rate_limit_enabled:
            return
        hit = limiter.check(bucket, client_ip(request))
        if hit is None:
            return
        retry_after = "60" if hit == "minute" else "3600"
        raise HTTPException(
            status_code=429,
            detail=_MESSAGES[hit][_language(request)],
            headers={"Retry-After": retry_after},
        )

    return dependency
