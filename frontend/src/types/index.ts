export * from './api';

export type TabType = 'dashboard' | 'tutor' | 'study' | 'focus' | 'analytics' | 'settings';

export type AIModelStatus = 'LOCAL_AI' | 'OFFLINE_MODE' | 'NOT_INSTALLED' | 'DEMO_MODE';

export type InferenceDevice = 'AUTO' | 'CPU' | 'GPU' | 'NPU';

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
  activeDevice: 'CPU' | 'GPU' | 'NPU';
  deviceTarget: 'Snapdragon X Elite / X Plus / Snapdragon X2' | 'Host CPU (Dev Environment)';
  isSnapdragonDetected: boolean;
  npuAvailable: boolean;
  quantization: string;
  memoryUsageMb: number;
}
