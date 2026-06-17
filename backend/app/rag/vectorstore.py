"""Persistent ChromaDB wrapper.

Single collection named "zana" so we can scope filters via metadata
(service_id, type, language) without juggling multiple collections.
"""
from __future__ import annotations

import threading
from typing import Any

import chromadb
from chromadb.api import ClientAPI
from chromadb.api.models.Collection import Collection

from app.config import get_settings

COLLECTION_NAME = "zana"

_lock = threading.Lock()
_client: ClientAPI | None = None
_collection: Collection | None = None


def _get_client() -> ClientAPI:
    global _client
    if _client is None:
        settings = get_settings()
        _client = chromadb.PersistentClient(path=settings.chroma_persist_dir)
    return _client


def get_collection() -> Collection:
    """Return the shared 'zana' collection, creating it if needed."""
    global _collection
    if _collection is None:
        with _lock:
            if _collection is None:
                client = _get_client()
                _collection = client.get_or_create_collection(
                    name=COLLECTION_NAME,
                    metadata={"hnsw:space": "cosine"},
                )
    return _collection


def add(
    ids: list[str],
    embeddings: list[list[float]],
    metadatas: list[dict[str, Any]],
    documents: list[str],
) -> None:
    if not ids:
        return
    collection = get_collection()
    # upsert keeps IDs stable across re-indexes.
    collection.upsert(
        ids=ids,
        embeddings=embeddings,
        metadatas=metadatas,
        documents=documents,
    )


def query(
    embedding: list[float],
    top_k: int = 5,
    where: dict[str, Any] | None = None,
) -> dict[str, Any]:
    collection = get_collection()
    return collection.query(
        query_embeddings=[embedding],
        n_results=top_k,
        where=where,
    )


def delete(ids: list[str] | None = None, where: dict[str, Any] | None = None) -> None:
    if not ids and not where:
        return
    collection = get_collection()
    collection.delete(ids=ids, where=where)


def count() -> int:
    return get_collection().count()


def reset_for_tests() -> None:
    """Drop the collection (and re-create it empty). Use sparingly."""
    global _collection
    client = _get_client()
    try:
        client.delete_collection(COLLECTION_NAME)
    except Exception:
        # Collection may not exist yet; ignore.
        pass
    _collection = None
    get_collection()
