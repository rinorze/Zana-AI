"""Refresh the catalogue from live Kosovo gov sources.

Walks a curated list of public landing pages with our Playwright scraper, drops
the resulting chunks into Chroma, and stamps each service row's last_verified
column with today's date so the UI can show a freshness badge.

Designed to be run periodically (cron / GitHub Action / admin button):

    python -m scripts.refresh_catalogue
    python -m scripts.refresh_catalogue --only pasaporta,leternjoftim

This script intentionally only re-ingests *public* pages it can render without a
login. For services hidden behind eKosova SSO, the admin must trigger the
ingestion from inside the panel while authenticated. The mapping below points to
the closest publicly-readable canonical page (ministry portal or eKosova FAQ
section) so the LLM context still benefits from real source material.
"""
from __future__ import annotations

import argparse
import asyncio
from datetime import date

from sqlalchemy import select

from app.catalogue.models import Service
from app.db.database import SessionLocal, init_db
from app.ingestion import indexer
from app.ingestion.scraper import scrape_url

# service_id → list[url] of publicly-readable canonical references.
SERVICE_REFERENCES: dict[str, list[str]] = {
    "pasaporta": [
        "https://mpb.rks-gov.net/page.aspx?id=1,3",
        "https://ekosova.rks-gov.net/Home/FAQ",
    ],
    "leternjoftim": [
        "https://mpb.rks-gov.net/page.aspx?id=1,2",
    ],
    "patente-shoferi": [
        "https://mpb.rks-gov.net/page.aspx?id=1,4",
    ],
    "regjistrim-automjeti": [
        "https://mpb.rks-gov.net/page.aspx?id=1,5",
    ],
    "certifikate-lindjeje": [
        "https://ekosova.rks-gov.net/Home/FAQ",
    ],
    "certifikate-martese": [
        "https://ekosova.rks-gov.net/Home/FAQ",
    ],
    "certifikate-vdekjeje": [
        "https://ekosova.rks-gov.net/Home/FAQ",
    ],
    "ekstrakt-amze": [
        "https://ekosova.rks-gov.net/Home/FAQ",
    ],
    "certifikate-gjendjes-martesore": [
        "https://ekosova.rks-gov.net/Home/FAQ",
    ],
    "leje-qendrimi-huaj": [
        "https://mpb.rks-gov.net/",
    ],
    "regjistrim-biznesi": [
        "https://arbk.rks-gov.net/",
    ],
    "numri-fiskal": [
        "https://www.atk-ks.org/",
    ],
    "regjistrim-tvsh": [
        "https://www.atk-ks.org/",
    ],
    "ekstrakti-pronesise": [
        "https://www.kca-ks.org/",
    ],
    "sigurim-shendetesor": [
        "https://shendetesia.rks-gov.net/",
    ],
    "legalizim-diplome": [
        "https://masht.rks-gov.net/",
    ],
    "aplikim-vize": [
        "https://mfa-ks.net/",
    ],
    "pension-pleqerise": [
        "https://mpms.rks-gov.net/",
    ],
    "certifikate-padenimi": [
        "https://ekosova.rks-gov.net/Home/FAQ",
    ],
    "numri-personal": [
        "https://mpb.rks-gov.net/",
    ],
}


async def _refresh_one(service_id: str) -> tuple[int, list[str]]:
    """Scrape + index every reference URL for a single service.

    Returns (total_chunks_indexed, urls_that_succeeded).
    """
    urls = SERVICE_REFERENCES.get(service_id, [])
    chunks_total = 0
    successful: list[str] = []
    for idx, url in enumerate(urls):
        try:
            page = await scrape_url(url)
        except Exception as exc:
            print(f"  ! {url}: scrape failed — {exc}")
            continue
        if not page.text.strip():
            print(f"  ! {url}: empty (probably JS-only or blocked)")
            continue
        n = await indexer.index_text(
            text=page.text,
            source_id=f"svc-{service_id}-{idx}",
            kind="service-reference",
            metadata={"service_id": service_id, "url": url, "title": page.title},
        )
        chunks_total += n
        if n > 0:
            successful.append(url)
            print(f"  ✓ {url} → {n} chunks")
    return chunks_total, successful


def _stamp_last_verified(service_ids: list[str]) -> None:
    today = date.today().isoformat()
    with SessionLocal() as db:
        rows = list(db.execute(select(Service).where(Service.service_id.in_(service_ids))).scalars())
        for s in rows:
            s.last_verified = today
        db.commit()
        print(f"Stamped last_verified={today} on {len(rows)} services.")


async def main(only: list[str] | None) -> int:
    init_db()
    targets = only or list(SERVICE_REFERENCES.keys())
    verified: list[str] = []
    for service_id in targets:
        print(f"\n▶ refreshing {service_id}")
        chunks, ok = await _refresh_one(service_id)
        if chunks > 0:
            verified.append(service_id)
    if verified:
        _stamp_last_verified(verified)
    print(f"\nDone. Refreshed {len(verified)}/{len(targets)} services.")
    return 0 if verified else 1


def _parse() -> argparse.Namespace:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--only", help="Comma-separated service_ids to refresh", default="")
    return p.parse_args()


if __name__ == "__main__":
    args = _parse()
    only = [s.strip() for s in args.only.split(",") if s.strip()] or None
    raise SystemExit(asyncio.run(main(only)))
