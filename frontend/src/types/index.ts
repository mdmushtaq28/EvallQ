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
  }>;
  status: string;
  created_at: string;
  submission_count: number;
  pending_review_count: number;
  average_score?: number | null;
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
