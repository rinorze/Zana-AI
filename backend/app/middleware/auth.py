"""JWT auth helpers shared by agent + admin routers.

Two principals:
- "admin" — full CRUD over the catalogue.
- "agent" — co-pilot WebSocket + templates + summary endpoints.

The login endpoint validates the username/password from settings (no per-user DB)
and mints a short-lived HS256 token; everything downstream just verifies the
token and reads the `role` claim.
"""
from __future__ import annotations

import secrets
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import Depends, HTTPException, Request, WebSocket, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from app.config import get_settings

ROLE_ADMIN = "admin"
ROLE_AGENT = "agent"

_bearer = HTTPBearer(auto_error=False)


def _credentials_match(username: str, password: str) -> str | None:
    """Return the role string ("admin"/"agent") if creds match, else None.

    Uses secrets.compare_digest to avoid leaking length via timing.
    """
    settings = get_settings()

    def safe_eq(a: str, b: str) -> bool:
        return secrets.compare_digest(a.encode(), b.encode())

    if safe_eq(username, settings.admin_username) and safe_eq(password, settings.admin_password):
        return ROLE_ADMIN
    if safe_eq(username, settings.agent_username) and safe_eq(password, settings.agent_password):
        return ROLE_AGENT
    return None


def create_access_token(subject: str, role: str, expires_hours: int | None = None) -> str:
    settings = get_settings()
    hours = expires_hours or settings.jwt_expiry_hours
    now = datetime.now(timezone.utc)
    payload = {
        "sub": subject,
        "role": role,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(hours=hours)).timestamp()),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_token(token: str) -> dict[str, Any]:
    settings = get_settings()
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or expired token: {exc}",
        ) from exc


def _principal_from_token(token: str) -> dict[str, Any]:
    claims = decode_token(token)
    role = claims.get("role")
    if role not in (ROLE_ADMIN, ROLE_AGENT):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unknown role")
    return {"sub": claims.get("sub", ""), "role": role}


# -------- HTTP dependencies -------------------------------------------------


def current_principal(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> dict[str, Any]:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Bearer token required")
    return _principal_from_token(credentials.credentials)


def require_admin(principal: dict[str, Any] = Depends(current_principal)) -> dict[str, Any]:
    if principal["role"] != ROLE_ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin required")
    return principal


def require_agent(principal: dict[str, Any] = Depends(current_principal)) -> dict[str, Any]:
    if principal["role"] not in (ROLE_ADMIN, ROLE_AGENT):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Agent or admin required")
    return principal


# -------- WebSocket helper (token comes as ?token=... query param) ----------


async def authenticate_ws(websocket: WebSocket, expected_role: str) -> dict[str, Any]:
    """Validate a WS connection. Closes the socket on failure and raises.

    The frontend connects with `wss://.../ws/...?token=<jwt>`; we read it from
    query params rather than headers because most browser WS clients can't set
    custom headers.
    """
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=4401)
        raise HTTPException(status_code=401, detail="Missing token")
    try:
        principal = _principal_from_token(token)
    except HTTPException:
        await websocket.close(code=4401)
        raise
    if expected_role == ROLE_ADMIN and principal["role"] != ROLE_ADMIN:
        await websocket.close(code=4403)
        raise HTTPException(status_code=403, detail="Admin required")
    if expected_role == ROLE_AGENT and principal["role"] not in (ROLE_ADMIN, ROLE_AGENT):
        await websocket.close(code=4403)
        raise HTTPException(status_code=403, detail="Agent required")
    return principal


def authenticate_credentials(username: str, password: str) -> str:
    """Return the role for valid creds; raise 401 otherwise."""
    role = _credentials_match(username, password)
    if role is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    return role


# Used by lifespan to short-circuit accidentally deployed default secrets.
def warn_if_default_secrets(_request: Request | None = None) -> list[str]:
    settings = get_settings()
    warnings: list[str] = []
    if settings.jwt_secret == "dev-secret-do-not-use-in-production":
        warnings.append("JWT_SECRET is set to the development default.")
    if settings.admin_password in ("changeme", ""):
        warnings.append("ADMIN_PASSWORD is unset or default.")
    if settings.agent_password in ("changeme", ""):
        warnings.append("AGENT_PASSWORD is unset or default.")
    return warnings
