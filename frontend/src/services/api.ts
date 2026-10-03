import type {
  HealthResponse,
  ModelStatusResponse,
  ChatRequest,
  ChatResponse,
  ApiDocument,
  ApiDocumentListResponse,
  ApiDocumentQARequest,
  ApiDocumentQAResponse,
  ApiDocumentSummaryResponse,
  ApiQuizResponse,
  ApiFlashcardsResponse,
  FocusSessionStatusResponse,
  FocusSessionHistoryResponse,
  FocusFrameResponse,
  SpeechTranscribeResponse,
  AnalyticsOverviewResponse,
  AnalyticsTrendsResponse,
  AnalyticsExportData,
  AssessmentUploadResponse,
  OCRVerifyRequest,
  OCRVerifyResponse,
  AssessmentEvaluationResponse,
  TeacherReviewRequest,
  AssessmentListItem,
  AssessmentAnalyticsResponse,
  AssignmentItem,
  TeacherReviewQueueItem,
  TeacherDashboardStats,
} from '../types';
const getApiBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl !== undefined && envUrl !== null) {
    return envUrl.replace(/\/+$/, '');
  }
  return import.meta.env.DEV ? 'http://127.0.0.1:8000' : '';
};

const API_BASE_URL = getApiBaseUrl();

class ApiService {
  private baseUrl: string;
  private defaultTimeout: number;

  constructor(baseUrl: string = API_BASE_URL, defaultTimeout: number = 4000) {
    this.baseUrl = baseUrl;
    this.defaultTimeout = defaultTimeout;
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}, customTimeout?: number): Promise<T> {
    const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    const controller = new AbortController();
    const timeout = customTimeout ?? this.defaultTimeout;
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...(options.headers || {}),
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorMessage = `Request failed with status ${response.status}`;
        try {
          const errorData = await response.json();
          if (errorData.detail) {
            if (typeof errorData.detail === 'object' && errorData.detail.message) {
              errorMessage = errorData.detail.message;
            } else if (typeof errorData.detail === 'string') {
              errorMessage = errorData.detail;
            }
          } else if (errorData.message) {
            errorMessage = errorData.message;
          }
        } catch {
          // Response body was not JSON
        }
        throw new Error(errorMessage);
      }

      return (await response.json()) as T;
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          throw new Error('Connection timed out. Model inference took longer than expected.');
        }
        throw err;
      }
      throw new Error('An unknown network error occurred.');
    }
  }

  /**
   * Performs GET /api/health
   */
  public async getHealth(): Promise<HealthResponse> {
    return this.request<HealthResponse>('/api/health');
  }

  /**
   * Performs GET /api/model/status
   */
  public async getModelStatus(): Promise<ModelStatusResponse> {
    return this.request<ModelStatusResponse>('/api/model/status');
  }

  /**
   * Performs POST /api/chat with local LLM
   */
  public async sendChatMessage(payload: ChatRequest): Promise<ChatResponse> {
    return this.request<ChatResponse>(
      '/api/chat',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      60000 // 60s timeout for on-device CPU inference
    );
  }

  /**
   * Uploads PDF file via multipart/form-data to POST /api/documents/upload
   */
  public async uploadDocument(file: File): Promise<ApiDocument> {
    const formData = new FormData();
    formData.append('file', file);

    const url = `${this.baseUrl}/api/documents/upload`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s for parsing + embedding

    try {
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorMessage = `Upload failed with status ${response.status}`;
        try {
          const errData = await response.json();
          if (errData.detail) errorMessage = errData.detail;
        } catch {
          // Non-json response
        }
        throw new Error(errorMessage);
      }

      return (await response.json()) as ApiDocument;
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          throw new Error('Upload timed out during on-device parsing and embedding.');
        }
        throw err;
      }
      throw new Error('Upload failed due to a network error.');
    }
  }

  /**
   * Lists indexed documents: GET /api/documents
   */
  public async getDocuments(): Promise<ApiDocumentListResponse> {
    return this.request<ApiDocumentListResponse>('/api/documents');
  }

  /**
   * Retrieves single document: GET /api/documents/{id}
   */
  public async getDocument(docId: string): Promise<ApiDocument> {
    return this.request<ApiDocument>(`/api/documents/${docId}`);
  }

  /**
   * Deletes document and its chunks: DELETE /api/documents/{id}
   */
  public async deleteDocument(docId: string): Promise<void> {
    const url = `${this.baseUrl}/api/documents/${docId}`;
    const response = await fetch(url, { method: 'DELETE' });
    if (!response.ok && response.status !== 204) {
      throw new Error(`Failed to delete document (${response.status})`);
    }
  }

  /**
   * Document-grounded Q&A: POST /api/documents/{id}/qa
   */
  public async askDocumentQA(docId: string, payload: ApiDocumentQARequest): Promise<ApiDocumentQAResponse> {
    return this.request<ApiDocumentQAResponse>(
      `/api/documents/${docId}/qa`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      60000
    );
  }

  /**
   * Document summarization: POST /api/documents/{id}/summarize
   */
  public async summarizeDocument(docId: string, refresh: boolean = false): Promise<ApiDocumentSummaryResponse> {
    return this.request<ApiDocumentSummaryResponse>(
      `/api/documents/${docId}/summarize?refresh=${refresh}`,
      { method: 'POST' },
      60000
    );
  }

  /**
   * Quiz synthesis: POST /api/documents/{id}/quiz
   */
  public async generateQuiz(docId: string): Promise<ApiQuizResponse> {
    return this.request<ApiQuizResponse>(
      `/api/documents/${docId}/quiz`,
      { method: 'POST' },
      60000
    );
  }

  /**
   * Flashcard synthesis: POST /api/documents/{id}/flashcards
   */
  public async generateFlashcards(docId: string): Promise<ApiFlashcardsResponse> {
    return this.request<ApiFlashcardsResponse>(
      `/api/documents/${docId}/flashcards`,
      { method: 'POST' },
      60000
    );
  }

  // --- Stage 7 Focus Mode Methods ---

  /**
   * Starts a new focus tracking session: POST /api/focus/start
   */
  public async startFocusSession(): Promise<FocusSessionStatusResponse> {
    return this.request<FocusSessionStatusResponse>('/api/focus/start', { method: 'POST' });
  }

  /**
   * Stops the active focus session and persists metrics to SQLite: POST /api/focus/stop
   */
  public async stopFocusSession(): Promise<FocusSessionStatusResponse> {
    return this.request<FocusSessionStatusResponse>('/api/focus/stop', { method: 'POST' });
  }

  /**
   * Toggles pause on the active focus session: POST /api/focus/pause
   */
  public async pauseFocusSession(): Promise<FocusSessionStatusResponse> {
    return this.request<FocusSessionStatusResponse>('/api/focus/pause', { method: 'POST' });
  }

  /**
   * Retrieves live status of active focus session: GET /api/focus/status
   */
  public async getFocusStatus(): Promise<FocusSessionStatusResponse> {
    return this.request<FocusSessionStatusResponse>('/api/focus/status');
  }

  /**
   * Retrieves completed sessions from SQLite: GET /api/focus/history
   */
  public async getFocusHistory(): Promise<FocusSessionHistoryResponse> {
    return this.request<FocusSessionHistoryResponse>('/api/focus/history');
  }

  /**
   * Sends an in-memory frame to the local backend for UltraFace inference: POST /api/focus/frame
   */
  public async sendFocusFrame(frameBlob: Blob): Promise<FocusFrameResponse> {
    const formData = new FormData();
    formData.append('file', frameBlob, 'frame.jpg');

    const url = `${this.baseUrl}/api/focus/frame`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3s frame timeout

    try {
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errText = `Frame processing failed: ${response.status}`;
        try {
          const json = await response.json();
          if (json.detail) errText = json.detail;
        } catch {}
        throw new Error(errText);
      }

      return (await response.json()) as FocusFrameResponse;
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      if (err instanceof Error) throw err;
      throw new Error('Frame network error');
    }
  }

  // --- Stage 8 Speech Engine Methods ---

  /**
   * Transcribes student speech audio in-memory via faster-whisper: POST /api/speech/transcribe
   */
  public async transcribeSpeech(audioBlob: Blob): Promise<SpeechTranscribeResponse> {
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.webm');
    formData.append('language', 'en');

    const url = `${this.baseUrl}/api/speech/transcribe`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout for Whisper INT8 CPU inference

    try {
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errText = `Speech transcription failed: ${response.status}`;
        try {
          const json = await response.json();
          if (json.detail) {
            errText = typeof json.detail === 'string' ? json.detail : JSON.stringify(json.detail);
          }
        } catch {}
        throw new Error(errText);
      }

      return (await response.json()) as SpeechTranscribeResponse;
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          throw new Error('Voice transcription timed out.');
        }
        throw err;
      }
      throw new Error('Speech transcription network error');
    }
  }

  // --- Stage 8 Study Analytics & Persistence Methods ---

  /**
   * Fetches overall aggregated study statistics from SQLite: GET /api/analytics/overview
   */
  public async getAnalyticsOverview(): Promise<AnalyticsOverviewResponse> {
    return this.request<AnalyticsOverviewResponse>('/api/analytics/overview');
  }

  /**
   * Fetches weekly study breakdown and session trends: GET /api/analytics/trends
   */
  public async getAnalyticsTrends(): Promise<AnalyticsTrendsResponse> {
    return this.request<AnalyticsTrendsResponse>('/api/analytics/trends');
  }

  /**
   * Fetches full export data bundle: GET /api/analytics/export
   */
  public async exportAnalyticsData(): Promise<AnalyticsExportData> {
    return this.request<AnalyticsExportData>('/api/analytics/export');
  }

  /**
   * Triggers download of the local study database export as a JSON file
   */
  public async downloadExportFile(): Promise<void> {
    const url = `${this.baseUrl}/api/analytics/export/download`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to export data: ${response.status}`);
    }
    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `evallq_study_export_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);
  }

  // =========================================================================
  // ASSESSMENT INTELLIGENCE METHODS
  // =========================================================================

  public getAssessmentPreviewUrl(submissionId: string, page: number = 1): string {
    return `${this.baseUrl}/api/assessment/${encodeURIComponent(submissionId)}/preview?page=${page}`;
  }

  public async uploadAssessment(
    file: File,
    studentName?: string,
    assignmentId?: string
  ): Promise<AssessmentUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    if (studentName && studentName.trim()) {
      formData.append('student_name', studentName.trim());
    }
    if (assignmentId && assignmentId.trim()) {
      formData.append('assignment_id', assignmentId.trim());
    }

    const url = `${this.baseUrl}/api/assessment/upload`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 120s for full OCR

    try {
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      if (!response.ok) {
        let errDetail = `Server returned ${response.status}`;
        try {
          const errJson = await response.json();
          if (errJson?.detail) errDetail = errJson.detail;
        } catch {
          // fallback to status text
        }
        throw new Error(errDetail);
      }
      return (await response.json()) as AssessmentUploadResponse;
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          throw new Error('Assessment upload timed out. OCR took longer than expected.');
        }
        throw err;
      }
      throw new Error('An unknown error occurred during assessment upload.');
    }
  }

  public async getAssessment(submissionId: string): Promise<any> {
    return this.request<any>(`/api/assessment/${encodeURIComponent(submissionId)}`);
  }

  public async verifyAssessmentOCR(submissionId: string, data: OCRVerifyRequest): Promise<OCRVerifyResponse> {
    return this.request<OCRVerifyResponse>(
      `/api/assessment/${encodeURIComponent(submissionId)}/verify-ocr`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  }

  public async evaluateAssessment(submissionId: string, rubricGuidance?: string): Promise<AssessmentEvaluationResponse> {
    const query = rubricGuidance ? `?rubric_guidance=${encodeURIComponent(rubricGuidance)}` : '';
    return this.request<AssessmentEvaluationResponse>(
      `/api/assessment/${encodeURIComponent(submissionId)}/evaluate${query}`,
      {
        method: 'POST',
      },
      120000 // 120s for multi-question LLM grading
    );
  }

  public async reviewAssessment(submissionId: string, data: TeacherReviewRequest): Promise<AssessmentEvaluationResponse> {
    return this.request<AssessmentEvaluationResponse>(
      `/api/assessment/${encodeURIComponent(submissionId)}/review`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  }

  public async getAssessmentList(limit: number = 20): Promise<AssessmentListItem[]> {
    return this.request<AssessmentListItem[]>(`/api/assessment/list/all?limit=${limit}`);
  }

  public async getAssessmentAnalytics(): Promise<AssessmentAnalyticsResponse> {
    return this.request<AssessmentAnalyticsResponse>('/api/assessment/analytics/summary');
  }

  // =========================================================================
  // Teacher Intelligence API
  // =========================================================================

  public async createAssignment(data: {
    title: string;
    subject: string;
    instructions?: string;
    total_maximum_marks: number;
    rubric_guidance?: string;
    expected_concepts?: string[];
    questions?: Array<{
      question_number: number;
      question_text: string;
      maximum_marks: number;
      topic: string;
      rubric?: string;
    }>;
  }): Promise<AssignmentItem> {
    return this.request<AssignmentItem>('/api/teacher/assignments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public async getAssignments(): Promise<AssignmentItem[]> {
    return this.request<AssignmentItem[]>('/api/teacher/assignments');
  }

  public async getAssignment(assignmentId: string): Promise<AssignmentItem> {
    return this.request<AssignmentItem>(`/api/teacher/assignments/${encodeURIComponent(assignmentId)}`);
  }

  public async getTeacherReviewQueue(): Promise<TeacherReviewQueueItem[]> {
    return this.request<TeacherReviewQueueItem[]>('/api/teacher/review-queue');
  }

  public async getTeacherReviewSubmission(submissionId: string): Promise<any> {
    return this.request<any>(`/api/teacher/review/${encodeURIComponent(submissionId)}`);
  }

  public async saveTeacherScore(submissionId: string, data: {
    teacher_score?: number;
    teacher_feedback?: string;
    question_updates?: Array<{
      question_id: string;
      teacher_marks: number;
      teacher_feedback?: string;
    }>;
    approve?: boolean;
  }): Promise<any> {
    return this.request<any>(`/api/teacher/review/${encodeURIComponent(submissionId)}/score`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public async approveTeacherSubmission(submissionId: string): Promise<any> {
    return this.request<any>(`/api/teacher/review/${encodeURIComponent(submissionId)}/approve`, {
      method: 'POST',
    });
  }

  public async getTeacherDashboardStats(): Promise<TeacherDashboardStats> {
    return this.request<TeacherDashboardStats>('/api/teacher/dashboard-stats');
  }
}

export const api = new ApiService();
