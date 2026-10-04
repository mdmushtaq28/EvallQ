export interface OCRPageResult {
  page_number: number;
  raw_text: string;
  normalized_text: string;
  confidence: number;
}

export interface ExtractedQuestionItem {
  question_number: number;
  page_number: number;
  question_text: string;
  student_answer: string;
  maximum_marks: number;
}

export interface AssessmentUploadResponse {
  submission_id: string;
  original_filename: string;
  file_type: string;
  page_count: number;
  ocr_status: string;
  ocr_engine: string;
  ocr_confidence?: number;
  pages: OCRPageResult[];
  raw_ocr_text: string;
  extracted_questions: ExtractedQuestionItem[];
}

export interface OCRVerifyRequest {
  verified_ocr_text: string;
  updated_questions?: ExtractedQuestionItem[];
}

export interface OCRVerifyResponse {
  submission_id: string;
  verified_ocr_text: string;
  extracted_questions: ExtractedQuestionItem[];
}

export interface CriterionScoreItem {
  criterion: string;
  score: number;
  max_score: number;
  feedback?: string;
}

export interface QuestionEvaluationResult {
  question_number: number;
  page_number: number;
  question_text: string;
  student_answer: string;
  maximum_marks: number;
  suggested_marks: number;
  teacher_marks?: number | null;
  teacher_feedback?: string | null;
  topic: string;
  rubric_match: string;
  reasoning: string;
  feedback: string;
  strengths: string;
  mistakes: string;
  learning_gap: string;
  is_correct?: boolean;
  ideal_answer?: string;
  model_answer?: string;
  confidence?: number;
  percentage?: number;
  strictness?: 'strict' | 'balanced' | 'flexible' | string;
  criterion_scores?: CriterionScoreItem[];
  supported_points?: string[];
  missing_points?: string[];
  teacher_review_required?: boolean;
  ai_score?: number;
  teacher_final_score?: number | null;
  override_reason?: string | null;
  teacher_context_used?: boolean;
  retrieved_sources?: Array<{ document_id: string; title: string; document_type: string; relevance_score: number }>;
}

export interface TopicPerformanceItem {
  topic: string;
  obtained_marks: number;
  maximum_marks: number;
  percentage: number;
}

export interface LearningGapItem {
  topic: string;
  learning_gap: string;
  question_numbers: number[];
  severity: 'high' | 'medium' | 'low';
  recommended_action: string;
}

export interface RecommendationItem {
  topic: string;
  recommendation: string;
  rationale: string;
}

export interface AssessmentEvaluationResponse {
  submission_id: string;
  total_maximum_marks: number;
  ai_suggested_score: number;
  ai_score?: number;
  teacher_score?: number | null;
  teacher_final_score?: number | null;
  final_score?: number | null;
  teacher_feedback?: string | null;
  override_reason?: string | null;
  percentage: number;
  approval_status: string;
  questions: QuestionEvaluationResult[];
  topic_performance: TopicPerformanceItem[];
  learning_gaps: LearningGapItem[];
  recommendations: RecommendationItem[];
  teacher_context_used?: boolean;
  retrieved_sources?: Array<{ document_id: string; title: string; document_type: string; relevance_score: number }>;
}

export interface TeacherQuestionReview {
  question_number: number;
  teacher_marks: number;
  teacher_feedback?: string | null;
}

export interface TeacherReviewRequest {
  question_reviews: TeacherQuestionReview[];
  approval_status: string;
}

export interface AssessmentListItem {
  id: string;
  original_filename: string;
  file_type: string;
  created_at: string;
  ocr_status: string;
  evaluation_status: string;
  ai_suggested_score: number;
  total_maximum_marks: number;
  final_score?: number | null;
  approval_status: string;
  question_count: number;
}

export interface AssessmentAnalyticsResponse {
  total_assessments: number;
  average_score_percentage: number;
  strongest_topic?: string | null;
  weakest_topic?: string | null;
  total_learning_gaps: number;
  recent_assessments: AssessmentListItem[];
}
