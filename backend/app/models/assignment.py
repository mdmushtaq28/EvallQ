import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any
import json
from sqlalchemy import Column, String, Integer, Float, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from ..database.connection import Base


class Assignment(Base):
    """
    SQLAlchemy ORM model for teacher assignments with questions, rubrics,
    and assigned students.
    """
    __tablename__ = "assignments"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    teacher_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    teacher_name = Column(String(100), nullable=True, default="Teacher")
    title = Column(String(200), nullable=False)
    subject = Column(String(100), nullable=False)  # e.g. "Computer Science", "Mathematics"
    instructions = Column(Text, nullable=True)
    due_date = Column(String(50), nullable=True)   # e.g. "12 Oct 2026"
    total_maximum_marks = Column(Float, nullable=False, default=100.0)
    rubric_guidance = Column(Text, nullable=True)
    expected_concepts = Column(Text, nullable=True)  # JSON list of concepts
    questions = Column(Text, nullable=True)          # JSON list of questions for backward compatibility
    status = Column(String(30), nullable=False, default="draft")  # draft, published, active, closed

    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    submissions = relationship(
        "AssessmentSubmission",
        back_populates="assignment",
        cascade="all, delete-orphan",
        order_by="AssessmentSubmission.created_at.desc()"
    )

    question_items = relationship(
        "AssignmentQuestionItem",
        back_populates="assignment",
        cascade="all, delete-orphan",
        order_by="AssignmentQuestionItem.question_number"
    )

    assigned_students = relationship(
        "AssignmentStudent",
        back_populates="assignment",
        cascade="all, delete-orphan"
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
        # Prefer child question_items relationship if present
        if self.question_items and len(self.question_items) > 0:
            return [
                {
                    "id": q.id,
                    "question_number": q.question_number,
                    "question_text": q.question_text,
                    "question_type": q.question_type,
                    "maximum_marks": q.maximum_marks,
                    "topic": q.topic,
                    "rubric": q.rubric or "",
                }
                for q in self.question_items
            ]
        # Fallback to JSON questions column
        if not self.questions:
            return []
        try:
            return json.loads(self.questions)
        except Exception:
            return []


class AssignmentQuestionItem(Base):
    """
    SQLAlchemy ORM model for explicit teacher-created questions belonging to an assignment.
    Guarantees questions are stored as children of the exact assignment.
    """
    __tablename__ = "assignment_question_items"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    assignment_id = Column(String(36), ForeignKey("assignments.id", ondelete="CASCADE"), nullable=False, index=True)
    question_number = Column(Integer, nullable=False, default=1)
    question_text = Column(Text, nullable=False)
    question_type = Column(String(50), nullable=False, default="Subjective")  # Objective, Subjective, Short Answer, Long Answer
    maximum_marks = Column(Float, nullable=False, default=10.0)
    topic = Column(String(100), nullable=False, default="General")
    rubric = Column(Text, nullable=True)

    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    assignment = relationship("Assignment", back_populates="question_items")


class AssignmentStudent(Base):
    """
    SQLAlchemy ORM model mapping assignments to individual students.
    Ensures students see ONLY assignments published and assigned directly to them.
    """
    __tablename__ = "assignment_students"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    assignment_id = Column(String(36), ForeignKey("assignments.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    student_name = Column(String(100), nullable=False)
    assigned_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    status = Column(String(30), nullable=False, default="ASSIGNED")  # ASSIGNED, IN_PROGRESS, SUBMITTED, UNDER_REVIEW, EVALUATED, APPROVED
    submission_id = Column(String(36), ForeignKey("assessment_submissions.id", ondelete="SET NULL"), nullable=True, index=True)

    assignment = relationship("Assignment", back_populates="assigned_students")
    submission = relationship("AssessmentSubmission")
