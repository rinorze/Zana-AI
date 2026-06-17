"""Seed the Sources table with a curated list of Kosovo government portals so
the admin UI can trigger ingestion without typing each URL in by hand.

Run inside the backend container:
    python -m scripts.seed_sources
"""
from __future__ import annotations

from app.catalogue.models import Source
from app.db.database import SessionLocal, init_db
from sqlalchemy import select

SEED_SOURCES: list[tuple[str, str]] = [
    ("https://ekosova.rks-gov.net/", "Platforma eKosova"),
    ("https://www.atk-ks.org/", "Administrata Tatimore e Kosovës (ATK)"),
    ("https://mpb.rks-gov.net/", "Ministria e Punëve të Brendshme"),
    ("https://arbk.rks-gov.net/", "Agjencia për Regjistrimin e Bizneseve (ARBK)"),
    ("https://mpms.rks-gov.net/", "Ministria e Punës dhe Mirëqenies Sociale"),
    ("https://masht.rks-gov.net/", "Ministria e Arsimit (MASHTI)"),
    ("https://mfa-ks.net/", "Ministria e Punëve të Jashtme"),
    ("https://shendetesia.rks-gov.net/", "Ministria e Shëndetësisë"),
    ("https://www.kca-ks.org/", "Agjencia Kadastrale e Kosovës"),
    ("https://dogana.rks-gov.net/", "Doganat e Kosovës"),
    ("https://fssh.rks-gov.net/", "Fondi i Sigurimit Shëndetësor"),
    ("https://geoportal.rks-gov.net/", "Geoportali Kombëtar"),
]


def main() -> int:
    init_db()
    with SessionLocal() as db:
        existing = {row[0] for row in db.execute(select(Source.url)).all()}
        added = 0
        for url, title in SEED_SOURCES:
            if url in existing:
                continue
            db.add(Source(url=url, title=title, status="seeded"))
            added += 1
        db.commit()
        print(f"Seeded {added} sources. Total now: {len(existing) + added}.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
