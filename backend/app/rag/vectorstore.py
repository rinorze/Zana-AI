"""Vector store wrapper: persistent ChromaDB, or an in-memory store.

Single collection named "zana" so we can scope filters via metadata
(service_id, type, language) without juggling multiple collections.
VECTOR_BACKEND=memory switches to app.rag.memory_store, loaded from
VECTOR_INDEX_FILE (used by the serverless demo, which cannot run Chroma).
"""
from __future__ import annotations

import threading
from typing import TYPE_CHECKING, Any

from app.config import get_settings

if TYPE_CHECKING:
    from chromadb.api import ClientAPI
    from chromadb.api.models.Collection import Collection

COLLECTION_NAME = "zana"

_lock = threading.Lock()
_client: ClientAPI | None = None
_collection: Any = None  # chromadb Collection or MemoryCollection


def _get_client() -> ClientAPI:
    global _client
    if _client is None:
        import chromadb  # imported here so the memory backend needs no Chroma

        settings = get_settings()
        _client = chromadb.PersistentClient(path=settings.chroma_persist_dir)
    return _client


def get_collection() -> "Collection":
    """Return the shared 'zana' collection, creating it if needed."""
    global _collection
    if _collection is None:
        with _lock:
            if _collection is None and get_settings().vector_backend == "memory":
                from app.rag.memory_store import MemoryCollection

                _collection = MemoryCollection.from_file(get_settings().vector_index_file)
            elif _collection is None:
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
    if get_settings().vector_backend == "memory":
        _collection = None
        return
    client = _get_client()
    try:
        client.delete_collection(COLLECTION_NAME)
    except Exception:
        # Collection may not exist yet; ignore.
        pass
    _collection = None
    get_collection()
