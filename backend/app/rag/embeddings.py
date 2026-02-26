"""Embedding generation using sentence-transformers."""

import numpy as np
from sentence_transformers import SentenceTransformer

_model: SentenceTransformer | None = None
MODEL_NAME = "all-MiniLM-L6-v2"


def _get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        _model = SentenceTransformer(MODEL_NAME)
    return _model


def embed_texts(texts: list[str]) -> np.ndarray:
    """Generate embeddings for a list of texts.

    Returns:
        numpy array of shape (len(texts), embedding_dim)
    """
    model = _get_model()
    embeddings = model.encode(texts, show_progress_bar=False, convert_to_numpy=True)
    return embeddings.astype("float32")


def embed_query(query: str) -> np.ndarray:
    """Generate embedding for a single query string.

    Returns:
        numpy array of shape (1, embedding_dim)
    """
    model = _get_model()
    embedding = model.encode([query], show_progress_bar=False, convert_to_numpy=True)
    return embedding.astype("float32")
