"""FAISS-based vector store for per-paper chunk storage and retrieval."""

import os
import json
import faiss
import numpy as np
from app.config import get_settings


class VectorStore:
    """Manages a FAISS index and chunk metadata for a single paper."""

    def __init__(self, paper_id: str):
        self.paper_id = paper_id
        self.store_dir = os.path.join(get_settings().vector_store_dir, paper_id)
        self.index_path = os.path.join(self.store_dir, "index.faiss")
        self.chunks_path = os.path.join(self.store_dir, "chunks.json")
        self.index: faiss.IndexFlatIP | None = None
        self.chunks: list[str] = []

    def build(self, chunks: list[str], embeddings: np.ndarray):
        """Build and persist a FAISS index from chunks and their embeddings."""
        os.makedirs(self.store_dir, exist_ok=True)

        # Normalize embeddings for cosine similarity via inner product
        faiss.normalize_L2(embeddings)
        dim = embeddings.shape[1]
        self.index = faiss.IndexFlatIP(dim)
        self.index.add(embeddings)
        self.chunks = chunks

        # Save to disk
        faiss.write_index(self.index, self.index_path)
        with open(self.chunks_path, "w", encoding="utf-8") as f:
            json.dump(chunks, f, ensure_ascii=False)

    def load(self) -> bool:
        """Load a previously saved index. Returns True if successful."""
        if not os.path.exists(self.index_path) or not os.path.exists(self.chunks_path):
            return False
        self.index = faiss.read_index(self.index_path)
        with open(self.chunks_path, "r", encoding="utf-8") as f:
            self.chunks = json.load(f)
        return True

    def search(self, query_embedding: np.ndarray, top_k: int = 5) -> list[str]:
        """Search for the top_k most similar chunks to the query embedding."""
        if self.index is None:
            if not self.load():
                return []

        faiss.normalize_L2(query_embedding)
        scores, indices = self.index.search(query_embedding, min(top_k, len(self.chunks)))

        results = []
        for idx in indices[0]:
            if 0 <= idx < len(self.chunks):
                results.append(self.chunks[idx])
        return results

    @property
    def exists(self) -> bool:
        return os.path.exists(self.index_path)
