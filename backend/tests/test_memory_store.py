"""The in-memory vector store behaves like the parts of Chroma ZANA uses."""
from app.rag.memory_store import MemoryCollection


def make() -> MemoryCollection:
    store = MemoryCollection()
    store.upsert(
        ids=["a", "b", "c"],
        embeddings=[[1, 0], [0, 1], [1, 1]],
        metadatas=[{"language": "sq", "service_id": "x"}, {"language": "en", "service_id": "y"}, {"language": "sq", "service_id": "y"}],
        documents=["A", "B", "C"],
    )
    return store


def test_query_orders_by_cosine_distance():
    result = make().query(query_embeddings=[[1, 0]], n_results=2)
    assert result["ids"] == [["a", "c"]]
    assert abs(result["distances"][0][0]) < 1e-6


def test_where_filters_including_and():
    store = make()
    assert store.query([[1, 0]], 5, where={"language": "en"})["ids"] == [["b"]]
    both = {"$and": [{"language": "sq"}, {"service_id": "y"}]}
    assert store.query([[1, 0]], 5, where=both)["ids"] == [["c"]]
    assert store.query([[1, 0]], 5, where={"language": "de"})["ids"] == [[]]


def test_upsert_replaces_and_delete_removes(tmp_path):
    store = make()
    store.upsert(ids=["a"], embeddings=[[0, 1]], metadatas=[{"language": "sq"}], documents=["A2"])
    assert store.count() == 3
    assert store.query([[0, 1]], 1, where={"language": "sq"})["documents"] == [["A2"]]
    store.delete(where={"service_id": "y"})
    assert store.count() == 1
    store.save(tmp_path / "i.npz")
    assert MemoryCollection.from_file(tmp_path / "i.npz").count() == 1
