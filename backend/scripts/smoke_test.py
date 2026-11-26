"""Smoke-test a running ZANA backend end to end.

    python -m scripts.smoke_test https://<your-backend-host>

Checks:
1. /health is ok, the catalogue is seeded and the search index is not empty.
2. One Albanian and one English question each stream an answer with
   citations (event: citations) and text tokens, and no error event.

Each chat question counts against the public rate limit and daily cap.
Exits non-zero on the first failure, so it can run in CI after a deploy.
"""
from __future__ import annotations

import json
import sys

import httpx

QUESTIONS = [
    ("sq", "Sa kushton pasaporta?"),
    ("en", "How much does a passport cost?"),
]


def fail(message: str) -> None:
    print(f"FAIL  {message}")
    raise SystemExit(1)


def check_health(base: str) -> None:
    response = httpx.get(f"{base}/health", timeout=60)
    if response.status_code != 200:
        fail(f"/health returned {response.status_code}")
    data = response.json()
    if data.get("status") != "ok":
        fail(f"/health status is {data.get('status')!r}")
    if not data.get("services"):
        fail("catalogue is empty (services=0)")
    if not data.get("chroma_chunks"):
        fail("search index is empty (chroma_chunks=0); check OPENAI_API_KEY")
    print(f"ok    /health: {data['services']} services, {data['chroma_chunks']} chunks")


def parse_sse(body: str) -> list[tuple[str, dict]]:
    events: list[tuple[str, dict]] = []
    for block in body.split("\n\n"):
        name, data = "", ""
        for line in block.splitlines():
            if line.startswith("event: "):
                name = line[len("event: "):]
            elif line.startswith("data: "):
                data = line[len("data: "):]
        if name:
            events.append((name, json.loads(data) if data.startswith("{") else {}))
    return events


def check_chat(base: str, language: str, question: str) -> None:
    with httpx.stream(
        "POST",
        f"{base}/api/chat",
        json={"message": question, "language": language},
        timeout=120,
    ) as response:
        if response.status_code != 200:
            fail(f"[{language}] /api/chat returned {response.status_code}: {response.read()[:200]!r}")
        body = response.read().decode("utf-8")

    events = parse_sse(body)
    names = [name for name, _ in events]
    errors = [data for name, data in events if name == "error"]
    if errors:
        fail(f"[{language}] error event: {errors[0]}")
    citations = [c for name, data in events if name == "citations" for c in data.get("citations", [])]
    if not citations:
        fail(f"[{language}] no citations (events: {names})")
    answer = "".join(data.get("content", "") for name, data in events if name == "token")
    if len(answer.strip()) < 20:
        fail(f"[{language}] answer too short: {answer!r}")
    print(f"ok    [{language}] {len(citations)} citations, {len(answer)} chars: {answer[:80]!r}…")


def main() -> int:
    if len(sys.argv) != 2:
        print(__doc__)
        return 2
    base = sys.argv[1].rstrip("/")
    check_health(base)
    for language, question in QUESTIONS:
        check_chat(base, language, question)
    print("PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
