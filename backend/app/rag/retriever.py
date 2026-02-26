"""High-level RAG retriever combining embeddings and vector store."""

from app.rag.embeddings import embed_texts, embed_query
from app.rag.chunker import chunk_text
from app.rag.vector_store import VectorStore


def build_paper_index(paper_id: str, text: str) -> int:
    """Build vector index for a paper's text. Returns number of chunks."""
    chunks = chunk_text(text)
    if not chunks:
        return 0

    embeddings = embed_texts(chunks)
    store = VectorStore(paper_id)
    store.build(chunks, embeddings)
    return len(chunks)


def retrieve_chunks(paper_id: str, query: str, top_k: int = 5) -> list[str]:
    """Retrieve the most relevant chunks for a query from a paper's index."""
    store = VectorStore(paper_id)
    if not store.exists:
        return []

    query_emb = embed_query(query)
    return store.search(query_emb, top_k=top_k)
