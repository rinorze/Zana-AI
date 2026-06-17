"""Citizen-endpoint smoke tests.

These exercise the FastAPI surface without hitting external services. Chat is
verified by stubbing the Claude stream + retriever so we can assert SSE framing
and QueryLog persistence end-to-end.
"""
from __future__ import annotations

import json
import os
from collections.abc import AsyncIterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from app.catalogue import crud
from app.db.database import Base, get_db
from app.llm.language import detect_language
from app.main import app
from app.routers import citizen as citizen_module


# ----- isolated SQLite per test session -----------------------------------


@pytest.fixture(scope="module")
def test_db(tmp_path_factory):
    db_path = tmp_path_factory.mktemp("zana-tests") / "zana.db"
    url = f"sqlite:///{db_path}"
    engine = create_engine(url, connect_args={"check_same_thread": False}, future=True)
    Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)

    with SessionLocal() as db:
        crud.upsert_service(
            db,
            {
                "service_id": "pasaporta",
                "category": "Dokumente Civile",
                "names": {"sq": "Pasaporta", "en": "Passport"},
                "description": {
                    "sq": "Pasaporta është dokument udhëtimi.",
                    "en": "Passport is a travel document.",
                },
                "fee": "25 EUR",
                "duration": "10 ditë pune",
                "office": "Zyra e Gjendjes Civile",
                "office_locations": [],
                "required_documents": ["Letërnjoftim valid"],
                "source_urls": ["https://ekosova.rks-gov.net/sherbimet/pasaporta"],
                "last_verified": "2026-05-21",
                "steps": [],
                "faqs": [],
                "response_templates": [],
            },
        )
        db.commit()

    def override_get_db():
        db = SessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    try:
        yield SessionLocal
    finally:
        app.dependency_overrides.pop(get_db, None)


@pytest.fixture()
def client(test_db) -> TestClient:
    return TestClient(app)


# ----- catalogue endpoints -------------------------------------------------


def test_health(client: TestClient):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_list_services_returns_seeded_service(client: TestClient):
    response = client.get("/api/services")
    assert response.status_code == 200
    body = response.json()
    assert body["total"] >= 1
    assert any(item["service_id"] == "pasaporta" for item in body["items"])


def test_get_service_detail_includes_documents(client: TestClient):
    response = client.get("/api/services/pasaporta")
    assert response.status_code == 200
    data = response.json()
    assert data["service_id"] == "pasaporta"
    assert "Letërnjoftim valid" in data["required_documents"]


def test_get_service_404(client: TestClient):
    response = client.get("/api/services/does-not-exist")
    assert response.status_code == 404


# ----- language detection --------------------------------------------------


def test_language_detect_albanian():
    assert detect_language("Sa kushton pasaporta për herë të parë?") == "sq"


def test_language_detect_english():
    assert detect_language("How much does the passport cost?") == "en"


def test_language_detect_cyrillic_serbian():
    assert detect_language("Колико кошта пасош?") == "sr"


# ----- chat SSE flow -------------------------------------------------------


@pytest.mark.asyncio
async def test_chat_streams_tokens_and_logs(client: TestClient, test_db, monkeypatch):
    async def fake_retrieve(query, top_k=5, where=None):  # noqa: ARG001
        from app.rag.retriever import Chunk

        return [
            Chunk(
                id="pasaporta::description::sq::0",
                text="Pasaporta kushton 25 EUR dhe lëshohet brenda 10 ditësh.",
                metadata={
                    "service_id": "pasaporta",
                    "language": "sq",
                    "source_url": "https://ekosova.rks-gov.net/sherbimet/pasaporta",
                },
                distance=0.1,
            )
        ]

    async def fake_stream(system, messages, max_tokens=1024, temperature=0.3, model=None):  # noqa: ARG001
        for token in ("Pasaporta ", "kushton ", "25 EUR."):
            yield token

    monkeypatch.setattr(citizen_module, "retrieve", fake_retrieve)
    monkeypatch.setattr(citizen_module.claude, "stream_complete", fake_stream)

    with client.stream(
        "POST",
        "/api/chat",
        json={"message": "Sa kushton pasaporta?"},
    ) as response:
        assert response.status_code == 200
        body = b"".join(response.iter_bytes()).decode("utf-8")

    # Verify SSE event framing (event:/data: lines + blank-line terminator).
    assert "event: language" in body
    assert "event: citations" in body
    assert "event: token" in body
    assert "event: structured" in body
    assert "event: done" in body

    tokens = [
        json.loads(line[len("data: "):])
        for line in body.splitlines()
        if line.startswith("data: ") and '"content"' in line
    ]
    assembled = "".join(t["content"] for t in tokens)
    assert assembled == "Pasaporta kushton 25 EUR."

    # QueryLog should now have one row for the citizen role.
    SessionLocal = test_db
    with SessionLocal() as db:
        row = db.execute(text("SELECT role, query, answer, found_match, language FROM query_logs ORDER BY id DESC LIMIT 1")).first()
    assert row is not None
    assert row[0] == "citizen"
    assert row[1] == "Sa kushton pasaporta?"
    assert "25 EUR" in row[2]
    assert row[3] == 1
    assert row[4] == "sq"


# ----- voice transcription error path --------------------------------------


def test_voice_transcribe_requires_audio(client: TestClient):
    response = client.post("/api/voice/transcribe", files={})
    assert response.status_code == 422  # missing file
