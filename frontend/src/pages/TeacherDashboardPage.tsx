import React, { useState, useEffect, useCallback } from 'react';
import {
  ClipboardList,
  CheckSquare,
  BarChart3,
  Plus,
  RefreshCw,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Award,
  ChevronLeft,
  ChevronRight,
  Save,
  Check,
  FileText,
  ArrowLeft,
  Users,
  Clock,
  GraduationCap,
  Percent,
} from 'lucide-react';
import { Card, CardHeader } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import type {
  AssignmentItem,
  TeacherReviewQueueItem,
  TeacherDashboardStats,
} from '../types';

export const TeacherDashboardPage: React.FC = () => {
  const { activeTab, setActiveTab, selectedTeacherSubmissionId, setSelectedTeacherSubmissionId } = useApp();

  // Internal view state: dashboard, assignments, review, analytics
  const [currentView, setCurrentView] = useState<'dashboard' | 'assignments' | 'review' | 'analytics'>('dashboard');

  // Live Data States
  const [stats, setStats] = useState<TeacherDashboardStats | null>(null);
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [reviewQueue, setReviewQueue] = useState<TeacherReviewQueueItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Assignment Modal State
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [newInstructions, setNewInstructions] = useState('');
  const [newRubric, setNewRubric] = useState('');
  const [newConcepts, setNewConcepts] = useState('');
  const [newQuestions, setNewQuestions] = useState<Array<{
    question_number: number;
    question_text: string;
    maximum_marks: number;
    topic: string;
    rubric?: string;
  }>>([
    { question_number: 1, question_text: '', maximum_marks: 10, topic: 'General' },
    { question_number: 2, question_text: '', maximum_marks: 10, topic: 'General' },
  ]);
  const [creatingAssignment, setCreatingAssignment] = useState<boolean>(false);

  // Active Review State
  const [activeSubmissionId, setActiveSubmissionId] = useState<string | null>(selectedTeacherSubmissionId);
  const [reviewData, setReviewData] = useState<any | null>(null);
  const [reviewLoading, setReviewLoading] = useState<boolean>(false);
  const [reviewPage, setReviewPage] = useState<number>(1);
  const [showOcrText, setShowOcrText] = useState<boolean>(false);
  const [teacherScoreInput, setTeacherScoreInput] = useState<number | ''>('');
  const [teacherFeedbackInput, setTeacherFeedbackInput] = useState<string>('');
  const [questionScores, setQuestionScores] = useState<Record<string, number>>({});
  const [questionFeedbacks, setQuestionFeedbacks] = useState<Record<string, string>>({});
  const [savingScore, setSavingScore] = useState<boolean>(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // Teacher OCR Verification & Correction state
  const [editableOcr, setEditableOcr] = useState<string>('');
  const [isEditingOcr, setIsEditingOcr] = useState<boolean>(false);
  const [savingOcr, setSavingOcr] = useState<boolean>(false);
  const [ocrSaveMsg, setOcrSaveMsg] = useState<string | null>(null);

  // Sync with AppContext activeTab
  useEffect(() => {
    if (activeTab === 'teacher-assignments') {
      setCurrentView('assignments');
    } else if (activeTab === 'teacher-review') {
      setCurrentView('review');
    } else if (activeTab === 'teacher-analytics') {
      setCurrentView('analytics');
    } else {
      setCurrentView('dashboard');
    }
  }, [activeTab]);

  // Sync selected review submission
  useEffect(() => {
    if (selectedTeacherSubmissionId) {
      setActiveSubmissionId(selectedTeacherSubmissionId);
      setCurrentView('review');
      loadReviewSubmission(selectedTeacherSubmissionId);
    }
  }, [selectedTeacherSubmissionId]);

  // Load all dashboard metrics
  const loadDashboardData = useCallback(async () => {
    try {
      setError(null);
      const [statsRes, asgnRes, queueRes] = await Promise.all([
        api.getTeacherDashboardStats(),
        api.getAssignments(),
        api.getTeacherReviewQueue(),
      ]);
      setStats(statsRes);
      setAssignments(asgnRes);
      setReviewQueue(queueRes);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load teacher dashboard data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  // Load individual submission for review
  const loadReviewSubmission = async (subId: string) => {
    setReviewLoading(true);
    setError(null);
    setActionSuccessMsg(null);
    try {
      const data = await api.getTeacherReviewSubmission(subId);
      setReviewData(data);
      setReviewPage(1);
      setTeacherScoreInput(data.teacher_score ?? data.ai_suggested_score ?? 0);
      setTeacherFeedbackInput(data.teacher_feedback || '');
      setEditableOcr(data.verified_ocr_text || '');
      setIsEditingOcr(false);
      setOcrSaveMsg(null);

      // Initialize question-wise scores
      const qScores: Record<string, number> = {};
      const qFeedbacks: Record<string, string> = {};
      if (data.questions && Array.isArray(data.questions)) {
        data.questions.forEach((q: any) => {
          qScores[q.id] = q.teacher_marks ?? q.suggested_marks ?? 0;
          qFeedbacks[q.id] = q.teacher_feedback || '';
        });
      }
      setQuestionScores(qScores);
      setQuestionFeedbacks(qFeedbacks);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load submission for review.');
    } finally {
      setReviewLoading(false);
    }
  };

  const handleSaveOcrText = async () => {
    if (!activeSubmissionId) return;
    setSavingOcr(true);
    setOcrSaveMsg(null);
    try {
      await api.verifyAssessmentOCR(activeSubmissionId, {
        verified_ocr_text: editableOcr,
      });
      setOcrSaveMsg('✓ Corrected OCR text verified & saved.');
      setIsEditingOcr(false);
      if (reviewData) {
        setReviewData({ ...reviewData, verified_ocr_text: editableOcr });
      }
      setTimeout(() => setOcrSaveMsg(null), 4000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to save corrected OCR text.');
    } finally {
      setSavingOcr(false);
    }
  };

  const handleOpenReview = (submissionId: string) => {
    setSelectedTeacherSubmissionId(submissionId);
    setActiveSubmissionId(submissionId);
    setCurrentView('review');
    loadReviewSubmission(submissionId);
  };

  const handleAddQuestionRow = () => {
    setNewQuestions(prev => [
      ...prev,
      {
        question_number: prev.length + 1,
        question_text: '',
        maximum_marks: 5,
        topic: 'General',
      },
    ]);
  };

  const handleRemoveQuestionRow = (idx: number) => {
    setNewQuestions(prev => prev.filter((_, i) => i !== idx).map((q, i) => ({ ...q, question_number: i + 1 })));
  };

  const handleCreateAssignmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newSubject.trim()) {
      alert('Please provide assignment title and subject.');
      return;
    }
    setCreatingAssignment(true);
    try {
      const conceptsList = newConcepts
        .split(',')
        .map(c => c.trim())
        .filter(c => c.length > 0);

      const calculatedTotal = newQuestions.reduce((acc, q) => acc + (Number(q.maximum_marks) || 0), 0);
      const totalMarks = calculatedTotal > 0 ? calculatedTotal : 20;

      await api.createAssignment({
        title: newTitle.trim(),
        subject: newSubject.trim(),
        instructions: newInstructions.trim() || undefined,
        total_maximum_marks: totalMarks,
        rubric_guidance: newRubric.trim() || undefined,
        expected_concepts: conceptsList,
        questions: newQuestions.filter(q => q.question_text.trim().length > 0),
      });

      setShowCreateModal(false);
      setNewTitle('');
      setNewSubject('');
      setNewInstructions('');
      setNewRubric('');
      setNewConcepts('');
      loadDashboardData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to create assignment.');
    } finally {
      setCreatingAssignment(false);
    }
  };

  // Save Teacher Score Changes
  const handleSaveScoreChanges = async (approveAfter: boolean = false) => {
    if (!activeSubmissionId) return;
    setSavingScore(true);
    setActionSuccessMsg(null);
    try {
      const questionUpdates = Object.entries(questionScores).map(([qid, marks]) => ({
        question_id: qid,
        teacher_marks: Number(marks) || 0,
        teacher_feedback: questionFeedbacks[qid] || '',
      }));

      await api.saveTeacherScore(activeSubmissionId, {
        teacher_score: teacherScoreInput === '' ? undefined : Number(teacherScoreInput),
        teacher_feedback: teacherFeedbackInput,
        question_updates: questionUpdates,
        approve: approveAfter,
      });

      setActionSuccessMsg(
        approveAfter
          ? '✓ Submission approved! Final score locked to teacher evaluation.'
          : '✓ Teacher scores and feedback saved successfully.'
      );

      // Refresh review submission data
      loadReviewSubmission(activeSubmissionId);
      loadDashboardData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to save teacher scores.');
    } finally {
      setSavingScore(false);
    }
  };

  if (loading && !stats && !error) {
    return (
      <div className="py-24 text-center space-y-3">
        <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin mx-auto" />
        <p className="text-sm text-slate-500">Loading Teacher Dashboard data...</p>
      </div>
    );
  }

  // =========================================================================
  // VIEW: DEDICATED TWO-COLUMN REVIEWER
  // =========================================================================
  if (currentView === 'review') {
    return (
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Navigation / Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              icon={<ArrowLeft className="w-4 h-4" />}
              onClick={() => {
                setCurrentView('dashboard');
                setActiveTab('teacher-dashboard');
                setSelectedTeacherSubmissionId(null);
              }}
            >
              Back to Dashboard
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="accent" size="sm">
                  Teacher Evaluation Studio
                </Badge>
                {reviewData && (
                  <Badge
                    variant={
                      reviewData.approval_status === 'approved'
                        ? 'success'
                        : reviewData.approval_status === 'modified'
                        ? 'brand'
                        : 'warning'
                    }
                    size="sm"
                  >
                    {reviewData.approval_status.toUpperCase()}
                  </Badge>
                )}
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                {reviewData ? `${reviewData.student_name} — ${reviewData.assignment_title}` : 'Submission Review'}
              </h2>
            </div>
          </div>

          {/* Quick Submission Selector if multiple in queue */}
          {reviewQueue.length > 1 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Queue:</span>
              <select
                value={activeSubmissionId || ''}
                onChange={e => handleOpenReview(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-800 dark:text-slate-200"
              >
                {reviewQueue.map(q => (
                  <option key={q.id} value={q.id}>
                    {q.student_name} - {q.assignment_title} ({q.approval_status})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Action success alert */}
        {actionSuccessMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-sm font-medium flex items-center justify-between">
            <span>{actionSuccessMsg}</span>
            <button onClick={() => setActionSuccessMsg(null)} className="text-xs opacity-70 hover:opacity-100">
              ✕
            </button>
          </div>
        )}

        {reviewLoading ? (
          <div className="p-12 text-center text-slate-500">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-500 mb-2" />
            <p>Loading authentic submission data and student responses...</p>
          </div>
        ) : !reviewData ? (
          <div className="p-12 text-center rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
              No Submission Selected
            </h3>
            <p className="text-sm text-slate-500 mt-1 mb-4">
              Select an item from the review queue to begin human-in-the-loop verification.
            </p>
            <Button variant="primary" onClick={() => setCurrentView('dashboard')}>
              Go to Review Queue
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* ================================================================= */}
            {/* LEFT COLUMN: ORIGINAL STUDENT SUBMISSION PREVIEW & OCR */}
            {/* ================================================================= */}
            <div className="lg:col-span-5 space-y-4">
              <Card>
                <CardHeader
                  title="Original Student Submission"
                  subtitle={`${reviewData.original_filename} • Page ${reviewPage} of ${reviewData.page_count}`}
                  icon={<FileText className="w-5 h-5 text-indigo-400" />}
                  action={
                    reviewData.page_count > 1 && (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={reviewPage <= 1}
                          onClick={() => setReviewPage(p => Math.max(1, p - 1))}
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <span className="text-xs font-mono font-medium px-1.5 text-slate-600 dark:text-slate-300">
                          {reviewPage} / {reviewData.page_count}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={reviewPage >= reviewData.page_count}
                          onClick={() => setReviewPage(p => Math.min(reviewData.page_count, p + 1))}
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    )
                  }
                />

                {/* File Image Preview Frame */}
                <div className="relative rounded-xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center min-h-[380px] max-h-[550px]">
                  <img
                    src={api.getAssessmentPreviewUrl(reviewData.submission_id, reviewPage)}
                    alt={`Submission Page ${reviewPage}`}
                    className="max-h-[530px] w-auto object-contain"
                    onError={e => {
                      // Fallback placeholder if image load fails
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                  <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded bg-black/70 backdrop-blur-sm text-[11px] font-mono text-slate-300 border border-white/10">
                    Source: {reviewData.original_filename}
                  </div>
                </div>

                {/* Submission Meta & OCR Toggle & Teacher Editing */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>
                      OCR Engine: <strong className="text-slate-700 dark:text-slate-300">Tesseract Local OCR</strong>
                    </span>
                    <span>
                      Confidence: <strong className="text-emerald-500">{Math.round((reviewData.ocr_confidence || 0.95) * 100)}%</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs"
                      onClick={() => setShowOcrText(!showOcrText)}
                    >
                      {showOcrText ? 'Hide OCR Text' : 'View Extracted OCR Text'}
                    </Button>
                    {showOcrText && (
                      <Button
                        variant={isEditingOcr ? 'secondary' : 'outline'}
                        size="sm"
                        className="text-xs"
                        onClick={() => setIsEditingOcr(!isEditingOcr)}
                      >
                        {isEditingOcr ? 'Cancel Edit' : 'Edit OCR'}
                      </Button>
                    )}
                  </div>

                  {ocrSaveMsg && (
                    <div className="p-2 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
                      {ocrSaveMsg}
                    </div>
                  )}

                  {showOcrText && (
                    <div className="space-y-2">
                      {isEditingOcr ? (
                        <div className="space-y-2">
                          <textarea
                            rows={6}
                            value={editableOcr}
                            onChange={e => setEditableOcr(e.target.value)}
                            className="w-full p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-indigo-400 text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            placeholder="Edit extracted OCR text here..."
                          />
                          <Button
                            variant="primary"
                            size="sm"
                            className="w-full text-xs"
                            disabled={savingOcr}
                            onClick={handleSaveOcrText}
                          >
                            {savingOcr ? 'Saving Verified OCR...' : 'Save Verified OCR Text'}
                          </Button>
                        </div>
                      ) : (
                        <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-700 dark:text-slate-300 max-h-48 overflow-y-auto whitespace-pre-wrap">
                          {reviewData.verified_ocr_text || 'No raw OCR text available.'}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Card>

              {/* Topic Performance Summary Card */}
              {reviewData.topic_performance && Object.keys(reviewData.topic_performance).length > 0 && (
                <Card>
                  <CardHeader
                    title="Student Topic Mastery"
                    subtitle="Aggregated from assessment questions"
                    icon={<BarChart3 className="w-5 h-5 text-indigo-400" />}
                  />
                  <div className="space-y-2.5 pt-1 text-xs">
                    {Object.entries(reviewData.topic_performance).map(([topic, data]: [string, any]) => {
                      const pct = Math.round(data.percentage || 0);
                      return (
                        <div key={topic} className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-slate-800 dark:text-slate-200">{topic}</span>
                            <span className="font-mono text-slate-500">{data.obtained} / {data.maximum} ({pct}%)</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                pct >= 80 ? 'bg-emerald-500' : pct >= 60 ? 'bg-indigo-500' : 'bg-rose-500'
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              )}
            </div>

            {/* ================================================================= */}
            {/* RIGHT COLUMN: EVALUATION, SCORE OVERRIDE & TEACHER FEEDBACK */}
            {/* ================================================================= */}
            <div className="lg:col-span-7 space-y-5">
              {/* Scoring Authority Banner */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-900/40 via-slate-900 to-slate-900 border border-indigo-500/20 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wider block mb-1">
                    Scoring & Teacher Authority
                  </span>
                  <div className="flex items-center gap-3">
                    <div>
                      <span className="text-xs text-slate-400 block">AI Suggested Score</span>
                      <span className="text-xl font-bold font-mono text-slate-300">
                        {reviewData.ai_suggested_score} / {reviewData.total_maximum_marks}
                      </span>
                    </div>
                    <div className="text-slate-600 dark:text-slate-700 text-2xl font-light">→</div>
                    <div>
                      <span className="text-xs text-indigo-300 block font-semibold">Teacher Final Score</span>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          max={reviewData.total_maximum_marks}
                          value={teacherScoreInput}
                          onChange={e => setTeacherScoreInput(e.target.value === '' ? '' : parseFloat(e.target.value))}
                          className="w-20 px-2 py-1 text-lg font-bold font-mono rounded bg-slate-800 border border-indigo-500/50 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <span className="text-sm font-mono text-slate-400">/ {reviewData.total_maximum_marks}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<Save className="w-4 h-4" />}
                    disabled={savingScore}
                    onClick={() => handleSaveScoreChanges(false)}
                  >
                    Save Draft
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    icon={<Check className="w-4 h-4" />}
                    disabled={savingScore}
                    onClick={() => handleSaveScoreChanges(true)}
                  >
                    {savingScore ? 'Saving...' : 'Approve & Finalize'}
                  </Button>
                </div>
              </div>

              {/* Questions List */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    Question-by-Question Evaluation ({reviewData.questions?.length || 0})
                  </h3>
                  <span className="text-xs text-slate-500">
                    Adjust marks or feedback for individual questions below
                  </span>
                </div>

                {reviewData.questions && reviewData.questions.length > 0 ? (
                  reviewData.questions.map((q: any) => {
                    const currentMarks = questionScores[q.id] ?? q.suggested_marks ?? 0;
                    return (
                      <Card key={q.id} className="border-l-4 border-l-indigo-500">
                        <div className="space-y-3">
                          {/* Question Header */}
                          <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded text-xs font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                Question {q.question_number}
                              </span>
                              <span className="text-xs font-medium text-slate-500">Topic: {q.topic}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant={
                                  q.rubric_match === 'Complete'
                                    ? 'success'
                                    : q.rubric_match === 'Incorrect'
                                    ? 'danger'
                                    : 'warning'
                                }
                                size="sm"
                              >
                                {q.rubric_match || 'Evaluated'}
                              </Badge>
                              <span className="text-xs font-mono text-slate-400">
                                Max: {q.maximum_marks} pts
                              </span>
                            </div>
                          </div>

                          {/* Question Text */}
                          <div>
                            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                              Question Prompt:
                            </span>
                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                              {q.question_text}
                            </p>
                          </div>

                          {/* Student OCR Answer */}
                          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                            <span className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wider block mb-1">
                              Student's Answer (from actual OCR):
                            </span>
                            <p className="text-xs font-mono text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                              {q.student_answer || '(No answer text extracted)'}
                            </p>
                          </div>

                          {/* AI Suggested Evaluation Grid */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                              <span className="font-semibold text-slate-500 block mb-0.5">AI Reasoning</span>
                              <p className="text-slate-700 dark:text-slate-300">{q.reasoning || q.feedback || 'Fair demonstration of concepts.'}</p>
                            </div>

                            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                              <span className="font-semibold text-rose-500 dark:text-rose-400 block mb-0.5">Identified Learning Gap</span>
                              <p className="text-slate-700 dark:text-slate-300">{q.learning_gap || 'No significant gap identified.'}</p>
                            </div>
                          </div>

                          {/* Teacher Score Override & Feedback row */}
                          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                            <div>
                              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                                Teacher Marks
                              </label>
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="number"
                                  step="0.5"
                                  min="0"
                                  max={q.maximum_marks}
                                  value={currentMarks}
                                  onChange={e => {
                                    const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                                    setQuestionScores(prev => ({ ...prev, [q.id]: val }));
                                    // Recalculate total
                                    const updated = { ...questionScores, [q.id]: val };
                                    const sum = (Object.values(updated) as number[]).reduce((a: number, b: number) => a + b, 0);
                                    setTeacherScoreInput(Math.round(sum * 10) / 10);
                                  }}
                                  className="w-20 px-2 py-1 text-sm font-bold font-mono rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                                />
                                <span className="text-xs text-slate-500">/ {q.maximum_marks}</span>
                                <span className="text-[11px] text-slate-400 ml-1 font-mono">
                                  (AI: {q.suggested_marks})
                                </span>
                              </div>
                            </div>

                            <div className="sm:col-span-2">
                              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                                Teacher Comments for Question
                              </label>
                              <input
                                type="text"
                                placeholder="Add specific feedback or rubric note..."
                                value={questionFeedbacks[q.id] || ''}
                                onChange={e => {
                                  const val = e.target.value;
                                  setQuestionFeedbacks(prev => ({ ...prev, [q.id]: val }));
                                }}
                                className="w-full px-2.5 py-1 text-xs rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                              />
                            </div>
                          </div>
                        </div>
                      </Card>
                    );
                  })
                ) : (
                  <div className="p-6 text-center rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-500">
                    No questions extracted for this assessment.
                  </div>
                )}
              </div>

              {/* Overall Teacher Feedback */}
              <Card>
                <CardHeader
                  title="Overall Teacher Feedback"
                  subtitle="This feedback is visible to the student alongside their final score"
                  icon={<Award className="w-5 h-5 text-indigo-400" />}
                />
                <div className="space-y-3 pt-1">
                  <textarea
                    rows={3}
                    placeholder="Enter comprehensive constructive remarks for the student..."
                    value={teacherFeedbackInput}
                    onChange={e => setTeacherFeedbackInput(e.target.value)}
                    className="w-full p-3 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed"
                  />

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      icon={<Save className="w-4 h-4" />}
                      disabled={savingScore}
                      onClick={() => handleSaveScoreChanges(false)}
                    >
                      Save Score & Feedback
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      icon={<CheckCircle2 className="w-4 h-4" />}
                      disabled={savingScore}
                      onClick={() => handleSaveScoreChanges(true)}
                    >
                      Approve Assessment
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // VIEW: MAIN TEACHER DASHBOARD & ASSIGNMENTS
  // =========================================================================
  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-900/60 via-slate-900 to-slate-900 border border-indigo-500/20 p-6 lg:p-8">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5" />
                Instructor Intelligence Suite
              </span>
              <Badge variant="accent" size="sm">
                TEACHER MODE
              </Badge>
            </div>
            <h2 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
              Classroom Assessment Operations
            </h2>
            <p className="mt-1 text-sm text-slate-300 font-medium">
              Review AI-evaluated student assessments, override scoring, and design curriculum rubrics.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              icon={<RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />}
              onClick={handleRefresh}
            >
              Refresh
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => setShowCreateModal(true)}
            >
              Create Assignment
            </Button>
          </div>
        </div>
      </div>

      {/* Error Notice */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-sm flex items-center justify-between">
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            Retry
          </Button>
        </div>
      )}

      {/* 1. OVERVIEW METRICS STRIP */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
        <Card className="p-4 bg-white dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Assignments</span>
            <ClipboardList className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-2 font-mono">
            {stats ? stats.total_assignments : '—'}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Active course rubrics</span>
        </Card>

        <Card className="p-4 bg-white dark:bg-slate-900 border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Pending Reviews</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 mt-2 font-mono">
            {stats ? stats.pending_reviews : '—'}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Awaiting teacher sign-off</span>
        </Card>

        <Card className="p-4 bg-white dark:bg-slate-900 border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Completed Reviews</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-2 font-mono">
            {stats ? stats.completed_reviews : '—'}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Locked & finalized scores</span>
        </Card>

        <Card className="p-4 bg-white dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Average Class Score</span>
            <Percent className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-2 font-mono">
            {stats ? `${stats.average_class_score}%` : '—'}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Overall performance</span>
        </Card>

        <Card className="p-4 bg-white dark:bg-slate-900 border-l-4 border-l-rose-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Requires Attention</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-extrabold text-rose-600 dark:text-rose-400 mt-2 font-mono">
            {stats ? stats.students_requiring_attention : '—'}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Students below 60%</span>
        </Card>
      </div>

      {/* 2. REVIEW QUEUE SECTION */}
      <Card>
        <CardHeader
          title="Review Queue"
          subtitle="Student submissions waiting for teacher review and grading approval"
          icon={<CheckSquare className="w-5 h-5 text-indigo-400" />}
          action={
            <Badge variant={reviewQueue.length > 0 ? 'accent' : 'default'} size="sm">
              {reviewQueue.length} in queue
            </Badge>
          }
        />

        <div className="overflow-x-auto pt-2">
          {reviewQueue.length > 0 ? (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-3 px-3">Student</th>
                  <th className="py-3 px-3">Assignment</th>
                  <th className="py-3 px-3">AI Suggested Score</th>
                  <th className="py-3 px-3">Final / Teacher Score</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Submitted At</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono text-[11px]">
                {reviewQueue.map(item => {
                  const isApproved = item.approval_status === 'approved';
                  const isModified = item.approval_status === 'modified';
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-3 font-semibold text-slate-800 dark:text-slate-200">
                        {item.student_name}
                      </td>
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                        {item.assignment_title}
                      </td>
                      <td className="py-3 px-3 text-slate-500">
                        {item.ai_suggested_score} / {item.total_maximum_marks}
                      </td>
                      <td className="py-3 px-3 font-bold text-indigo-500">
                        {item.final_score !== null && item.final_score !== undefined
                          ? `${item.final_score} / ${item.total_maximum_marks}`
                          : '—'}
                      </td>
                      <td className="py-3 px-3">
                        <Badge
                          variant={isApproved ? 'success' : isModified ? 'brand' : 'warning'}
                          size="sm"
                        >
                          {isApproved ? 'Approved' : isModified ? 'Modified' : 'Pending'}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 text-slate-400">
                        {new Date(item.submitted_at).toLocaleDateString()} {new Date(item.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <Button
                          variant="accent"
                          size="sm"
                          icon={<Eye className="w-3.5 h-3.5" />}
                          onClick={() => handleOpenReview(item.id)}
                        >
                          Review
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center text-slate-500 text-xs">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
              <p className="font-semibold text-slate-700 dark:text-slate-300">Review queue is clean</p>
              <p className="mt-0.5">All student assessment submissions have been evaluated and approved.</p>
            </div>
          )}
        </div>
      </Card>

      {/* 3. ASSIGNMENT MANAGEMENT & CLASS PERFORMANCE GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Recent Assignments Table */}
        <div className="lg:col-span-7">
          <Card>
            <CardHeader
              title="Recent Assignments"
              subtitle="Course curriculum and rubric definitions"
              icon={<ClipboardList className="w-5 h-5 text-indigo-400" />}
              action={
                <Button
                  variant="outline"
                  size="sm"
                  icon={<Plus className="w-3.5 h-3.5" />}
                  onClick={() => setShowCreateModal(true)}
                >
                  New Assignment
                </Button>
              }
            />

            <div className="overflow-x-auto pt-2">
              {assignments.length > 0 ? (
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="py-2.5 px-3">Assignment</th>
                      <th className="py-2.5 px-3">Subject</th>
                      <th className="py-2.5 px-3">Max Marks</th>
                      <th className="py-2.5 px-3">Submissions</th>
                      <th className="py-2.5 px-3">Pending</th>
                      <th className="py-2.5 px-3">Avg Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono text-[11px]">
                    {assignments.map(a => (
                      <tr key={a.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-3 font-semibold text-slate-800 dark:text-slate-200">
                          {a.title}
                        </td>
                        <td className="py-3 px-3 text-slate-500 font-sans">
                          {a.subject}
                        </td>
                        <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                          {a.total_maximum_marks} pts
                        </td>
                        <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                          {a.submission_count}
                        </td>
                        <td className="py-3 px-3">
                          {a.pending_review_count > 0 ? (
                            <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 font-semibold">
                              {a.pending_review_count} pending
                            </span>
                          ) : (
                            <span className="text-emerald-500">0</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-indigo-500 font-bold">
                          {a.average_score !== null && a.average_score !== undefined ? `${a.average_score} pts` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-8 text-center text-slate-500 text-xs">
                  <p>No assignments created yet. Click "New Assignment" to build your first course rubric.</p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Right Column: Class Performance & Students Needing Support */}
        <div className="lg:col-span-5 space-y-6">
          <Card>
            <CardHeader
              title="Class Performance Highlights"
              subtitle="Real-time analytics across all evaluated submissions"
              icon={<BarChart3 className="w-5 h-5 text-indigo-400" />}
            />

            <div className="space-y-4 pt-1 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                  <span className="text-[11px] font-semibold text-emerald-500 uppercase tracking-wider block mb-1">
                    Strongest Topic
                  </span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 block text-sm">
                    {stats?.strongest_topic || 'Pending data'}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                  <span className="text-[11px] font-semibold text-rose-500 uppercase tracking-wider block mb-1">
                    Weakest Topic
                  </span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 block text-sm">
                    {stats?.weakest_topic || 'Pending data'}
                  </span>
                </div>
              </div>

              {/* Topic breakdown list */}
              {stats?.topic_analytics && stats.topic_analytics.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Curriculum Topic Averages
                  </span>
                  {stats.topic_analytics.slice(0, 4).map(t => (
                    <div key={t.topic} className="flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-700 dark:text-slate-300 font-sans">{t.topic}</span>
                      <span className="text-slate-500">{t.average_percentage}% ({t.question_count} questions)</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>

          {/* Students Needing Support Card */}
          <Card>
            <CardHeader
              title="Students Needing Support"
              subtitle="Scored below 65% with identified learning gaps"
              icon={<Users className="w-5 h-5 text-rose-500" />}
            />

            <div className="space-y-2 pt-1">
              {stats?.students_needing_support && stats.students_needing_support.length > 0 ? (
                stats.students_needing_support.map(s => (
                  <div
                    key={s.submission_id}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-200 block">
                        {s.student_name}
                      </span>
                      <span className="text-slate-500 text-[11px]">
                        {s.assignment_title} • Gap: <span className="text-rose-400">{s.primary_weakness}</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-rose-500">{s.percentage}%</span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-[11px] px-2 py-0.5"
                        onClick={() => handleOpenReview(s.submission_id)}
                      >
                        Inspect
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-slate-500 text-xs">
                  No students currently flagged as needing urgent academic intervention.
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: CREATE ASSIGNMENT */}
      {/* ========================================================================= */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Create New Assignment
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Define assignment metadata, question schemas, and evaluation rubrics.
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAssignmentSubmit} className="p-5 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Assignment Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Java OOP & Inheritance Assessment"
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Subject / Course *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Computer Science"
                    value={newSubject}
                    onChange={e => setNewSubject(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  General Instructions
                </label>
                <textarea
                  rows={2}
                  placeholder="Instructions for students on formatting, time limits, or allowed materials..."
                  value={newInstructions}
                  onChange={e => setNewInstructions(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Expected Concepts (comma-separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Polymorphism, Abstract Classes, Encapsulation"
                  value={newConcepts}
                  onChange={e => setNewConcepts(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Rubric & Evaluation Guidance
                </label>
                <textarea
                  rows={2}
                  placeholder="Provide guidance for the AI evaluator (e.g. Award 5 marks for definition, 5 marks for working code example)..."
                  value={newRubric}
                  onChange={e => setNewRubric(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                />
              </div>

              {/* Questions Definition */}
              <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px]">
                    Questions Schema ({newQuestions.length})
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    icon={<Plus className="w-3.5 h-3.5" />}
                    onClick={handleAddQuestionRow}
                  >
                    Add Question
                  </Button>
                </div>

                <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                  {newQuestions.map((q, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-indigo-400">Q{q.question_number}</span>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="Topic"
                            value={q.topic}
                            onChange={e => {
                              const val = e.target.value;
                              setNewQuestions(prev => prev.map((item, i) => i === idx ? { ...item, topic: val } : item));
                            }}
                            className="w-28 px-2 py-1 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs"
                          />
                          <div className="flex items-center gap-1">
                            <span className="text-slate-500">Max:</span>
                            <input
                              type="number"
                              min="1"
                              max="100"
                              value={q.maximum_marks}
                              onChange={e => {
                                const val = parseFloat(e.target.value) || 1;
                                setNewQuestions(prev => prev.map((item, i) => i === idx ? { ...item, maximum_marks: val } : item));
                              }}
                              className="w-14 px-2 py-1 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-mono"
                            />
                          </div>
                          {newQuestions.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveQuestionRow(idx)}
                              className="text-rose-400 hover:text-rose-600 px-1"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </div>
                      <input
                        type="text"
                        placeholder="Question prompt..."
                        value={q.question_text}
                        onChange={e => {
                          const val = e.target.value;
                          setNewQuestions(prev => prev.map((item, i) => i === idx ? { ...item, question_text: val } : item));
                        }}
                        className="w-full px-2.5 py-1.5 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-500 font-mono">
                  Total Marks: <strong>{newQuestions.reduce((acc, q) => acc + (Number(q.maximum_marks) || 0), 0)} pts</strong>
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCreateModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={creatingAssignment}
                  >
                    {creatingAssignment ? 'Saving...' : 'Save Assignment'}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
