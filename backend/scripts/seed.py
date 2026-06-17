"""Seed the SQLite catalogue from data/seed_services.json.

Idempotent: re-running replaces nested rows (steps, FAQs, templates) for each
service while preserving the service's primary key.

Run from the backend/ directory:
    python -m scripts.seed
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

from sqlalchemy import select

from app.catalogue import crud
from app.catalogue.models import Service
from app.db.database import SessionLocal, init_db

SEED_FILE = Path(__file__).resolve().parent.parent / "data" / "seed_services.json"


def main() -> int:
    if not SEED_FILE.exists():
        print(f"Seed file not found: {SEED_FILE}", file=sys.stderr)
        return 1

    with SEED_FILE.open("r", encoding="utf-8") as fh:
        payload = json.load(fh)

    if not isinstance(payload, list):
        print("Seed file must be a JSON array of services.", file=sys.stderr)
        return 1

    init_db()

    with SessionLocal() as db:
        for entry in payload:
            service = crud.upsert_service(db, entry)
            print(f"upserted: {service.service_id} (id={service.id})")
        db.commit()

        total = db.execute(select(Service)).scalars().all()
        print(f"\nTotal services in DB: {len(total)}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
