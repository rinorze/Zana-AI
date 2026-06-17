"""Admin-endpoint smoke tests.

External calls (Chroma upsert/delete, embedder, scraper) are monkey-patched so
this exercises the FastAPI surface, auth, and the SQLite catalogue.
"""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.catalogue import crud
from app.config import get_settings
from app.db.database import Base, get_db
from app.main import app
from app.routers import admin as admin_module
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker


@pytest.fixture(scope="module")
def admin_db(tmp_path_factory):
    db_path = tmp_path_factory.mktemp("zana-admin") / "zana.db"
    url = f"sqlite:///{db_path}"
    engine = create_engine(url, connect_args={"check_same_thread": False}, future=True)
    Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)

    with SessionLocal() as db:
        crud.upsert_service(
            db,
            {
                "service_id": "pasaporta",
                "category": "Dokumente",
                "names": {"sq": "Pasaporta"},
                "description": {"sq": "Dokument udhëtimi."},
                "fee": "25 EUR",
                "duration": "10 ditë",
                "office": "Zyra",
                "office_locations": [],
                "required_documents": [],
                "source_urls": [],
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
def client(admin_db) -> TestClient:
    return TestClient(app)


def _admin_token(client: TestClient) -> str:
    s = get_settings()
    response = client.post(
        "/api/auth/login",
        json={"username": s.admin_username, "password": s.admin_password},
    )
    assert response.status_code == 200
    return response.json()["access_token"]


def test_admin_requires_auth(client: TestClient):
    response = client.get("/api/admin/services")
    assert response.status_code == 401


def test_admin_lists_services(client: TestClient):
    token = _admin_token(client)
    response = client.get("/api/admin/services", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert any(s["service_id"] == "pasaporta" for s in response.json())


def test_admin_create_then_delete_service(client: TestClient, monkeypatch):
    monkeypatch.setattr(admin_module.vectorstore, "delete", lambda *a, **k: None)

    token = _admin_token(client)
    payload = {
        "service_id": "demo-service",
        "category": "Test",
        "names": {"sq": "Demo"},
        "description": {"sq": "Përshkrim demo."},
        "fee": "0",
        "duration": "",
        "office": "",
        "office_locations": [],
        "required_documents": [],
        "source_urls": [],
        "last_verified": "",
        "steps": [],
        "faqs": [],
        "response_templates": [],
    }
    created = client.post(
        "/api/admin/services",
        headers={"Authorization": f"Bearer {token}"},
        json=payload,
    )
    assert created.status_code == 200
    assert created.json()["service_id"] == "demo-service"

    deleted = client.delete(
        "/api/admin/services/demo-service",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert deleted.status_code == 200
    assert deleted.json()["ok"] is True


def test_admin_analytics_returns_counts(client: TestClient, admin_db):
    SessionLocal = admin_db
    with SessionLocal() as db:
        crud.log_query(db, role="citizen", query="test", found_match=True, language="sq")
        crud.log_query(db, role="citizen", query="test2", found_match=False, language="sq")
        db.commit()

    token = _admin_token(client)
    response = client.get("/api/admin/analytics", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    body = response.json()
    assert body["total_queries"] >= 2
    assert body["no_match_count"] >= 1
    assert "by_language" in body
