import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any
import json
from sqlalchemy import Column, String, Integer, Float, DateTime, Text
from sqlalchemy.orm import relationship
from ..database.connection import Base


class Assignment(Base):
    """
    SQLAlchemy ORM model for teacher assignments with rubrics and question schemas.
    """
    __tablename__ = "assignments"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String(200), nullable=False)
    subject = Column(String(100), nullable=False)  # e.g. "Computer Science", "Mathematics"
    instructions = Column(Text, nullable=True)
    total_maximum_marks = Column(Float, nullable=False, default=100.0)
    rubric_guidance = Column(Text, nullable=True)
    expected_concepts = Column(Text, nullable=True)  # JSON list of concepts
    questions = Column(Text, nullable=True)          # JSON list of questions
    status = Column(String(30), nullable=False, default="active")  # active, closed, draft

    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    submissions = relationship(
        "AssessmentSubmission",
        back_populates="assignment",
        cascade="all, delete-orphan",
        order_by="AssessmentSubmission.created_at.desc()"
    )

    def get_expected_concepts_list(self) -> List[str]:
        if not self.expected_concepts:
            return []
        try:
            data = json.loads(self.expected_concepts)
            if isinstance(data, list):
                return data
            return [str(data)]
        except Exception:
            return [c.strip() for c in self.expected_concepts.split(",") if c.strip()]

    def get_questions_list(self) -> List[Dict[str, Any]]:
        if not self.questions:
            return []
        try:
            return json.loads(self.questions)
        except Exception:
            return []
