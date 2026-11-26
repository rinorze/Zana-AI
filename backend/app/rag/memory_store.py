"""A small in-memory vector store with the parts of Chroma's Collection API
that ZANA uses (upsert, query, delete, count).

Used by the hosted demo (VECTOR_BACKEND=memory). Serverless hosts cannot run
Chroma's native dependencies, and the catalogue is a few hundred chunks, so a
brute-force cosine search over a NumPy matrix is fast enough. The index is
loaded from a file made by scripts/export_index.py. Changes made at runtime
(admin re-index) live in memory only and are lost on restart.
"""
from __future__ import annotations

import json
import threading
from pathlib import Path
from typing import Any

import numpy as np


def _matches(metadata: dict[str, Any], where: dict[str, Any] | None) -> bool:
    """Supports the filters ZANA uses: {"key": value} and {"$and": [...]}."""
    if not where:
        return True
    if "$and" in where:
        return all(_matches(metadata, clause) for clause in where["$and"])
    return all(metadata.get(key) == value for key, value in where.items())


class MemoryCollection:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._ids: list[str] = []
        self._documents: list[str] = []
        self._metadatas: list[dict[str, Any]] = []
        self._vectors = np.zeros((0, 0), dtype=np.float32)  # rows are unit length

    @classmethod
    def from_file(cls, path: str | Path) -> "MemoryCollection":
        collection = cls()
        path = Path(path)
        if path.exists():
            with np.load(path, allow_pickle=False) as data:
                meta = json.loads(str(data["meta"]))
                collection.upsert(
                    ids=meta["ids"],
                    embeddings=data["embeddings"],
                    metadatas=meta["metadatas"],
                    documents=meta["documents"],
                )
        return collection

    def save(self, path: str | Path) -> None:
        meta = {"ids": self._ids, "documents": self._documents, "metadatas": self._metadatas}
        np.savez_compressed(path, embeddings=self._vectors, meta=np.array(json.dumps(meta)))

    @staticmethod
    def _normalise(embeddings: Any) -> np.ndarray:
        matrix = np.asarray(embeddings, dtype=np.float32)
        if matrix.ndim == 1:
            matrix = matrix[None, :]
        norms = np.linalg.norm(matrix, axis=1, keepdims=True)
        return matrix / np.where(norms == 0, 1, norms)

    def count(self) -> int:
        return len(self._ids)

    def upsert(self, ids, embeddings, metadatas, documents) -> None:
        vectors = self._normalise(embeddings)
        with self._lock:
            positions = {id_: i for i, id_ in enumerate(self._ids)}
            new_rows = []
            for row, id_ in enumerate(ids):
                if id_ in positions:
                    i = positions[id_]
                    self._vectors[i] = vectors[row]
                    self._documents[i] = documents[row]
                    self._metadatas[i] = dict(metadatas[row])
                else:
                    self._ids.append(id_)
                    self._documents.append(documents[row])
                    self._metadatas.append(dict(metadatas[row]))
                    new_rows.append(vectors[row])
            if new_rows:
                stacked = np.stack(new_rows)
                self._vectors = stacked if self._vectors.size == 0 else np.vstack([self._vectors, stacked])

    def query(self, query_embeddings, n_results: int = 5, where=None) -> dict[str, Any]:
        query = self._normalise(query_embeddings)[0]
        with self._lock:
            candidates = [i for i, m in enumerate(self._metadatas) if _matches(m, where)]
            if not candidates:
                return {"ids": [[]], "documents": [[]], "metadatas": [[]], "distances": [[]]}
            # Cosine distance, the same measure as the Chroma collection.
            distances = 1.0 - self._vectors[candidates] @ query
            order = np.argsort(distances)[:n_results]
            picked = [candidates[i] for i in order]
            return {
                "ids": [[self._ids[i] for i in picked]],
                "documents": [[self._documents[i] for i in picked]],
                "metadatas": [[self._metadatas[i] for i in picked]],
                "distances": [[float(distances[j]) for j in order]],
            }

    def delete(self, ids=None, where=None) -> None:
        with self._lock:
            drop = set(ids or [])
            keep = [
                i for i, (id_, m) in enumerate(zip(self._ids, self._metadatas))
                if id_ not in drop and not (where and _matches(m, where))
            ]
            self._ids = [self._ids[i] for i in keep]
            self._documents = [self._documents[i] for i in keep]
            self._metadatas = [self._metadatas[i] for i in keep]
            self._vectors = self._vectors[keep] if keep else np.zeros((0, 0), dtype=np.float32)
