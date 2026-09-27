import time
from typing import List, Dict, Any, Optional, Tuple
import numpy as np
from ...core.config import settings

# Lazy imported to avoid startup overhead until first embedding call
_embedding_model = None


def get_embedding_model():
    global _embedding_model
    if _embedding_model is None:
        from fastembed import TextEmbedding
        # BAAI/bge-small-en-v1.5 is the fast, quantized ONNX default model (384 dimensions, ~67 MB)
        _embedding_model = TextEmbedding(model_name="BAAI/bge-small-en-v1.5")
    return _embedding_model


class LocalEmbeddingService:
    """
    On-device vector embedding and similarity search provider.
    Runs ONNX Runtime on Host CPU (x86_64) during development,
    with direct architectural migration path to Snapdragon Hexagon NPU via QNN EP.
    """

    def __init__(self):
        self.device = settings.DEV_ENVIRONMENT
        self.target_upgrade = "Snapdragon Copilot+ PC (Hexagon NPU via QNN Execution Provider)"
        self.model_name = "BAAI/bge-small-en-v1.5 (Quantized ONNX)"
        self.dimension = 384

    def get_status(self) -> Dict[str, Any]:
        return {
            "status": "ready",
            "model": "bge-small-en-v1.5",
            "runtime": "fastembed / onnxruntime",
            "dimension": self.dimension,
            "target": "host",
            "snapdragon_target": "ONNX Runtime (QNN EP) / Qualcomm AI Hub Nomic-Embed",
        }

    def generate_embeddings(self, texts: List[str]) -> List[List[float]]:
        """
        Generates dense vector embeddings for a list of string chunks.
        """
        if not texts:
            return []

        model = get_embedding_model()
        # model.embed returns a generator of numpy arrays
        embeddings_gen = model.embed(texts)
        results: List[List[float]] = []
        for emb in embeddings_gen:
            # emb is np.ndarray of shape (384,)
            results.append(emb.tolist())
        return results

    def generate_query_embedding(self, query: str) -> List[float]:
        """
        Generates embedding for a single query string.
        """
        results = self.generate_embeddings([query])
        return results[0] if results else [0.0] * self.dimension

    @staticmethod
    def cosine_similarity(vec_a: List[float], vec_b: List[float]) -> float:
        """
        Computes cosine similarity between two normalized vectors.
        """
        a = np.array(vec_a, dtype=np.float32)
        b = np.array(vec_b, dtype=np.float32)
        norm_a = np.linalg.norm(a)
        norm_b = np.linalg.norm(b)
        if norm_a == 0 or norm_b == 0:
            return 0.0
        return float(np.dot(a, b) / (norm_a * norm_b))

    def search_chunks(
        self,
        query: str,
        chunks: List[Dict[str, Any]],
        top_k: int = 3
    ) -> List[Tuple[Dict[str, Any], float]]:
        """
        Ranks candidate chunks against a query string using cosine similarity.
        Each item in chunks should have an 'embedding' list of floats.
        Returns:
            [(chunk_dict, similarity_score), ...] sorted in descending score order.
        """
        if not chunks:
            return []

        query_vec = self.generate_query_embedding(query)
        scored_chunks: List[Tuple[Dict[str, Any], float]] = []

        q_arr = np.array(query_vec, dtype=np.float32)
        q_norm = np.linalg.norm(q_arr)

        if q_norm == 0:
            return [(c, 0.0) for c in chunks[:top_k]]

        for chunk in chunks:
            emb = chunk.get("embedding")
            if not emb:
                continue
            c_arr = np.array(emb, dtype=np.float32)
            c_norm = np.linalg.norm(c_arr)
            score = float(np.dot(q_arr, c_arr) / (q_norm * c_norm)) if c_norm > 0 else 0.0
            scored_chunks.append((chunk, score))

        scored_chunks.sort(key=lambda x: x[1], reverse=True)
        return scored_chunks[:top_k]


# Singleton instance
embedding_service = LocalEmbeddingService()
