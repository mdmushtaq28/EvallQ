from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field


class OCRPageResult(BaseModel):
    page_number: int
    raw_text: str
    normalized_text: str
    confidence: float = 1.0


class ExtractedQuestionItem(BaseModel):
    question_number: int
    page_number: int = 1
    question_text: str
    student_answer: str
    maximum_marks: float = 5.0


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
    total_maximum_marks: float
    ai_suggested_score: float
    teacher_score: Optional[float] = None
    final_score: Optional[float] = None
    percentage: float
    approval_status: str
    questions: List[QuestionEvaluationResult]
    topic_performance: List[TopicPerformanceItem]
    learning_gaps: List[LearningGapItem]
    recommendations: List[RecommendationItem]


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
