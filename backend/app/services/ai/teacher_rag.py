import os
import json
import logging
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session

from ...models.teacher_rag import TeacherRAGDocument
from ...services.documents.embeddings import LocalEmbeddingService

logger = logging.getLogger("focusflow.teacher.rag")

# Singleton embedding service instance
_embed_service = None

def get_embedder() -> LocalEmbeddingService:
    global _embed_service
    if _embed_service is None:
        _embed_service = LocalEmbeddingService()
    return _embed_service


class TeacherRAGService:
    """
    On-device, Teacher-Specific Offline RAG service for assessment evaluation.
    Operates 100% offline using local ONNX embeddings (bge-small-en-v1.5) and SQLite storage.
    Enforces strict teacher isolation: Teacher A's documents NEVER influence Teacher B.
    Prioritizes precision over recall: Irrelevant context is strictly discarded.
    """

    DEFAULT_THRESHOLD: float = 0.65
    DEFAULT_TOP_K: int = 3

    @classmethod
    def index_document(
        cls,
        db: Session,
        teacher_id: str,
        title: str,
        document_type: str,
        content: str,
        subject: str = "Computer Science",
        topic: str = "",
        question_text: str = ""
    ) -> TeacherRAGDocument:
        """
        Chunks and embeds a teacher reference document locally, storing it in SQLite.
        """
        clean_content = content.strip()
        embedder = get_embedder()
        
        # Embed document text using local fastembed ONNX
        embed_text = f"{title}. {topic}. {clean_content}" if topic else f"{title}. {clean_content}"
        vec = embedder.generate_query_embedding(embed_text)

        doc = TeacherRAGDocument(
            teacher_id=teacher_id,
            title=title.strip(),
            document_type=document_type.strip(),
            subject=subject.strip() or "Computer Science",
            topic=topic.strip() or "General",
            question_text=question_text.strip() if question_text else None,
            content=clean_content,
            embedding=json.dumps(vec)
        )
        db.add(doc)
        db.commit()
        db.refresh(doc)
        logger.info(f"Indexed teacher RAG document '{doc.title}' (ID: {doc.id}, Teacher: {teacher_id}, Type: {doc.document_type})")
        return doc

    @classmethod
    def seed_sample_documents_if_empty(cls, db: Session, teacher_id: str) -> int:
        """
        Seeds sample demonstration documents for a teacher if they have no existing RAG documents.
        Demonstration documents only — application works normally if removed.
        """
        existing_count = db.query(TeacherRAGDocument).filter(TeacherRAGDocument.teacher_id == teacher_id).count()
        if existing_count > 0:
            return 0

        # Look for sample files in backend/data/teacher_rag/sample/
        candidates = [
            os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "data", "teacher_rag", "sample")),
            os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "..", "data", "teacher_rag", "sample")),
            os.path.abspath(os.path.join("backend", "data", "teacher_rag", "sample")),
            os.path.abspath(os.path.join("data", "teacher_rag", "sample")),
        ]
        sample_dir = None
        for c in candidates:
            if os.path.exists(c):
                sample_dir = c
                break

        if not sample_dir:
            logger.info("No sample teacher RAG directory found to seed.")
            return 0

        file_configs = [
            ("java_rubric.txt", "Java Inheritance Marking Rubric", "Rubric", "Inheritance"),
            ("java_model_answers.txt", "Java Inheritance Model Answer", "Model Answer", "Inheritance"),
            ("java_previous_evaluations.txt", "Java Inheritance Benchmarked Evaluation", "Previous Evaluated Assignment", "Inheritance"),
            ("java_feedback.txt", "Java OOP Grading Guidelines & Common Misconceptions", "Teacher Feedback", "Inheritance"),
        ]

        seeded = 0
        for fname, title, doc_type, topic in file_configs:
            fpath = os.path.join(sample_dir, fname)
            if os.path.exists(fpath):
                try:
                    with open(fpath, "r", encoding="utf-8") as f:
                        text = f.read().strip()
                    cls.index_document(
                        db=db,
                        teacher_id=teacher_id,
                        title=title,
                        document_type=doc_type,
                        content=text,
                        subject="Computer Science",
                        topic=topic
                    )
                    seeded += 1
                except Exception as e:
                    logger.warning(f"Failed to seed sample RAG document {fname}: {e}")

        logger.info(f"Seeded {seeded} sample RAG documents for teacher {teacher_id}.")
        return seeded

    @classmethod
    def retrieve_teacher_context(
        cls,
        db: Optional[Session],
        teacher_id: Optional[str],
        question_text: str,
        topic: str = "",
        subject: str = "",
        top_k: int = DEFAULT_TOP_K,
        threshold: float = DEFAULT_THRESHOLD
    ) -> Dict[str, Any]:
        """
        Retrieves relevant teacher-specific RAG context for a single question.
        Guarantees:
        1. Strict Teacher Isolation: ONLY documents where teacher_id matches.
        2. Precision over Recall: Cosine similarity >= threshold (default 0.65).
        3. Cross-Topic Guard: Strictly discards documents that conflict with question topic.
        4. Safe Fallback: Returns empty context on any missing data or failure without error.
        """
        empty_result = {
            "teacher_context_used": False,
            "context_text": "",
            "retrieved_sources": []
        }

        if not db or not teacher_id or not question_text or not question_text.strip():
            return empty_result

        try:
            # Step 1: Strict Teacher Isolation
            teacher_docs: List[TeacherRAGDocument] = (
                db.query(TeacherRAGDocument)
                .filter(TeacherRAGDocument.teacher_id == teacher_id)
                .all()
            )

            if not teacher_docs:
                return empty_result

            # Step 2: Local Embedding of Query
            embedder = get_embedder()
            query_str = f"{question_text} {topic}".strip()
            query_vec = embedder.generate_query_embedding(query_str)

            q_lower = question_text.lower()
            is_abstraction_q = "abstract" in q_lower
            is_encapsulation_q = "encapsulat" in q_lower or "incapsulat" in q_lower
            is_inheritance_q = "inherit" in q_lower or "subclass" in q_lower or "superclass" in q_lower
            is_polymorphism_q = "polymorph" in q_lower

            # Step 3: Compute Similarities & Apply Threshold + Topic Guards
            scored_docs: List[Tuple[TeacherRAGDocument, float]] = []
            for doc in teacher_docs:
                doc_vec = doc.get_embedding_vector()
                if not doc_vec:
                    doc_vec = embedder.generate_query_embedding(f"{doc.title}. {doc.content}")
                    doc.set_embedding_vector(doc_vec)
                    db.commit()

                sim = LocalEmbeddingService.cosine_similarity(query_vec, doc_vec)

                # Part 17: Strict Relevance Threshold
                if sim < threshold:
                    continue

                # Part 16 & 30: Topic Cross-Contamination Guard
                doc_text_lower = f"{doc.title} {doc.topic or ''} {doc.content}".lower()
                
                # If question is about Abstraction, NEVER allow Inheritance-only or Sorting documents
                if is_abstraction_q and not is_inheritance_q:
                    if "inheritance" in doc.title.lower() or "extends keyword" in doc_text_lower or "parent-child relationship" in doc_text_lower:
                        logger.info(f"RAG Guard: Discarded document '{doc.title}' because question is about Abstraction.")
                        continue

                # If question is about Encapsulation, NEVER allow Sorting or Inheritance documents
                if is_encapsulation_q and not is_inheritance_q:
                    if "inheritance" in doc.title.lower() or "quicksort" in doc_text_lower or "extends keyword" in doc_text_lower:
                        logger.info(f"RAG Guard: Discarded document '{doc.title}' because question is about Encapsulation.")
                        continue

                # If question is NOT about Inheritance, discard Inheritance-specific documents
                if not is_inheritance_q and ("inheritance" in (doc.topic or "").lower() or "inheritance" in doc.title.lower()):
                    logger.info(f"RAG Guard: Discarded inheritance document '{doc.title}' for non-inheritance question.")
                    continue

                scored_docs.append((doc, sim))

            if not scored_docs:
                return empty_result

            # Step 4: Rank by Similarity & Take Top-K
            scored_docs.sort(key=lambda x: x[1], reverse=True)
            top_matches = scored_docs[:top_k]

            # Step 5: Format Delineated Context
            context_blocks = []
            retrieved_sources = []
            for idx, (d, score) in enumerate(top_matches, start=1):
                context_blocks.append(
                    f"--- Source {idx} [{d.document_type}]: {d.title} (Relevance: {round(score, 3)}) ---\n"
                    f"{d.content}\n"
                )
                retrieved_sources.append({
                    "document_id": d.id,
                    "title": d.title,
                    "document_type": d.document_type,
                    "relevance_score": round(score, 3)
                })

            formatted_context = (
                "[TEACHER-SPECIFIC BENCHMARKS & GUIDELINES]\n"
                "The evaluating teacher has provided the following verified reference documents for this topic:\n\n"
                + "\n".join(context_blocks)
            )

            logger.info(
                f"RAG Retrieval: Matched {len(retrieved_sources)} teacher documents for '{question_text}' "
                f"(Teacher: {teacher_id}, Top Score: {retrieved_sources[0]['relevance_score']})"
            )

            return {
                "teacher_context_used": True,
                "context_text": formatted_context,
                "retrieved_sources": retrieved_sources
            }

        except Exception as e:
            logger.warning(f"Teacher RAG retrieval fallback due to error: {e}")
            return empty_result
