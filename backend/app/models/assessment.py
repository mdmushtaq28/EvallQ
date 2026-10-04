import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any
import json
from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from ..database.connection import Base


class AssessmentSubmission(Base):
    """
    SQLAlchemy ORM model for storing uploaded assessments, real OCR extractions,
    and rubric-based AI evaluation results.
    """
    __tablename__ = "assessment_submissions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    original_filename = Column(String(255), nullable=False)
    file_type = Column(String(100), nullable=False)  # e.g. "image/png", "application/pdf"
    file_path = Column(String(500), nullable=False)  # Local disk path
    file_hash = Column(String(64), nullable=True)    # SHA-256 hash for integrity
    page_count = Column(Integer, nullable=False, default=1)

    # OCR extraction state
    ocr_status = Column(String(30), nullable=False, default="pending")  # pending, completed, failed
    ocr_engine = Column(String(50), nullable=True)                     # RapidOCR-ONNX, Tesseract
    ocr_confidence = Column(Float, nullable=True)                      # Average OCR confidence score (0.0 - 1.0)
    raw_ocr_text = Column(Text, nullable=True)                         # JSON-serialized per-page raw text
    verified_ocr_text = Column(Text, nullable=True)                    # User/teacher verified text

    # Processing and evaluation state
    extraction_status = Column(String(30), nullable=False, default="pending")  # pending, completed, failed
    evaluation_status = Column(String(30), nullable=False, default="pending")  # pending, completed, failed

    # Scoring & Human-in-the-Loop model
    total_maximum_marks = Column(Float, nullable=False, default=0.0)
    ai_suggested_score = Column(Float, nullable=False, default=0.0)
    teacher_score = Column(Float, nullable=True)
    final_score = Column(Float, nullable=True)
    approval_status = Column(String(30), nullable=False, default="pending")  # pending, approved, modified

    # Analytics aggregations
    topic_performance = Column(Text, nullable=True)   # JSON: {"Inheritance": {"obtained": 3, "maximum": 5, "percentage": 60.0}}
    learning_gaps = Column(Text, nullable=True)       # JSON list of strings or gap objects
    recommendations = Column(Text, nullable=True)     # JSON list of actionable recommendations

    # Assignment association and student identity
    assignment_id = Column(String(36), ForeignKey("assignments.id", ondelete="SET NULL"), nullable=True, index=True)
    student_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    student_name = Column(String(100), nullable=True, default="Student")
    submission_type = Column(String(30), nullable=False, default="scanned")  # "scanned" or "typed"
    teacher_feedback = Column(Text, nullable=True)

    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    assignment = relationship("Assignment", back_populates="submissions")

    questions = relationship(
        "AssessmentQuestion",
        back_populates="submission",
        cascade="all, delete-orphan",
        order_by="AssessmentQuestion.question_number"
    )

    def get_raw_ocr_pages(self) -> List[Dict[str, Any]]:
        if not self.raw_ocr_text:
            return []
        try:
            return json.loads(self.raw_ocr_text)
        except Exception:
            return [{"page_number": 1, "text": self.raw_ocr_text}]

    def get_topic_performance_dict(self) -> Dict[str, Any]:
        if not self.topic_performance:
            return {}
        try:
            return json.loads(self.topic_performance)
        except Exception:
            return {}

    def get_learning_gaps_list(self) -> List[Dict[str, Any]]:
        if not self.learning_gaps:
            return []
        try:
            return json.loads(self.learning_gaps)
        except Exception:
            return []

    def get_recommendations_list(self) -> List[Dict[str, Any]]:
        if not self.recommendations:
            return []
        try:
            return json.loads(self.recommendations)
        except Exception:
            return []


class AssessmentQuestion(Base):
    """
    SQLAlchemy ORM model for individual questions extracted from an assessment
    and evaluated via the local Qwen LLM.
    """
    __tablename__ = "assessment_questions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    submission_id = Column(String(36), ForeignKey("assessment_submissions.id", ondelete="CASCADE"), nullable=False, index=True)
    question_number = Column(Integer, nullable=False, default=1)
    page_number = Column(Integer, nullable=False, default=1)

    question_text = Column(Text, nullable=False)
    student_answer = Column(Text, nullable=False)

    maximum_marks = Column(Float, nullable=False, default=5.0)
    suggested_marks = Column(Float, nullable=False, default=0.0)
    teacher_marks = Column(Float, nullable=True)
    teacher_feedback = Column(Text, nullable=True)

    topic = Column(String(100), nullable=False, default="General")
    rubric_match = Column(String(50), nullable=True)  # "Complete", "Partial", "Incorrect"
    reasoning = Column(Text, nullable=True)
    feedback = Column(Text, nullable=True)
    strengths = Column(Text, nullable=True)
    mistakes = Column(Text, nullable=True)
    learning_gap = Column(Text, nullable=True)

    # Teacher Rubric & Criterion Scoring
    model_answer = Column(Text, nullable=True)
    key_concepts = Column(Text, nullable=True)
    rubric = Column(Text, nullable=True)
    strictness = Column(String(20), nullable=False, default="balanced")
    criterion_scores = Column(Text, nullable=True)  # JSON-encoded List[Dict]
    supported_points = Column(Text, nullable=True)  # JSON-encoded List[str]
    missing_points = Column(Text, nullable=True)    # JSON-encoded List[str]
    confidence = Column(Float, nullable=True, default=0.95)
    teacher_review_required = Column(Integer, nullable=False, default=0)

    submission = relationship("AssessmentSubmission", back_populates="questions")

    def get_criterion_scores_list(self) -> List[Dict[str, Any]]:
        if not self.criterion_scores:
            return []
        try:
            data = json.loads(self.criterion_scores)
            return data if isinstance(data, list) else []
        except Exception:
            return []

    def get_supported_points_list(self) -> List[str]:
        if not self.supported_points:
            return [s.strip() for s in (self.strengths or "").split(";") if s.strip()]
        try:
            data = json.loads(self.supported_points)
            return data if isinstance(data, list) else []
        except Exception:
            return [s.strip() for s in (self.strengths or "").split(";") if s.strip()]

    def get_missing_points_list(self) -> List[str]:
        if not self.missing_points:
            return [m.strip() for m in (self.mistakes or "").split(";") if m.strip()]
        try:
            data = json.loads(self.missing_points)
            return data if isinstance(data, list) else []
        except Exception:
            return [m.strip() for m in (self.mistakes or "").split(";") if m.strip()]

    def get_key_concepts_list(self) -> List[str]:
        if not self.key_concepts:
            return []
        try:
            data = json.loads(self.key_concepts)
            if isinstance(data, list):
                return data
            return [c.strip() for c in str(data).split(",") if c.strip()]
        except Exception:
            return [c.strip() for c in str(self.key_concepts).split(",") if c.strip()]

