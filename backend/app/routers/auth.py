"""POST /api/auth/login — exchanges username/password for a bearer JWT.

Two static identities (admin + agent) defined by env vars. There is no per-user
database — this is a single-tenant tool for a hackathon, not a SaaS.
"""
from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.config import get_settings

from app.middleware.auth import ROLE_ADMIN, ROLE_AGENT, authenticate_credentials, create_access_token
from app.middleware.rate_limit import rate_limit

router = APIRouter(prefix="/api/auth", tags=["auth"])


class LoginRequest(BaseModel):
    username: str = Field(..., min_length=1, max_length=64)
    password: str = Field(..., min_length=1, max_length=256)


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str


@router.post("/login", response_model=LoginResponse, dependencies=[Depends(rate_limit("login"))])
def login(req: LoginRequest) -> LoginResponse:
    role = authenticate_credentials(req.username, req.password)
    token = create_access_token(subject=req.username, role=role)
    return LoginResponse(access_token=token, role=role)


class DemoRequest(BaseModel):
    role: Literal["admin", "agent"]


class DemoResponse(LoginResponse):
    demo: bool = True


@router.post("/demo", response_model=DemoResponse, dependencies=[Depends(rate_limit("login"))])
def demo_login(req: DemoRequest) -> DemoResponse:
    """Session without a password for the public demo (DEMO_ACCESS=true).
    The token is marked demo: admin changes are refused (forbid_demo_writes)
    and agent co-pilot calls are rate-limited."""
    if not get_settings().demo_access:
        raise HTTPException(status_code=404, detail="Demo access is off")
    role = ROLE_ADMIN if req.role == "admin" else ROLE_AGENT
    token = create_access_token(subject="demo", role=role, expires_hours=8, demo=True)
    return DemoResponse(access_token=token, role=role)
