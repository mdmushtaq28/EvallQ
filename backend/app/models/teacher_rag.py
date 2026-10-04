import uuid
import json
from datetime import datetime
from typing import List, Optional
from sqlalchemy import Column, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from ..database.connection import Base


class TeacherRAGDocument(Base):
    """
    SQLAlchemy ORM model for Teacher-Specific Offline RAG documents.
    Enforces strict teacher isolation: every document belongs to a specific teacher_id.
    Teacher A's documents can NEVER influence Teacher B.
    """
    __tablename__ = "teacher_rag_documents"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    teacher_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    document_type = Column(String(50), nullable=False)  # "Rubric", "Marking Scheme", "Model Answer", "Previous Evaluated Assignment", "Teacher Feedback", "Grading Guideline"
    subject = Column(String(100), nullable=False, default="Computer Science")
    topic = Column(String(100), nullable=True)  # e.g. "Inheritance", "Abstraction", "Encapsulation"
    question_text = Column(Text, nullable=True)  # Optional binding to a specific question
    content = Column(Text, nullable=False)
    embedding = Column(Text, nullable=True)  # JSON-encoded List[float] (384-dimensional vector from local fastembed)
    created_at = Column(DateTime, default=datetime.utcnow)

    teacher = relationship("User")

    def get_embedding_vector(self) -> List[float]:
        if not self.embedding:
            return []
        try:
            return json.loads(self.embedding)
        except Exception:
            return []

    def set_embedding_vector(self, vec: List[float]) -> None:
        self.embedding = json.dumps(vec)
