"""POST /api/auth/login — exchanges username/password for a bearer JWT.

Two static identities (admin + agent) defined by env vars. There is no per-user
database — this is a single-tenant tool for a hackathon, not a SaaS.
"""
from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.middleware.auth import authenticate_credentials, create_access_token

router = APIRouter(prefix="/api/auth", tags=["auth"])


class LoginRequest(BaseModel):
    username: str = Field(..., min_length=1, max_length=64)
    password: str = Field(..., min_length=1, max_length=256)


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str


@router.post("/login", response_model=LoginResponse)
def login(req: LoginRequest) -> LoginResponse:
    role = authenticate_credentials(req.username, req.password)
    token = create_access_token(subject=req.username, role=role)
    return LoginResponse(access_token=token, role=role)
