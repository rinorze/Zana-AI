from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import func, select

from app.config import get_settings
from app.db.database import SessionLocal, init_db
from app.middleware.auth import warn_if_default_secrets
from app.routers.admin import router as admin_router
from app.routers.agent import router as agent_router
from app.routers.auth import router as auth_router
from app.routers.citizen import router as citizen_router

settings = get_settings()


def seed_catalogue_if_empty() -> None:
    from app.catalogue.models import Service
    from scripts.seed import main as seed_main

    with SessionLocal() as db:
        total = int(db.execute(select(func.count(Service.id))).scalar_one())
    if total == 0:
        seed_main()


async def index_catalogue_if_empty() -> None:
    """Build the Chroma index on first boot. On a host without a persistent
    disk (the free demo host) this runs after every restart. 20 services is a
    few hundred chunks, so it takes seconds and costs a fraction of a cent."""
    from app.rag import vectorstore
    from scripts.index_catalogue import index_all

    if vectorstore.count() == 0:
        await index_all()


@asynccontextmanager
async def lifespan(app: FastAPI):
    if settings.is_production:
        problems = warn_if_default_secrets()
        if problems:
            raise RuntimeError("Refusing to start in production: " + " ".join(problems))
    init_db()
    if settings.auto_seed_catalogue:
        seed_catalogue_if_empty()
    if settings.auto_index_catalogue:
        await index_catalogue_if_empty()
    yield


app = FastAPI(
    title="ZANA API",
    description="AI assistant for Kosovo public services (eKosova).",
    version="0.2.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    # FRONTEND_URL may list several origins, comma-separated.
    allow_origins=[
        *(o.strip().rstrip("/") for o in settings.frontend_url.split(",") if o.strip()),
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(citizen_router)
app.include_router(auth_router)
app.include_router(agent_router)
app.include_router(admin_router)


@app.exception_handler(RequestValidationError)
async def validation_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content={"error": "validation_error", "details": exc.errors()},
    )


@app.get("/health")
async def health() -> dict[str, Any]:
    out: dict[str, Any] = {"status": "ok", "service": "zana-api", "version": app.version}
    try:
        from app.catalogue.models import QueryLog, Service

        with SessionLocal() as db:
            out["services"] = int(db.execute(select(func.count(Service.id))).scalar_one())
            out["query_logs"] = int(db.execute(select(func.count(QueryLog.id))).scalar_one())
    except Exception as exc:  # pragma: no cover — observability only
        out["db_error"] = str(exc)

    try:
        from app.rag import vectorstore

        out["chroma_chunks"] = vectorstore.count()
    except Exception as exc:
        out["chroma_error"] = str(exc)

    return out
