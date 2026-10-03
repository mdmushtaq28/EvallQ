from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field


class QuestionSchema(BaseModel):
    question_number: int
    question_text: str
    maximum_marks: float = 5.0
    topic: str = "General"
    rubric: Optional[str] = None


class AssignmentCreateRequest(BaseModel):
    title: str = Field(..., min_length=2, max_length=200)
    subject: str = Field(..., min_length=2, max_length=100)
    instructions: Optional[str] = None
    total_maximum_marks: float = Field(default=100.0, ge=1.0)
    rubric_guidance: Optional[str] = None
    expected_concepts: Optional[List[str]] = Field(default_factory=list)
    questions: Optional[List[QuestionSchema]] = Field(default_factory=list)


class AssignmentResponse(BaseModel):
    id: str
    title: str
    subject: str
    instructions: Optional[str] = None
    total_maximum_marks: float
    rubric_guidance: Optional[str] = None
    expected_concepts: List[str] = Field(default_factory=list)
    questions: List[Dict[str, Any]] = Field(default_factory=list)
    status: str
    created_at: datetime
    submission_count: int = 0
    pending_review_count: int = 0
    average_score: Optional[float] = None


class TeacherReviewItem(BaseModel):
    id: str
    student_name: str
    assignment_id: Optional[str] = None
    assignment_title: str
    ai_suggested_score: float
    teacher_score: Optional[float] = None
    final_score: Optional[float] = None
    total_maximum_marks: float
    approval_status: str  # "pending", "approved", "modified"
    submitted_at: datetime
    page_count: int = 1
    file_type: str = "image/png"
    original_filename: str = ""


class QuestionScoreUpdate(BaseModel):
    question_id: str
    teacher_marks: float
    teacher_feedback: Optional[str] = None


class TeacherScoreUpdateRequest(BaseModel):
    teacher_score: Optional[float] = None
    teacher_feedback: Optional[str] = None
    question_updates: Optional[List[QuestionScoreUpdate]] = Field(default_factory=list)
    approve: bool = False


class StudentSupportItem(BaseModel):
    submission_id: str
    student_name: str
    assignment_title: str
    score: float
    maximum_marks: float
    percentage: float
    primary_weakness: Optional[str] = None


class TopicPerformanceStat(BaseModel):
    topic: str
    average_percentage: float
    question_count: int


class TeacherDashboardStats(BaseModel):
    total_assignments: int
    pending_reviews: int
    completed_reviews: int
    average_class_score: float  # Percentage 0 - 100
    students_requiring_attention: int
    strongest_topic: Optional[str] = None
    weakest_topic: Optional[str] = None
    topic_analytics: List[TopicPerformanceStat] = Field(default_factory=list)
    students_needing_support: List[StudentSupportItem] = Field(default_factory=list)
