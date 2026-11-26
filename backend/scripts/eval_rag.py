"""Measure how well ZANA's retrieval finds the right service.

For every question in eval/questions.jsonl this runs the same retrieval the
chat endpoint uses (expand_query + retrieve_hybrid, filtered to the
question's language) and checks where the expected service appears in the
top 5 chunks.

Metrics
- hit@1 / hit@5: share of in-scope questions whose expected service is the
  first result / among the first five.
- MRR: mean of 1/rank of the expected service (0 when it is missing).
- grounded: share of in-scope questions where retrieval passed the 0.45
  cosine-distance threshold, so the chat would answer instead of refusing.
- refusal: share of off-topic questions ("expected": null) where retrieval
  was NOT grounded, so the chat correctly says it does not know.

Needs OPENAI_API_KEY and a built index:
    python -m scripts.seed && python -m scripts.index_catalogue
    python -m scripts.eval_rag

Writes eval/report.md and eval/results.json.
"""
from __future__ import annotations

import asyncio
import json
import sys
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
EVAL_DIR = BACKEND_DIR / "eval"
TOP_K = 5


@dataclass
class Row:
    q: str
    lang: str
    expected: str | None
    ranked_services: list[str]
    rank: int | None  # 1-based rank of the expected service, None if absent
    grounded: bool
    confidence: float
    best_distance: float  # closest chunk's cosine distance, for threshold tuning


def unique_in_order(items: list[str]) -> list[str]:
    seen: set[str] = set()
    return [x for x in items if x and not (x in seen or seen.add(x))]


def rank_of(expected: str | None, ranked: list[str]) -> int | None:
    if expected is None or expected not in ranked:
        return None
    return ranked.index(expected) + 1


def summarize(rows: list[Row]) -> dict[str, float | int]:
    in_scope = [r for r in rows if r.expected is not None]
    off_topic = [r for r in rows if r.expected is None]

    def share(n: float, d: int) -> float:
        return round(n / d, 3) if d else 0.0

    return {
        "questions": len(rows),
        "in_scope": len(in_scope),
        "off_topic": len(off_topic),
        "hit@1": share(sum(r.rank == 1 for r in in_scope), len(in_scope)),
        f"hit@{TOP_K}": share(sum(r.rank is not None and r.rank <= TOP_K for r in in_scope), len(in_scope)),
        "mrr": share(sum(1 / r.rank for r in in_scope if r.rank), len(in_scope)) if in_scope else 0.0,
        "grounded": share(sum(r.grounded for r in in_scope), len(in_scope)),
        "refusal": share(sum(not r.grounded for r in off_topic), len(off_topic)),
    }


def _settings():
    from app.config import get_settings
    return get_settings()


def write_report(rows: list[Row], summary: dict, path: Path) -> None:
    lines = [
        "# ZANA retrieval evaluation",
        "",
        f"Run: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')} · "
        f"{summary['in_scope']} in-scope questions, {summary['off_topic']} off-topic · top_k={TOP_K}",
        "",
        "The questions are hand-written test questions (SQ/EN/SR) about the 20 seeded services, "
        "not real user logs.",
        "",
        f"Embeddings: `{_settings().embedding_model}` · relevance threshold "
        f"(max cosine distance): {_settings().relevant_distance_max}. The threshold was chosen "
        "from this same question set, so treat the refusal score as optimistic.",
        "",
        "| Metric | Value |",
        "|---|---|",
    ]
    for key in ("hit@1", f"hit@{TOP_K}", "mrr", "grounded", "refusal"):
        lines.append(f"| {key} | {summary[key]:.0%} |" if key != "mrr" else f"| MRR | {summary[key]:.3f} |")
    lines += ["", "## Per question", "", "| Lang | Question | Expected | Rank | Grounded | Best distance |", "|---|---|---|---|---|---|"]
    for r in rows:
        expected = r.expected or "(off-topic)"
        rank = "–" if r.expected is None else (str(r.rank) if r.rank else "miss")
        lines.append(f"| {r.lang} | {r.q} | {expected} | {rank} | {'yes' if r.grounded else 'no'} | {r.best_distance:.3f} |")
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


async def run() -> int:
    sys.path.insert(0, str(BACKEND_DIR))
    from app.db.database import SessionLocal, init_db
    from app.rag import vectorstore
    from app.rag.retriever import expand_query, retrieve_hybrid

    init_db()
    if vectorstore.count() == 0:
        print("The Chroma index is empty. Run scripts.seed and scripts.index_catalogue first.", file=sys.stderr)
        return 1

    questions = [json.loads(line) for line in (EVAL_DIR / "questions.jsonl").read_text(encoding="utf-8").splitlines() if line.strip()]
    rows: list[Row] = []
    with SessionLocal() as db:
        for item in questions:
            result = await retrieve_hybrid(db, expand_query(item["q"]), top_k=TOP_K, where={"language": item["lang"]})
            ranked = unique_in_order([c.service_id for c in result.chunks])[:TOP_K]
            rows.append(
                Row(
                    q=item["q"],
                    lang=item["lang"],
                    expected=item["expected"],
                    ranked_services=ranked,
                    rank=rank_of(item["expected"], ranked),
                    grounded=result.grounded,
                    confidence=result.confidence,
                    best_distance=round(result.best_distance, 3),
                )
            )

    summary = summarize(rows)
    (EVAL_DIR / "results.json").write_text(
        json.dumps({"summary": summary, "rows": [asdict(r) for r in rows]}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    write_report(rows, summary, EVAL_DIR / "report.md")
    print(json.dumps(summary, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(run()))
