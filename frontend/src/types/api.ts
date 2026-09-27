export interface HealthResponse {
  status: string;
  service: string;
}

export interface RuntimeStatus {
  status: 'not_initialized' | 'initialized' | 'ready' | string;
  provider: string;
  environment?: string;
  ai_target?: string;
}

export interface ComponentStatus {
  status: 'not_initialized' | 'initialized' | 'ready' | 'downloading' | string;
  model: string | null;
  runtime?: string | null;
  target?: string | null;
}

export interface SnapdragonStatus {
  status: string;
  device: string;
  runtime: string;
  validated: boolean;
  qnn_available: boolean;
  optimization_status: string;
}

export interface TargetStatus {
  platform: string;
  development_environment: string;
}

export interface ModelStatusResponse {
  runtime: RuntimeStatus;
  llm: ComponentStatus;
  speech: ComponentStatus;
  vision: ComponentStatus;
  embeddings?: ComponentStatus;
  snapdragon?: SnapdragonStatus;
  target: TargetStatus;
}

export interface ApiError {
  error: string;
  message: string;
  statusCode?: number;
}

export interface ApiChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatRequest {
  message: string;
  conversation?: ApiChatMessage[];
}

export interface ChatResponse {
  reply: string;
  model: string;
  provider: string;
  device: string;
  latency_ms: number;
  tokens_per_second?: number;
  offline: boolean;
}

// Stage 5 & 6 Document & Study Types
export interface ApiDocument {
  id: string;
  filename: string;
  file_size: number;
  page_count: number;
  chunk_count: number;
  summary: string | null;
  key_takeaways: string[];
  created_at: string;
}

export interface ApiDocumentListResponse {
  documents: ApiDocument[];
  total: number;
}

export interface ApiSearchResult {
  chunk_id: string;
  page_number: number;
  content: string;
  score: number;
}

export interface ApiDocumentQARequest {
  question: string;
  top_k?: number;
}

export interface ApiDocumentQAResponse {
  reply: string;
  sources: ApiSearchResult[];
  latency_ms: number;
  tokens_per_second: number;
  device: string;
  offline: boolean;
}

export interface ApiDocumentSummaryResponse {
  document_id: string;
  summary: string;
  key_takeaways: string[];
  latency_ms: number;
  cached: boolean;
}

export interface ApiQuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface ApiQuizResponse {
  document_id: string;
  questions: ApiQuizQuestion[];
  latency_ms: number;
}

export interface ApiFlashcard {
  id: string;
  front: string;
  back: string;
  category: string;
}

export interface ApiFlashcardsResponse {
  document_id: string;
  flashcards: ApiFlashcard[];
  latency_ms: number;
}

// Stage 7 Focus Mode Types
export type FocusSessionState = 'NOT_STARTED' | 'FOCUSED' | 'NOT_DETECTED' | 'PAUSED' | 'COMPLETED';

export interface FocusSessionStatusResponse {
  session_id: string | null;
  state: FocusSessionState;
  started_at: string | null;
  ended_at: string | null;
  elapsed_seconds: number;
  present_seconds: number;
  not_detected_seconds: number;
  screen_facing_seconds: number;
  paused_seconds: number;
  focus_score: number;
}

export interface FocusSessionHistoryItem {
  id: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number;
  present_seconds: number;
  not_detected_seconds: number;
  screen_facing_seconds: number;
  focus_score: number;
  created_at: string;
}

export interface FocusSessionHistoryResponse {
  sessions: FocusSessionHistoryItem[];
  total: number;
}

export interface FocusFrameResponse {
  session_id: string | null;
  state: FocusSessionState;
  present: boolean;
  screen_facing: boolean;
  confidence: number;
  box: [number, number, number, number] | null;
  elapsed_seconds: number;
  present_seconds: number;
  not_detected_seconds: number;
  focus_score: number;
  inference_latency_ms: number;
  device: string;
}

// Stage 8 Speech & Analytics Types
export interface SpeechTranscribeResponse {
  text: string;
  language: string;
  duration_seconds: number;
  latency_ms: number;
  model: string;
  device: string;
  target_platform: string;
  offline: boolean;
}

export interface AnalyticsOverviewResponse {
  total_study_time_seconds: number;
  total_study_time_formatted: string;
  overall_focus_score: number;
  ai_questions_answered: number;
  documents_analyzed: number;
  focused_study_time_seconds: number;
  focused_study_time_formatted: string;
  away_study_time_seconds: number;
  away_study_time_formatted: string;
  quiz_sessions_completed: number;
  total_sessions_count: number;
}

export interface WeeklyStudyDay {
  day: string;
  date: string;
  totalMinutes: number;
  focusedMinutes: number;
  awayMinutes: number;
}

export interface SessionScoreItem {
  session: string;
  session_id: string;
  score: number;
  date: string;
}

export interface AnalyticsTrendsResponse {
  weekly_data: WeeklyStudyDay[];
  session_scores: SessionScoreItem[];
}

export interface AnalyticsExportData {
  exported_at: string;
  version: string;
  overview: AnalyticsOverviewResponse;
  focus_sessions: FocusSessionHistoryItem[];
  documents: Array<{
    id: string;
    filename: string;
    file_size: number;
    page_count: number;
    chunk_count: number;
    summary: string | null;
    key_takeaways: string[];
    created_at: string | null;
  }>;
  study_interactions: Array<{
    id: string;
    interaction_type: string;
    document_id?: string | null;
    latency_ms?: number | null;
    created_at: string | null;
  }>;
}

