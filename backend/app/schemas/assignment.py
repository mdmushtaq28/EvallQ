from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field


class QuestionSchema(BaseModel):
    id: Optional[str] = None
    question_number: int
    question_text: str
    question_type: str = "Subjective"  # Objective, Subjective, Short Answer, Long Answer
    maximum_marks: float = 10.0
    topic: str = "General"
    rubric: Optional[str] = None
    model_answer: Optional[str] = None
    expected_answer: Optional[str] = None
    key_concepts: Optional[List[str]] = Field(default_factory=list)
    strictness: str = "balanced"  # strict, balanced, flexible


class AssignmentCreateRequest(BaseModel):
    title: str = Field(..., min_length=2, max_length=200)
    subject: str = Field(..., min_length=2, max_length=100)
    instructions: Optional[str] = None
    due_date: Optional[str] = None
    total_maximum_marks: float = Field(default=100.0, ge=1.0)
    rubric_guidance: Optional[str] = None
    expected_concepts: Optional[List[str]] = Field(default_factory=list)
    questions: Optional[List[QuestionSchema]] = Field(default_factory=list)
    assigned_student_ids: Optional[List[str]] = Field(default_factory=list)
    status: str = Field(default="published", description="'draft' or 'published'")


class AssignmentResponse(BaseModel):
    id: str
    teacher_id: Optional[str] = None
    teacher_name: Optional[str] = None
    title: str
    subject: str
    instructions: Optional[str] = None
    due_date: Optional[str] = None
    total_maximum_marks: float
    rubric_guidance: Optional[str] = None
    expected_concepts: List[str] = Field(default_factory=list)
    questions: List[Dict[str, Any]] = Field(default_factory=list)
    status: str
    assigned_students_count: int = 0
    created_at: datetime
    submission_count: int = 0
    pending_review_count: int = 0
    average_score: Optional[float] = None
    assigned_students: Optional[List[Dict[str, Any]]] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Student Typed Assignment Workflow Schemas
# ---------------------------------------------------------------------------

class TypedAnswerItem(BaseModel):
    question_id: Optional[str] = None
    question_number: int
    answer_text: str


class StudentTypedSubmissionRequest(BaseModel):
    answers: List[TypedAnswerItem] = Field(..., min_length=1)


class StudentAssignmentListItem(BaseModel):
    id: str
    title: str
    subject: str
    teacher_name: str
    due_date: Optional[str] = None
    total_maximum_marks: float
    status: str  # NOT_STARTED, IN_PROGRESS, SUBMITTED, UNDER_REVIEW, EVALUATED, APPROVED
    score: Optional[float] = None
    final_score: Optional[float] = None
    teacher_feedback: Optional[str] = None
    submission_id: Optional[str] = None
    assigned_at: datetime


class StudentAssignmentDetailResponse(BaseModel):
    id: str
    title: str
    subject: str
    teacher_name: str
    instructions: Optional[str] = None
    due_date: Optional[str] = None
    total_maximum_marks: float
    questions: List[Dict[str, Any]] = Field(default_factory=list)
    status: str
    submission_id: Optional[str] = None
    is_submitted: bool = False
    submitted_answers: Optional[Dict[str, str]] = Field(default_factory=dict)


class StudentResultListItem(BaseModel):
    submission_id: str
    assignment_id: Optional[str] = None
    assignment_title: str
    subject: str
    teacher_name: str
    status: str  # "APPROVED" (Evaluated), "UNDER_REVIEW", "SUBMITTED"
    total_maximum_marks: float
    final_score: Optional[float] = None
    ai_suggested_score: Optional[float] = None
    teacher_score: Optional[float] = None
    percentage: Optional[float] = None
    teacher_feedback: Optional[str] = None
    question_count: int = 0
    submitted_at: datetime
    evaluated_at: Optional[datetime] = None


# ---------------------------------------------------------------------------
# Teacher Review & Score Update Schemas
# ---------------------------------------------------------------------------

class TeacherReviewItem(BaseModel):
    id: str
    student_name: str
    student_id: Optional[str] = None
    assignment_id: Optional[str] = None
    assignment_title: str
    ai_suggested_score: float
    teacher_score: Optional[float] = None
    final_score: Optional[float] = None
    total_maximum_marks: float
    approval_status: str  # "pending", "approved", "modified"
    submitted_at: datetime
    page_count: int = 1
    file_type: str = "typed"  # "typed" or "image/png"
    submission_type: str = "typed"
    original_filename: str = ""


class QuestionScoreUpdate(BaseModel):
    question_id: str
    teacher_marks: float
    teacher_feedback: Optional[str] = None
    override_reason: Optional[str] = None


class TeacherScoreUpdateRequest(BaseModel):
    teacher_score: Optional[float] = None
    teacher_feedback: Optional[str] = None
    question_updates: Optional[List[QuestionScoreUpdate]] = Field(default_factory=list)
    approve: bool = False


# ---------------------------------------------------------------------------
# Class Intelligence Schemas
# ---------------------------------------------------------------------------

class TopicPerformanceStat(BaseModel):
    topic: str
    number_of_students: int = 0
    number_of_questions: int = 0
    average_score: float = 0.0
    maximum_possible_score: float = 0.0
    average_percentage: float = 0.0
    students_above_threshold: int = 0
    students_below_threshold: int = 0
    common_learning_gaps: List[str] = Field(default_factory=list)


class IncorrectQuestionStat(BaseModel):
    question_number: int
    question_text: str
    topic: str
    attempts: int
    average_score: float
    maximum_marks: float
    low_score_count: int
    failure_percentage: float


class ConceptClarificationItem(BaseModel):
    concept: str
    topic: str
    class_performance: float
    students_affected: int
    total_students: int
    common_mistake: str


class ScoreDistribution(BaseModel):
    range_0_20: int = 0
    range_21_40: int = 0
    range_41_60: int = 0
    range_61_80: int = 0
    range_81_100: int = 0


class StudentSupportItem(BaseModel):
    student_id: Optional[str] = None
    submission_id: str
    student_name: str
    assignment_title: str
    score: float
    maximum_marks: float
    percentage: float
    weakest_topic: Optional[str] = None
    primary_weakness: Optional[str] = None
    learning_gaps: List[str] = Field(default_factory=list)
    last_assessment: Optional[datetime] = None


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


class ClassIntelligenceResponse(BaseModel):
    total_students: int
    total_assessments: int
    average_class_score: float
    strongest_topic: Optional[str] = None
    weakest_topic: Optional[str] = None
    strongest_topics: List[TopicPerformanceStat] = Field(default_factory=list)
    topics_needing_attention: List[TopicPerformanceStat] = Field(default_factory=list)
    concepts_needing_clarification: List[ConceptClarificationItem] = Field(default_factory=list)
    most_frequently_incorrect_questions: List[IncorrectQuestionStat] = Field(default_factory=list)
    score_distribution: ScoreDistribution
    students_needing_support: List[StudentSupportItem] = Field(default_factory=list)
    learning_gap_frequency: List[Dict[str, Any]] = Field(default_factory=list)
    ai_teaching_insights: Optional[str] = None
    remedial_recommendations: List[Dict[str, Any]] = Field(default_factory=list)
