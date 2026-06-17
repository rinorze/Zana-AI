"""Semantic retrieval over the Chroma 'zana' collection.

Three levels of retrieval are exposed:

- ``retrieve`` — raw vector search; backward-compatible.
- ``retrieve_with_confidence`` — vector search + distance threshold + a
  confidence score in [0, 1]. Callers can short-circuit the LLM when the best
  chunk is "too far" to be useful.
- ``retrieve_hybrid`` — fuses lexical keyword hits (from SQLite) with vector
  hits using reciprocal rank fusion so common-name queries ("pasaporta")
  surface the right service even when its embedding isn't the closest.
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any, Iterable

from sqlalchemy.orm import Session

from app.rag import vectorstore
from app.rag.embedder import embed_text

# Cosine distance threshold above which we treat a chunk as "not actually
# relevant". Tuned empirically against the 20-service catalogue; lower numbers
# are stricter. 0.45 keeps off-topic chunks from polluting the context window.
RELEVANT_DISTANCE_MAX = 0.45

# Rank-fusion constant; the standard RRF formula uses k≈60.
RRF_K = 60


@dataclass
class Chunk:
    id: str
    text: str
    metadata: dict[str, Any]
    distance: float

    @property
    def service_id(self) -> str:
        return str(self.metadata.get("service_id", ""))

    @property
    def language(self) -> str:
        return str(self.metadata.get("language", ""))

    @property
    def source_url(self) -> str:
        return str(self.metadata.get("source_url", ""))

    @property
    def confidence(self) -> float:
        """0–1 score derived from cosine distance (closer = higher).

        Cosine distance lives in [0, 2]; we map [0, 1] → 1..0 linearly and
        clamp the rest at 0. Used by callers to drive UI badges.
        """
        d = max(0.0, min(1.0, self.distance))
        return round(1.0 - d, 3)


def _to_chunks(result: dict[str, Any]) -> list[Chunk]:
    ids = (result.get("ids") or [[]])[0]
    docs = (result.get("documents") or [[]])[0]
    metas = (result.get("metadatas") or [[]])[0]
    dists = (result.get("distances") or [[]])[0]
    out: list[Chunk] = []
    for i, chunk_id in enumerate(ids):
        out.append(
            Chunk(
                id=chunk_id,
                text=docs[i] if i < len(docs) else "",
                metadata=metas[i] if i < len(metas) else {},
                distance=float(dists[i]) if i < len(dists) else 0.0,
            )
        )
    return out


async def retrieve(
    query: str,
    top_k: int = 5,
    where: dict[str, Any] | None = None,
) -> list[Chunk]:
    """Pure vector search. Kept for callers that don't need the fancy logic."""
    if not query.strip():
        return []
    embedding = await embed_text(query)
    result = vectorstore.query(embedding=embedding, top_k=top_k, where=where)
    return _to_chunks(result)


@dataclass
class RetrievalResult:
    chunks: list[Chunk]
    best_distance: float
    confidence: float
    grounded: bool
    method: str  # 'semantic' / 'hybrid' / 'empty'

    @classmethod
    def empty(cls, method: str = "empty") -> "RetrievalResult":
        return cls(chunks=[], best_distance=1.0, confidence=0.0, grounded=False, method=method)


async def retrieve_with_confidence(
    query: str,
    top_k: int = 5,
    where: dict[str, Any] | None = None,
    distance_max: float = RELEVANT_DISTANCE_MAX,
) -> RetrievalResult:
    """Vector search + drop chunks whose distance exceeds the threshold.

    `grounded=False` is the signal for upstream code to refuse to answer and
    serve the verified "I don't know" fallback line instead of hallucinating.
    """
    if not query.strip():
        return RetrievalResult.empty()

    chunks = await retrieve(query, top_k=top_k * 2, where=where)  # over-fetch so filtering still leaves enough
    if not chunks:
        return RetrievalResult.empty("semantic")

    filtered = [c for c in chunks if c.distance <= distance_max]
    if not filtered:
        # Keep the very best one even if over threshold so the UI can show "we
        # tried but only weak matches" instead of nothing.
        best = min(chunks, key=lambda c: c.distance)
        return RetrievalResult(
            chunks=[],
            best_distance=best.distance,
            confidence=best.confidence,
            grounded=False,
            method="semantic",
        )

    filtered = filtered[:top_k]
    best = filtered[0]
    return RetrievalResult(
        chunks=filtered,
        best_distance=best.distance,
        confidence=best.confidence,
        grounded=True,
        method="semantic",
    )


# ----- keyword utilities used by the hybrid path ---------------------------


_TOKEN_RE = re.compile(r"[\wçëÇËšŠžŽđĐćĆ]+", re.UNICODE)


def _tokens(text: str) -> list[str]:
    return [t.lower() for t in _TOKEN_RE.findall(text or "") if len(t) > 2]


def _bm25_lite(query_tokens: Iterable[str], chunks: list[Chunk]) -> dict[str, float]:
    """Crude term-frequency scoring of chunks against the query tokens.

    Not a real BM25 — we don't have corpus statistics in scope — but enough to
    boost chunks that lexically match (e.g. "pasaporta" appearing in the FAQ
    text) when the semantic similarity alone misses them.
    """
    scores: dict[str, float] = {}
    qset = set(query_tokens)
    if not qset:
        return scores
    for c in chunks:
        text_tokens = set(_tokens(c.text))
        overlap = qset & text_tokens
        if not overlap:
            continue
        # Weight by share of query tokens that appear.
        scores[c.id] = len(overlap) / len(qset)
    return scores


def _reciprocal_rank_fusion(rankings: list[list[Chunk]], k: int = RRF_K) -> list[tuple[Chunk, float]]:
    """Combine multiple ranked lists into a single ordered list."""
    scores: dict[str, float] = {}
    seen: dict[str, Chunk] = {}
    for ranking in rankings:
        for rank, chunk in enumerate(ranking):
            scores[chunk.id] = scores.get(chunk.id, 0.0) + 1.0 / (k + rank + 1)
            seen.setdefault(chunk.id, chunk)
    return sorted(((seen[cid], s) for cid, s in scores.items()), key=lambda t: t[1], reverse=True)


async def retrieve_hybrid(
    db: Session,
    query: str,
    top_k: int = 5,
    where: dict[str, Any] | None = None,
    distance_max: float = RELEVANT_DISTANCE_MAX,
) -> RetrievalResult:
    """Combine vector search with lexical keyword scoring + service-name boost.

    The pipeline:
      1. Pull top 12 semantic chunks (over-fetched).
      2. Score them lexically against query tokens.
      3. Boost chunks whose service_id substring appears in the query.
      4. Reciprocal-rank-fuse semantic + lexical rankings.
      5. Return the top-K with grounding metadata.
    """
    semantic = await retrieve(query, top_k=top_k * 3, where=where)
    if not semantic:
        return RetrievalResult.empty("hybrid")

    q_tokens = _tokens(query)
    lex_scores = _bm25_lite(q_tokens, semantic)

    # Boost: if the chunk's service_id appears as a substring of the query,
    # promote it heavily. Cheap and effective for queries like "regjistrim
    # biznesi" that contain the service id verbatim.
    q_lower = query.lower()
    for c in semantic:
        sid = c.service_id.lower().replace("-", " ")
        if sid and sid.split(" ")[0] in q_lower:
            lex_scores[c.id] = lex_scores.get(c.id, 0.0) + 0.5

    semantic_ranked = sorted(semantic, key=lambda c: c.distance)
    lexical_ranked = sorted(
        (c for c in semantic if c.id in lex_scores),
        key=lambda c: lex_scores[c.id],
        reverse=True,
    )

    fused = _reciprocal_rank_fusion([semantic_ranked, lexical_ranked])
    # Apply the distance gate against the original semantic distance.
    grounded_chunks = [c for c, _ in fused if c.distance <= distance_max][:top_k]

    if not grounded_chunks:
        best = semantic_ranked[0]
        return RetrievalResult(
            chunks=[],
            best_distance=best.distance,
            confidence=best.confidence,
            grounded=False,
            method="hybrid",
        )

    best = grounded_chunks[0]
    return RetrievalResult(
        chunks=grounded_chunks,
        best_distance=best.distance,
        confidence=best.confidence,
        grounded=True,
        method="hybrid",
    )


# ----- query expansion ------------------------------------------------------


def expand_query(query: str, service_name: str | None = None) -> str:
    """Lightweight query rewrite for embedding lookup.

    Very short queries ("pasaporta?", "ID") get expanded with the question
    "Sa kushton dhe çfarë dokumentesh duhen për {term}?" so the embedding has
    enough context to land near procedure-rich chunks. When the caller already
    knows which service the citizen is on (e.g. agent dashboard), we append
    that service name too.

    This is intentionally not a HyDE-style LLM call — we want the chat to feel
    instant. A pre-call to Claude here would add 400–800ms.
    """
    cleaned = query.strip().rstrip("?").strip()
    if not cleaned:
        return query
    if len(cleaned.split()) >= 4:
        return query
    parts = [cleaned]
    if service_name:
        parts.append(service_name)
    parts.append("dokumentet tarifa kohëzgjatja zyra")
    return " ".join(parts)
