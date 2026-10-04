export * from './api';
export * from './assessment';

export type UserRole = 'student' | 'teacher';

export type TabType =
  | 'dashboard'
  | 'tutor'
  | 'study'
  | 'focus'
  | 'analytics'
  | 'settings'
  | 'assessment'
  | 'student-assignments'
  | 'student-solve'
  | 'student-result'
  | 'teacher-dashboard'
  | 'teacher-assignments'
  | 'teacher-review'
  | 'teacher-analytics';

export type AIModelStatus = 'LOCAL_AI' | 'OFFLINE_MODE' | 'NOT_INSTALLED' | 'DEMO_MODE';

export type InferenceDevice = 'AUTO' | 'CPU' | 'GPU' | 'ENGINE';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  tokensPerSec?: number;
  latencyMs?: number;
  isStreaming?: boolean;
}

export interface DocumentItem {
  id: string;
  filename: string;
  size: number;
  uploadDate: string;
  pageCount: number;
  summary?: string;
  keyTakeaways?: string[];
  chunkCount?: number;
  processed: boolean;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  category?: string;
}

export type FocusState = 'FOCUSED' | 'AWAY' | 'NOT_DETECTED';

export interface FocusSessionMetrics {
  sessionId: string;
  startTime: string;
  durationSeconds: number;
  focusedSeconds: number;
  awaySeconds: number;
  focusScore: number;
}

export interface AnalyticsData {
  totalStudyTimeMinutes: number;
  focusedTimeMinutes: number;
  awayTimeMinutes: number;
  focusPercentage: number;
  aiQuestionsCount: number;
  documentsCount: number;
  quizSessionsCount: number;
  weeklyTrend: Array<{
    day: string;
    studyMin: number;
    focusMin: number;
  }>;
  scoreTrend: Array<{
    session: string;
    score: number;
  }>;
}

export interface SystemModelStatus {
  llmStatus: 'ready' | 'downloading' | 'not_installed';
  speechStatus: 'ready' | 'downloading' | 'not_installed';
  visionStatus: 'ready' | 'downloading' | 'not_installed';
  activeDevice: 'CPU' | 'GPU' | 'Engine' | string;
  deviceTarget: string;
  isEngineActive?: boolean;
  quantization: string;
  memoryUsageMb: number;
}

export interface AssignmentItem {
  id: string;
  title: string;
  subject: string;
  instructions?: string;
  total_maximum_marks: number;
  rubric_guidance?: string;
  expected_concepts: string[];
  questions: Array<{
    question_number: number;
    question_text: string;
    maximum_marks: number;
    topic: string;
    rubric?: string;
    model_answer?: string;
    key_concepts?: string[] | string;
    strictness?: 'strict' | 'balanced' | 'flexible' | string;
  }>;
  status: string;
  created_at: string;
  submission_count: number;
  pending_review_count: number;
  average_score?: number | null;
  assigned_students_count?: number;
  assigned_students?: Array<{ student_id: string; student_name: string; status: string }>;
}

export interface TeacherReviewQueueItem {
  id: string;
  student_name: string;
  assignment_id?: string | null;
  assignment_title: string;
  ai_suggested_score: number;
  teacher_score?: number | null;
  final_score?: number | null;
  total_maximum_marks: number;
  approval_status: 'pending' | 'approved' | 'modified';
  submitted_at: string;
  page_count: number;
  file_type: string;
  original_filename: string;
}

export interface TeacherDashboardStats {
  total_assignments: number;
  pending_reviews: number;
  completed_reviews: number;
  average_class_score: number;
  students_requiring_attention: number;
  strongest_topic?: string | null;
  weakest_topic?: string | null;
  topic_analytics: Array<{
    topic: string;
    average_percentage: number;
    question_count: number;
  }>;
  students_needing_support: Array<{
    submission_id: string;
    student_name: string;
    assignment_title: string;
    score: number;
    maximum_marks: number;
    percentage: number;
    primary_weakness?: string | null;
  }>;
}

// ---------------------------------------------------------------------------
// Authentication Types
// ---------------------------------------------------------------------------

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'TEACHER' | 'STUDENT';
  created_at?: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export interface StudentListItem {
  id: string;
  name: string;
  email: string;
  role: string;
}

// ---------------------------------------------------------------------------
// Student Assignment Types
// ---------------------------------------------------------------------------

export interface StudentAssignmentItem {
  id: string;
  title: string;
  subject: string;
  teacher_name: string;
  due_date?: string | null;
  total_maximum_marks: number;
  status: 'ASSIGNED' | 'IN_PROGRESS' | 'SUBMITTED' | 'UNDER_REVIEW' | 'EVALUATED' | 'APPROVED' | string;
  score?: number | null;
  final_score?: number | null;
  teacher_feedback?: string | null;
  submission_id?: string | null;
  assigned_at: string;
}

export interface StudentAssignmentDetail {
  id: string;
  title: string;
  subject: string;
  teacher_name: string;
  instructions?: string | null;
  due_date?: string | null;
  total_maximum_marks: number;
  questions: Array<{
    id?: string;
    question_number: number;
    question_text: string;
    question?: string;
    question_type?: string;
    maximum_marks: number;
    max_marks?: number;
    topic: string;
    rubric?: string;
  }>;
  status: string;
  submission_id?: string | null;
  is_submitted?: boolean;
  submitted_answers?: Record<string, string>;
}

export interface StudentResultListItem {
  submission_id: string;
  assignment_id?: string | null;
  assignment_title: string;
  subject: string;
  teacher_name: string;
  status: 'APPROVED' | 'UNDER_REVIEW' | 'SUBMITTED' | string;
  total_maximum_marks: number;
  final_score?: number | null;
  ai_suggested_score?: number | null;
  teacher_score?: number | null;
  percentage?: number | null;
  teacher_feedback?: string | null;
  question_count: number;
  submitted_at: string;
  evaluated_at?: string | null;
}

export interface TypedAnswerPayload {
  question_number: number;
  answer_text: string;
}

// ---------------------------------------------------------------------------
// Class Intelligence Types
// ---------------------------------------------------------------------------

export interface TopicPerformanceStatDetail {
  topic: string;
  number_of_students: number;
  number_of_questions: number;
  average_score: number;
  maximum_possible_score: number;
  average_percentage: number;
  students_above_threshold: number;
  students_below_threshold: number;
  common_learning_gaps: string[];
}

export interface IncorrectQuestionStat {
  question_number: number;
  question_text: string;
  topic: string;
  attempts: number;
  average_score: number;
  maximum_marks: number;
  low_score_count: number;
  failure_percentage: number;
}

export interface ConceptClarificationItem {
  concept: string;
  topic: string;
  class_performance: number;
  students_affected: number;
  total_students: number;
  common_mistake: string;
}

export interface ScoreDistribution {
  range_0_20: number;
  range_21_40: number;
  range_41_60: number;
  range_61_80: number;
  range_81_100: number;
}

export interface StudentSupportItem {
  student_id?: string | null;
  submission_id: string;
  student_name: string;
  assignment_title: string;
  score: number;
  maximum_marks: number;
  percentage: number;
  weakest_topic?: string | null;
  primary_weakness?: string | null;
  learning_gaps: string[];
  last_assessment?: string | null;
}

export interface ClassIntelligenceData {
  total_students: number;
  total_assessments: number;
  average_class_score: number;
  strongest_topic?: string | null;
  weakest_topic?: string | null;
  strongest_topics: TopicPerformanceStatDetail[];
  topics_needing_attention: TopicPerformanceStatDetail[];
  concepts_needing_clarification: ConceptClarificationItem[];
  most_frequently_incorrect_questions: IncorrectQuestionStat[];
  score_distribution: ScoreDistribution;
  students_needing_support: StudentSupportItem[];
  learning_gap_frequency: Array<{ gap: string; frequency: number; percentage: number }>;
  ai_teaching_insights?: string | null;
  remedial_recommendations: Array<{
    student_name: string;
    target_topic: string;
    action: string;
    priority: string;
  }>;
}

export interface TopicDrilldownData {
  topic: string;
  total_attempts: number;
  average_percentage: number;
  records: Array<{
    question_number: number;
    student_name: string;
    score: number;
    maximum_marks: number;
    percentage: number;
    learning_gap: string;
    feedback: string;
  }>;
}

export interface StudentDrilldownData {
  student_id: string;
  student_name: string;
  email: string;
  total_assigned: number;
  total_submitted: number;
  submissions: Array<{
    submission_id: string;
    assignment_id: string;
    title: string;
    score: number;
    maximum_marks: number;
    percentage: number;
    status: string;
    submitted_at: string;
  }>;
  topic_mastery: Array<{
    topic: string;
    percentage: number;
  }>;
}

