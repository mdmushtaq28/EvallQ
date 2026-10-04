from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, model_validator


class OCRPageResult(BaseModel):
    page_number: int
    raw_text: str
    normalized_text: str
    confidence: float = 1.0


class CriterionScoreItem(BaseModel):
    criterion: str
    score: float
    max_score: float
    feedback: Optional[str] = ""


class ExtractedQuestionItem(BaseModel):
    question_id: Optional[str] = None
    question_number: int
    page_number: int = 1
    question_text: str
    student_answer: str
    maximum_marks: float = 5.0
    model_answer: Optional[str] = None
    expected_answer: Optional[str] = None
    key_concepts: Optional[List[str]] = Field(default_factory=list)
    rubric: Optional[str] = None
    strictness: str = "balanced"  # strict, balanced, flexible
    topic: Optional[str] = "General"


class AssessmentUploadResponse(BaseModel):
    submission_id: str
    original_filename: str
    file_type: str
    page_count: int
    ocr_status: str
    ocr_engine: str
    ocr_confidence: Optional[float] = None
    pages: List[OCRPageResult]
    raw_ocr_text: str
    extracted_questions: List[ExtractedQuestionItem]


class OCRVerifyRequest(BaseModel):
    verified_ocr_text: str
    updated_questions: Optional[List[ExtractedQuestionItem]] = None


class OCRVerifyResponse(BaseModel):
    submission_id: str
    verified_ocr_text: str
    extracted_questions: List[ExtractedQuestionItem]


class QuestionEvaluationResult(BaseModel):
    question_id: Optional[str] = None
    question_number: int
    page_number: int = 1
    question_text: str
    student_answer: str
    maximum_marks: float = 5.0
    suggested_marks: float = 0.0
    teacher_marks: Optional[float] = None
    teacher_feedback: Optional[str] = None
    topic: str = "General"
    rubric_match: str = "Partial"
    reasoning: str = ""
    feedback: str = ""
    strengths: str = ""
    mistakes: str = ""
    learning_gap: str = ""
    is_correct: Optional[bool] = None
    ideal_answer: Optional[str] = None
    model_answer: Optional[str] = None
    confidence: Optional[float] = 0.95
    percentage: Optional[float] = None
    strictness: Optional[str] = "balanced"
    rubric: Optional[str] = None
    criterion_scores: Optional[List[CriterionScoreItem]] = Field(default_factory=list)
    supported_points: Optional[List[str]] = Field(default_factory=list)
    missing_points: Optional[List[str]] = Field(default_factory=list)
    teacher_review_required: Optional[bool] = False
    ai_score: Optional[float] = None
    teacher_final_score: Optional[float] = None
    override_reason: Optional[str] = None
    teacher_context_used: Optional[bool] = False
    retrieved_sources: Optional[List[Dict[str, Any]]] = Field(default_factory=list)


class TopicPerformanceItem(BaseModel):
    topic: str
    obtained_marks: float
    maximum_marks: float
    percentage: float


class LearningGapItem(BaseModel):
    topic: str
    learning_gap: str
    question_numbers: List[int]
    severity: str = "medium"  # high, medium, low
    recommended_action: str


class RecommendationItem(BaseModel):
    topic: str
    recommendation: str
    rationale: str


class AssessmentEvaluationResponse(BaseModel):
    submission_id: str
    assignment_id: Optional[str] = None
    assignment_title: Optional[str] = None
    total_maximum_marks: float
    maximum_marks: Optional[float] = None
    ai_suggested_score: float
    suggested_score: Optional[float] = None
    teacher_score: Optional[float] = None
    final_score: Optional[float] = None
    teacher_feedback: Optional[str] = None
    ai_score: Optional[float] = None
    teacher_final_score: Optional[float] = None
    override_reason: Optional[str] = None
    percentage: float
    approval_status: str
    questions: List[QuestionEvaluationResult]
    topic_performance: List[TopicPerformanceItem]
    learning_gaps: List[LearningGapItem]
    recommendations: List[RecommendationItem]
    teacher_context_used: Optional[bool] = False
    retrieved_sources: Optional[List[Dict[str, Any]]] = Field(default_factory=list)

    @model_validator(mode="before")
    @classmethod
    def populate_aliases(cls, values: Any) -> Any:
        if isinstance(values, dict):
            if values.get("maximum_marks") is None and "total_maximum_marks" in values:
                values["maximum_marks"] = values["total_maximum_marks"]
            if values.get("suggested_score") is None:
                values["suggested_score"] = values.get("final_score") or values.get("ai_suggested_score", 0.0)
            if values.get("ai_score") is None:
                values["ai_score"] = values.get("ai_suggested_score")
            if values.get("teacher_final_score") is None:
                values["teacher_final_score"] = values.get("teacher_score")
            if values.get("override_reason") is None:
                values["override_reason"] = values.get("teacher_feedback")
        return values


class TeacherQuestionReview(BaseModel):
    question_number: int
    teacher_marks: float
    teacher_feedback: Optional[str] = None


class TeacherReviewRequest(BaseModel):
    question_reviews: List[TeacherQuestionReview]
    approval_status: str = "approved"  # "approved" or "modified"


class AssessmentListItem(BaseModel):
    id: str
    original_filename: str
    file_type: str
    created_at: datetime
    ocr_status: str
    evaluation_status: str
    ai_suggested_score: float
    total_maximum_marks: float
    final_score: Optional[float] = None
    approval_status: str
    question_count: int = 0


class AssessmentAnalyticsResponse(BaseModel):
    total_assessments: int
    average_score_percentage: float
    strongest_topic: Optional[str] = None
    weakest_topic: Optional[str] = None
    total_learning_gaps: int
    recent_assessments: List[AssessmentListItem]
