"""Export the Chroma index to a file for VECTOR_BACKEND=memory.

    python -m scripts.export_index [out.npz]

Run after scripts.index_catalogue, with the same EMBEDDING_* settings the
deployed app will use (query and index embeddings must come from one model).
"""
from __future__ import annotations

import sys

from app.config import get_settings
from app.rag.memory_store import MemoryCollection


def main() -> None:
    import chromadb

    out = sys.argv[1] if len(sys.argv) > 1 else get_settings().vector_index_file
    client = chromadb.PersistentClient(path=get_settings().chroma_persist_dir)
    data = client.get_collection("zana").get(include=["embeddings", "metadatas", "documents"])
    store = MemoryCollection()
    store.upsert(ids=data["ids"], embeddings=data["embeddings"], metadatas=data["metadatas"], documents=data["documents"])
    store.save(out)
    print(f"Exported {store.count()} chunks to {out}")


if __name__ == "__main__":
    main()
