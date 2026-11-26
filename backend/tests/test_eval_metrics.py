"""The evaluation metrics themselves, checked on hand-made rows (no API calls)."""
from __future__ import annotations

from scripts.eval_rag import Row, rank_of, summarize, unique_in_order


def row(expected, ranked, grounded=True) -> Row:
    return Row(q="q", lang="sq", expected=expected, ranked_services=ranked,
               rank=rank_of(expected, ranked), grounded=grounded, confidence=0.0, best_distance=0.0)


def test_unique_in_order_keeps_first_occurrence():
    assert unique_in_order(["a", "b", "a", "", "c", "b"]) == ["a", "b", "c"]


def test_summary_metrics():
    rows = [
        row("pasaporta", ["pasaporta", "leternjoftim"]),        # rank 1
        row("leternjoftim", ["pasaporta", "leternjoftim"]),     # rank 2
        row("numri-fiskal", ["pasaporta"], grounded=False),     # miss
        row(None, [], grounded=False),                          # off-topic, refused
        row(None, ["pasaporta"], grounded=True),                # off-topic, answered
    ]
    s = summarize(rows)
    assert s["in_scope"] == 3 and s["off_topic"] == 2
    assert s["hit@1"] == round(1 / 3, 3)
    assert s["hit@5"] == round(2 / 3, 3)
    assert s["mrr"] == round((1 + 0.5) / 3, 3)
    assert s["grounded"] == round(2 / 3, 3)
    assert s["refusal"] == 0.5
