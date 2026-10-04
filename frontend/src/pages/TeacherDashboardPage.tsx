import React, { useState, useEffect, useCallback } from 'react';
import {
  ClipboardList,
  CheckSquare,
  BarChart3,
  Plus,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Award,
  Save,
  Check,
  FileText,
  ArrowLeft,
  Users,
  Percent,
  Sparkles,
  Brain,
  HelpCircle,
} from 'lucide-react';
import { Card, CardHeader } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import type {
  AssignmentItem,
  TeacherReviewQueueItem,
  TeacherDashboardStats,
  ClassIntelligenceData,
  StudentListItem,
  TopicDrilldownData,
  StudentDrilldownData,
} from '../types';

export const TeacherDashboardPage: React.FC = () => {
  const { activeTab, selectedTeacherSubmissionId, setSelectedTeacherSubmissionId } = useApp();

  // Internal view state: dashboard (overview), assignments, review, intelligence
  const [currentView, setCurrentView] = useState<'dashboard' | 'assignments' | 'review' | 'intelligence'>('dashboard');

  // Live Data States
  const [stats, setStats] = useState<TeacherDashboardStats | null>(null);
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [reviewQueue, setReviewQueue] = useState<TeacherReviewQueueItem[]>([]);
  const [classIntelligence, setClassIntelligence] = useState<ClassIntelligenceData | null>(null);
  const [registeredStudents, setRegisteredStudents] = useState<StudentListItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Drilldown States
  const [topicDrilldown, setTopicDrilldown] = useState<TopicDrilldownData | null>(null);
  const [studentDrilldown, setStudentDrilldown] = useState<StudentDrilldownData | null>(null);
  const [, setDrilldownLoading] = useState<boolean>(false);

  // Assignment Modal State
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [newInstructions, setNewInstructions] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [newRubric, setNewRubric] = useState('');
  const [newConcepts, setNewConcepts] = useState('');
  const [newStatus, setNewStatus] = useState<'published' | 'draft'>('published');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [assignToAll, setAssignToAll] = useState<boolean>(true);
  const createEmptyQuestion = (num: number = 1) => ({
    question_number: num,
    question_text: '',
    question_type: 'Subjective',
    maximum_marks: 10,
    topic: 'Computer Science',
    rubric: '',
    model_answer: '',
    key_concepts: '',
    strictness: 'balanced' as const,
  });

  const [newQuestions, setNewQuestions] = useState<Array<{
    question_number: number;
    question_text: string;
    question_type: string;
    maximum_marks: number;
    topic: string;
    rubric?: string;
    model_answer?: string;
    key_concepts?: string;
    strictness?: 'strict' | 'balanced' | 'flexible';
  }>>([createEmptyQuestion(1)]);
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
      setCurrentView('intelligence');
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

  // Load all dashboard metrics & Class Intelligence
  const loadDashboardData = useCallback(async () => {
    try {
      setError(null);
      const [statsRes, asgnRes, queueRes, studentsRes, intelRes] = await Promise.all([
        api.getTeacherDashboardStats().catch(() => null),
        api.getAssignments().catch(() => []),
        api.getTeacherReviewQueue().catch(() => []),
        api.getStudents().catch(() => []),
        api.getClassIntelligence().catch(() => null),
      ]);
      setStats(statsRes);
      setAssignments(asgnRes);
      setReviewQueue(queueRes);
      setRegisteredStudents(studentsRes);
      setClassIntelligence(intelRes);
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

  const handlePublishAssignment = async (assignmentId: string) => {
    try {
      await api.publishAssignment(assignmentId);
      loadDashboardData();
    } catch (err: any) {
      alert(err?.message || 'Failed to publish assignment.');
    }
  };

  const handleAddQuestionRow = () => {
    setNewQuestions(prev => [
      ...prev,
      {
        question_number: prev.length + 1,
        question_text: '',
        question_type: 'Subjective',
        maximum_marks: 10,
        topic: 'General',
        rubric: '',
        model_answer: '',
        key_concepts: '',
        strictness: 'balanced',
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

      const targetStudentIds = assignToAll ? ['all'] : selectedStudentIds;

      await api.createAssignment({
        title: newTitle.trim(),
        subject: newSubject.trim(),
        instructions: newInstructions.trim() || undefined,
        total_maximum_marks: totalMarks,
        rubric_guidance: newRubric.trim() || undefined,
        expected_concepts: conceptsList,
        questions: newQuestions
          .filter(q => q.question_text.trim().length > 0)
          .map(q => ({
            ...q,
            key_concepts: q.key_concepts
              ? q.key_concepts.split(',').map(s => s.trim()).filter(Boolean)
              : [],
          })),
        status: newStatus,
        assigned_student_ids: targetStudentIds,
        due_date: newDueDate.trim() || undefined,
      } as any);

      setShowCreateModal(false);
      setNewTitle('');
      setNewSubject('');
      setNewInstructions('');
      setNewRubric('');
      setNewConcepts('');
      setNewDueDate('');
      setSelectedStudentIds([]);
      setAssignToAll(true);
      setNewQuestions([createEmptyQuestion(1)]);
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

  // Topic Drilldown Modal Handler
  const openTopicDrilldown = async (topicName: string) => {
    setDrilldownLoading(true);
    try {
      const data = await api.getTopicDrilldown(topicName);
      setTopicDrilldown(data);
    } catch (err: any) {
      alert(err?.message || 'Could not load topic drilldown.');
    } finally {
      setDrilldownLoading(false);
    }
  };

  // Student Drilldown Modal Handler
  const openStudentDrilldown = async (studentId: string) => {
    setDrilldownLoading(true);
    try {
      const data = await api.getStudentDrilldown(studentId);
      setStudentDrilldown(data);
    } catch (err: any) {
      alert(err?.message || 'Could not load student drilldown.');
    } finally {
      setDrilldownLoading(false);
    }
  };

  if (loading && !stats && !error) {
    return (
      <div className="py-24 text-center space-y-3">
        <RefreshCw className="w-8 h-8 text-[#8052FF] animate-spin mx-auto" />
        <p className="text-sm text-[#9A9A9A]">Loading Teacher Intelligence Suite...</p>
      </div>
    );
  }

  // =========================================================================
  // VIEW: DEDICATED TWO-COLUMN REVIEWER (Typed + Scanned)
  // =========================================================================
  if (currentView === 'review' && activeSubmissionId) {
    const isTypedSubmission = reviewData?.submission_type === 'typed' || reviewData?.file_type === 'typed';

    return (
      <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fade-in">
        {/* Navigation & Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-[#0A0A0A] border border-white/[0.08]">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setActiveSubmissionId(null);
                setSelectedTeacherSubmissionId(null);
                setCurrentView('dashboard');
              }}
              className="p-2 rounded-xl text-[#9A9A9A] hover:text-white hover:bg-white/[0.05] transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono uppercase text-[#8052FF]">
                  {isTypedSubmission ? 'Typed Assessment Review' : 'Scanned Paper Review'}
                </span>
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-white/[0.05] text-white">
                  {reviewData?.approval_status?.toUpperCase() || 'PENDING'}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-medium text-white tracking-tight">
                {reviewData?.student_name || 'Student'} • {reviewData?.assignment_title || 'Assessment'}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Button
              variant="outline"
              size="sm"
              icon={<RefreshCw className={`w-3.5 h-3.5 ${reviewLoading ? 'animate-spin' : ''}`} />}
              onClick={() => loadReviewSubmission(activeSubmissionId)}
            >
              Reload
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<CheckCircle2 className="w-3.5 h-3.5" />}
              disabled={savingScore}
              onClick={() => handleSaveScoreChanges(true)}
            >
              Approve Grade
            </Button>
          </div>
        </div>

        {actionSuccessMsg && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono">
            {actionSuccessMsg}
          </div>
        )}

        {reviewLoading && !reviewData ? (
          <div className="py-24 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-[#8052FF] animate-spin mx-auto" />
            <p className="text-sm text-[#9A9A9A]">Loading student answers and AI evaluations...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* LEFT COLUMN: STUDENT SUBMISSION (Typed questions vs Scanned OCR) */}
            <div className="lg:col-span-6 space-y-5">
              <Card>
                <CardHeader
                  title={isTypedSubmission ? "Student's Submitted Answers" : "Original Scanned Assessment"}
                  subtitle={isTypedSubmission ? "Direct on-platform student typed responses" : `${reviewData.original_filename} • Page ${reviewPage} of ${reviewData.page_count}`}
                  icon={<FileText className="w-5 h-5 text-[#8052FF]" />}
                />

                {isTypedSubmission ? (
                  /* Typed Submission Question-by-Question Viewer */
                  <div className="space-y-4 pt-2">
                    {reviewData?.questions?.map((q: any) => (
                      <div key={q.id} className="p-4 rounded-xl bg-black border border-white/[0.08] space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-md bg-[#8052FF]/20 text-[#8052FF] font-mono text-xs flex items-center justify-center font-medium">
                              Q{q.question_number}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-white/[0.05] text-[#9A9A9A]">
                              {q.topic}
                            </span>
                          </div>
                          <span className="text-xs font-mono text-[#9A9A9A]">
                            {q.maximum_marks} Marks
                          </span>
                        </div>

                        <div className="text-xs text-white font-medium pl-1">
                          {q.question_text}
                        </div>

                        <div className="p-3 rounded-lg bg-[#0A0A0A] border border-white/[0.06] text-xs text-[#DDD] leading-relaxed font-sans whitespace-pre-wrap">
                          <p className="text-[10px] font-mono text-[#777] uppercase mb-1">Student Answer:</p>
                          {q.student_answer || '[No answer submitted]'}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  /* Scanned OCR Document Viewer */
                  <div className="space-y-3">
                    <div className="relative rounded-xl overflow-hidden bg-black border border-white/[0.08] flex items-center justify-center min-h-[380px] max-h-[550px]">
                      <img
                        src={api.getAssessmentPreviewUrl(reviewData.submission_id, reviewPage)}
                        alt={`Submission Page ${reviewPage}`}
                        className="max-h-[530px] w-auto object-contain"
                        onError={e => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                      <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded bg-black/80 backdrop-blur-sm text-[11px] font-mono text-white border border-white/10">
                        Source: {reviewData.original_filename}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-xs"
                        onClick={() => setShowOcrText(!showOcrText)}
                      >
                        {showOcrText ? 'Hide Extracted OCR' : 'View Extracted OCR Text'}
                      </Button>
                      {showOcrText && (
                        <Button
                          variant={isEditingOcr ? 'secondary' : 'outline'}
                          size="sm"
                          className="text-xs"
                          onClick={() => setIsEditingOcr(!isEditingOcr)}
                        >
                          {isEditingOcr ? 'Cancel' : 'Edit OCR'}
                        </Button>
                      )}
                    </div>

                    {ocrSaveMsg && (
                      <div className="p-2 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-mono">
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
                              className="w-full p-2.5 rounded-lg bg-black border border-[#8052FF] text-xs font-mono text-white focus:outline-none"
                            />
                            <Button
                              variant="primary"
                              size="sm"
                              className="w-full text-xs"
                              disabled={savingOcr}
                              onClick={handleSaveOcrText}
                            >
                              {savingOcr ? 'Saving...' : 'Save Verified OCR'}
                            </Button>
                          </div>
                        ) : (
                          <div className="p-3 rounded-lg bg-black border border-white/[0.08] text-xs font-mono text-[#AAA] max-h-48 overflow-y-auto whitespace-pre-wrap">
                            {reviewData.verified_ocr_text || 'No raw OCR text available.'}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </Card>

              {/* Topic Performance Summary */}
              {reviewData.topic_performance && Object.keys(reviewData.topic_performance).length > 0 && (
                <Card>
                  <CardHeader
                    title="Student Topic Mastery"
                    subtitle="Evaluated performance per syllabus topic"
                    icon={<BarChart3 className="w-5 h-5 text-[#8052FF]" />}
                  />
                  <div className="space-y-2.5 pt-1 text-xs">
                    {Object.entries(reviewData.topic_performance).map(([topic, data]: [string, any]) => {
                      const pct = Math.round(data.percentage || 0);
                      return (
                        <div key={topic} className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-white">{topic}</span>
                            <span className="font-mono text-[#9A9A9A]">{data.obtained} / {data.maximum} ({pct}%)</span>
                          </div>
                          <div className="h-1.5 w-full bg-white/[0.05] rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                pct >= 70 ? 'bg-emerald-400' : pct >= 50 ? 'bg-[#FFB829]' : 'bg-rose-400'
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

            {/* RIGHT COLUMN: EVALUATION, SCORE OVERRIDE & TEACHER APPROVAL */}
            <div className="lg:col-span-6 space-y-5">
              {/* Scoring Authority Banner */}
              <div className="p-5 rounded-2xl bg-[#0A0A0A] border border-[#8052FF]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-[11px] font-mono text-[#8052FF] uppercase tracking-wider block mb-1">
                    Grading Authority & Finalization
                  </span>
                  <div className="flex items-center gap-3">
                    <div>
                      <span className="text-xs text-[#9A9A9A] block">AI Suggested Score</span>
                      <span className="text-lg font-mono font-medium text-white">
                        {reviewData.ai_suggested_score} / {reviewData.total_maximum_marks}
                      </span>
                    </div>
                    <span className="text-[#555] text-xl font-light">→</span>
                    <div>
                      <span className="text-xs text-[#8052FF] block font-medium">Teacher Final Score</span>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          max={reviewData.total_maximum_marks}
                          value={teacherScoreInput}
                          onChange={e => setTeacherScoreInput(e.target.value === '' ? '' : parseFloat(e.target.value))}
                          className="w-20 px-2 py-1 text-base font-bold font-mono rounded-lg bg-black border border-[#8052FF] text-white focus:outline-none"
                        />
                        <span className="text-xs font-mono text-[#9A9A9A]">/ {reviewData.total_maximum_marks}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<Save className="w-3.5 h-3.5" />}
                    disabled={savingScore}
                    onClick={() => handleSaveScoreChanges(false)}
                  >
                    Save Draft
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    icon={<Check className="w-3.5 h-3.5" />}
                    disabled={savingScore}
                    onClick={() => handleSaveScoreChanges(true)}
                  >
                    Approve
                  </Button>
                </div>
              </div>

              {/* Question Evaluations Accordion / List */}
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-xs font-mono uppercase tracking-wider text-[#9A9A9A]">
                    Question Evaluations & Mark Overrides ({reviewData.questions?.length || 0})
                  </h3>
                </div>

                {reviewData.questions?.map((q: any) => {
                  const currentTeacherMarks = questionScores[q.id] ?? q.teacher_marks ?? q.suggested_marks ?? 0;
                  const aiScore = q.ai_score ?? q.suggested_marks ?? 0;
                  return (
                    <Card key={q.id} className="p-4 space-y-3">
                      <div className="flex flex-wrap items-center justify-between border-b border-white/[0.06] pb-2 gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-medium text-xs text-[#8052FF]">
                            Q{q.question_number}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.05] text-[#9A9A9A]">
                            {q.topic}
                          </span>
                          {q.strictness && (
                            <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-[#8052FF]/10 text-[#8052FF] border border-[#8052FF]/20">
                              {q.strictness} mode
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {q.teacher_review_required && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              Review Required
                            </span>
                          )}
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.06] text-[#BBB]">
                            Rubric Match: {q.rubric_match}
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-white font-medium">{q.question_text}</p>

                      {/* Student's Typed Answer */}
                      <div className="p-3 rounded-xl bg-black border border-white/[0.06]">
                        <span className="text-[10px] font-mono uppercase text-[#777] block mb-1">Student Answer</span>
                        <p className="text-xs text-[#DDD] whitespace-pre-wrap">{q.student_answer || '[No answer submitted]'}</p>
                      </div>

                      {/* Model Answer if provided */}
                      {q.model_answer && (
                        <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.05] text-[11px] text-[#9A9A9A]">
                          <strong className="text-[10px] font-mono uppercase text-[#8052FF] block mb-0.5">Model Answer</strong>
                          {q.model_answer}
                        </div>
                      )}

                      {/* Criterion Scores Table if present */}
                      {q.criterion_scores && q.criterion_scores.length > 0 && (
                        <div className="p-3 rounded-xl bg-black border border-white/[0.06] space-y-2">
                          <span className="text-[10px] font-mono uppercase text-[#8052FF] block">Teacher Rubric Breakdown</span>
                          <div className="space-y-1.5">
                            {q.criterion_scores.map((cs: any, cIdx: number) => (
                              <div key={cIdx} className="flex items-start justify-between text-xs p-1.5 rounded bg-white/[0.02] border border-white/[0.04]">
                                <div className="space-y-0.5 max-w-[75%]">
                                  <span className="font-medium text-white block">{cs.criterion}</span>
                                  {cs.feedback && <p className="text-[11px] text-[#888]">{cs.feedback}</p>}
                                </div>
                                <span className="font-mono text-xs text-[#8052FF] font-medium shrink-0">
                                  {cs.score} / {cs.max_score} pts
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Strengths & Mistakes */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {q.strengths && currentTeacherMarks > 0 && q.rubric_match !== 'Incorrect' && (
                          <div className="p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-emerald-300 text-[11px]">
                            <strong className="block text-[10px] font-mono text-emerald-400 uppercase">Strengths</strong>
                            {q.strengths}
                          </div>
                        )}
                        {q.mistakes && (
                          <div className="p-2.5 rounded-lg bg-rose-500/5 border border-rose-500/20 text-rose-300 text-[11px]">
                            <strong className="block text-[10px] font-mono text-rose-400 uppercase">Mistakes / Missing Points</strong>
                            {q.mistakes}
                          </div>
                        )}
                      </div>

                      {/* Score Override & Feedback Fields */}
                      <div className="pt-2 border-t border-white/[0.06] grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                        <div className="space-y-1">
                          <div className="text-[10px] font-mono text-[#9A9A9A]">
                            AI Suggested: <strong className="text-white">{aiScore} / {q.maximum_marks}</strong>
                          </div>
                          <div>
                            <label className="text-[10px] font-mono text-[#8052FF] uppercase block mb-0.5">
                              Teacher Final Score
                            </label>
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                step="0.5"
                                min="0"
                                max={q.maximum_marks}
                                value={currentTeacherMarks}
                                onChange={e => {
                                  const val = parseFloat(e.target.value) || 0;
                                  setQuestionScores(prev => ({ ...prev, [q.id]: val }));
                                }}
                                className="w-16 px-2 py-1 text-xs font-mono font-bold rounded-lg bg-black border border-[#8052FF]/60 text-white focus:outline-none focus:border-[#8052FF]"
                              />
                              <span className="text-xs font-mono text-[#777]">/ {q.maximum_marks}</span>
                            </div>
                          </div>
                        </div>

                        <div className="sm:col-span-2">
                          <label className="text-[10px] font-mono text-[#9A9A9A] uppercase block mb-1">
                            Teacher Feedback / Override Reason
                          </label>
                          <input
                            type="text"
                            placeholder="Add specific guidance or reason for mark override..."
                            value={questionFeedbacks[q.id] || q.override_reason || q.teacher_feedback || ''}
                            onChange={e => {
                              const val = e.target.value;
                              setQuestionFeedbacks(prev => ({ ...prev, [q.id]: val }));
                            }}
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-black border border-white/[0.12] text-white placeholder-[#555] focus:outline-none focus:border-[#8052FF]"
                          />
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>

              {/* Overall Feedback Card */}
              <Card>
                <CardHeader
                  title="Overall Teacher Feedback"
                  subtitle="Visible to the student alongside their final score"
                  icon={<Award className="w-5 h-5 text-[#8052FF]" />}
                />
                <div className="space-y-3 pt-1">
                  <textarea
                    rows={3}
                    placeholder="Enter constructive remarks for the student..."
                    value={teacherFeedbackInput}
                    onChange={e => setTeacherFeedbackInput(e.target.value)}
                    className="w-full p-3 text-xs rounded-xl bg-black border border-white/[0.1] text-white placeholder-[#555] focus:outline-none focus:border-[#8052FF]"
                  />
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      icon={<Save className="w-3.5 h-3.5" />}
                      disabled={savingScore}
                      onClick={() => handleSaveScoreChanges(false)}
                    >
                      Save Score & Feedback
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                      disabled={savingScore}
                      onClick={() => handleSaveScoreChanges(true)}
                    >
                      Approve Grade
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
  // VIEW: MAIN TEACHER DASHBOARD, ASSIGNMENTS, AND CLASS INTELLIGENCE
  // =========================================================================
  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 animate-fade-in">
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-[#0A0A0A] border border-white/[0.08] p-6 sm:p-8">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#8052FF]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase bg-[#8052FF]/20 text-[#8052FF] border border-[#8052FF]/30">
                Instructor Suite
              </span>
              <span className="text-xs text-[#9A9A9A] font-light">Class Intelligence & Grading</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-medium text-white tracking-tight">
              Teacher Assessment & Intelligence Operations
            </h1>
            <p className="text-xs sm:text-sm text-[#9A9A9A] mt-1 font-light max-w-2xl">
              Create curriculum assessments with targeted questions, assign to specific students, evaluate typed responses with on-device Qwen AI, and inspect real calculated class mastery.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              icon={<RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />}
              onClick={handleRefresh}
            >
              Refresh
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => setShowCreateModal(true)}
            >
              New Assignment
            </Button>
          </div>
        </div>
      </div>

      {/* Sub Navigation Tabs */}
      <div className="flex items-center gap-2 p-1 bg-[#0A0A0A] border border-white/[0.08] rounded-xl self-start w-fit">
        <button
          onClick={() => setCurrentView('dashboard')}
          className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${
            currentView === 'dashboard'
              ? 'bg-[#8052FF] text-white shadow-sm'
              : 'text-[#9A9A9A] hover:text-white'
          }`}
        >
          Overview & Review Queue
        </button>
        <button
          onClick={() => setCurrentView('assignments')}
          className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${
            currentView === 'assignments'
              ? 'bg-[#8052FF] text-white shadow-sm'
              : 'text-[#9A9A9A] hover:text-white'
          }`}
        >
          Assignments ({assignments.length})
        </button>
        <button
          onClick={() => setCurrentView('intelligence')}
          className={`px-4 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
            currentView === 'intelligence'
              ? 'bg-[#8052FF] text-white shadow-sm'
              : 'text-[#9A9A9A] hover:text-white'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-[#FFB829]" />
          <span>Class Intelligence</span>
        </button>
      </div>

      {/* VIEW: CLASS INTELLIGENCE SUITE */}
      {currentView === 'intelligence' && (
        <div className="space-y-6">
          {/* Top Calculated Metrics Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-5">
              <div className="flex items-center justify-between text-[#9A9A9A] text-xs font-mono uppercase">
                <span>Class Average</span>
                <Percent className="w-4 h-4 text-[#8052FF]" />
              </div>
              <div className="text-3xl font-mono font-medium text-white mt-2">
                {classIntelligence?.average_class_score ?? stats?.average_class_score ?? 0}%
              </div>
              <p className="text-[11px] text-[#777] mt-1 font-light">
                Formula: (Sum Obtained / Sum Max) × 100
              </p>
            </Card>

            <Card className="p-5">
              <div className="flex items-center justify-between text-[#9A9A9A] text-xs font-mono uppercase">
                <span>Total Assessments</span>
                <ClipboardList className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-3xl font-mono font-medium text-white mt-2">
                {classIntelligence?.total_assessments ?? 0}
              </div>
              <p className="text-[11px] text-[#777] mt-1 font-light">
                Across {classIntelligence?.total_students ?? registeredStudents.length} active students
              </p>
            </Card>

            <Card className="p-5">
              <div className="flex items-center justify-between text-[#9A9A9A] text-xs font-mono uppercase">
                <span>Strongest Topic</span>
                <Award className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-base font-medium text-emerald-400 mt-2 truncate">
                {classIntelligence?.strongest_topic || stats?.strongest_topic || 'Pending Data'}
              </div>
              <p className="text-[11px] text-[#777] mt-1 font-light">Highest average mastery</p>
            </Card>

            <Card className="p-5">
              <div className="flex items-center justify-between text-[#9A9A9A] text-xs font-mono uppercase">
                <span>Weakest Topic</span>
                <AlertTriangle className="w-4 h-4 text-rose-400" />
              </div>
              <div className="text-base font-medium text-rose-400 mt-2 truncate">
                {classIntelligence?.weakest_topic || stats?.weakest_topic || 'Pending Data'}
              </div>
              <p className="text-[11px] text-[#777] mt-1 font-light">Requires instructional revision</p>
            </Card>
          </div>

          {/* Local Qwen AI Teaching Insights */}
          <div className="p-6 rounded-2xl bg-[#0A0A0A] border border-[#8052FF]/30 space-y-3 relative overflow-hidden">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#8052FF]/20 text-[#8052FF] flex items-center justify-center">
                <Brain className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-white">Qwen Local AI Teaching Insights</h3>
                <p className="text-[11px] text-[#9A9A9A]">
                  Pedagogical recommendations generated on-device based strictly on computed class performance metrics
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-black border border-white/[0.06] text-xs text-[#DDD] leading-relaxed whitespace-pre-wrap font-sans">
              {classIntelligence?.ai_teaching_insights || (
                '1. Focus upcoming class revision on topics scoring below 65% with worked step-by-step examples.\n' +
                '2. Assign focused AI Tutor remedial exercises for identified rubric gaps.\n' +
                '3. Reinforce core conceptual definitions before advancing to complex multi-step scenarios.'
              )}
            </div>
          </div>

          {/* Strongest vs Attention Topics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Strongest Topics */}
            <Card className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-white flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Strongest Topics (&ge; 70%)</span>
                </h3>
              </div>

              <div className="space-y-3">
                {classIntelligence?.strongest_topics && classIntelligence.strongest_topics.length > 0 ? (
                  classIntelligence.strongest_topics.map(t => (
                    <div
                      key={t.topic}
                      onClick={() => openTopicDrilldown(t.topic)}
                      className="p-3 rounded-xl bg-black border border-white/[0.06] hover:border-[#8052FF]/40 cursor-pointer transition-all space-y-1.5 group"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-white font-medium group-hover:text-[#8052FF] transition-colors">
                          {t.topic}
                        </span>
                        <span className="font-mono text-emerald-400 font-medium">
                          {t.average_percentage}%
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-white/[0.05] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-400 rounded-full"
                          style={{ width: `${t.average_percentage}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-[#777] font-mono">
                        <span>{t.number_of_questions} questions evaluated</span>
                        <span className="text-[#8052FF]">Click for drilldown &rarr;</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-[#777] text-center py-4">No topics above 70% yet.</p>
                )}
              </div>
            </Card>

            {/* Topics Needing Attention */}
            <Card className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-white flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  <span>Topics Needing Attention (&lt; 70%)</span>
                </h3>
              </div>

              <div className="space-y-3">
                {classIntelligence?.topics_needing_attention && classIntelligence.topics_needing_attention.length > 0 ? (
                  classIntelligence.topics_needing_attention.map(t => (
                    <div
                      key={t.topic}
                      onClick={() => openTopicDrilldown(t.topic)}
                      className="p-3 rounded-xl bg-black border border-white/[0.06] hover:border-rose-500/40 cursor-pointer transition-all space-y-1.5 group"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-white font-medium group-hover:text-rose-400 transition-colors">
                          {t.topic}
                        </span>
                        <span className="font-mono text-rose-400 font-medium">
                          {t.average_percentage}%
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-white/[0.05] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-rose-400 rounded-full"
                          style={{ width: `${Math.max(5, t.average_percentage)}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-[#777] font-mono">
                        <span>{t.number_of_questions} questions evaluated</span>
                        <span className="text-rose-400">Click for drilldown &rarr;</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-[#777] text-center py-4">All evaluated topics meet 70% benchmark.</p>
                )}
              </div>
            </Card>
          </div>

          {/* Most Frequently Incorrect Questions */}
          {classIntelligence?.most_frequently_incorrect_questions && classIntelligence.most_frequently_incorrect_questions.length > 0 && (
            <Card className="p-6 space-y-4">
              <h3 className="text-sm font-medium text-white flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-[#FFB829]" />
                <span>Frequently Incorrect Questions</span>
              </h3>

              <div className="space-y-3">
                {classIntelligence.most_frequently_incorrect_questions.map((q, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-black border border-white/[0.06] space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded bg-rose-500/20 text-rose-400 font-mono text-xs flex items-center justify-center font-medium">
                          Q{q.question_number}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-white/[0.05] text-[#9A9A9A] text-[10px] font-mono">
                          {q.topic}
                        </span>
                      </div>
                      <div className="text-right font-mono text-xs">
                        <span className="text-rose-400 font-medium">{q.failure_percentage}% Low Scores</span>
                        <span className="text-[#777] text-[11px] block">Avg: {q.average_score}/{q.maximum_marks}</span>
                      </div>
                    </div>
                    <p className="text-xs text-white pl-1">{q.question_text}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Students Needing Support Table */}
          <Card className="p-6 space-y-4">
            <h3 className="text-sm font-medium text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-rose-400" />
              <span>Students Requiring Academic Attention (&lt; 65%)</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-black text-[#9A9A9A] font-mono text-[10px] uppercase border-b border-white/[0.06]">
                  <tr>
                    <th className="py-2.5 px-3">Student</th>
                    <th className="py-2.5 px-3">Assignment</th>
                    <th className="py-2.5 px-3">Score</th>
                    <th className="py-2.5 px-3">Primary Gap</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {classIntelligence?.students_needing_support && classIntelligence.students_needing_support.length > 0 ? (
                    classIntelligence.students_needing_support.map(s => (
                      <tr key={s.submission_id} className="hover:bg-white/[0.02]">
                        <td className="py-3 px-3 font-medium text-white">{s.student_name}</td>
                        <td className="py-3 px-3 text-[#BBB]">{s.assignment_title}</td>
                        <td className="py-3 px-3 font-mono font-medium text-rose-400">
                          {s.score}/{s.maximum_marks} ({s.percentage}%)
                        </td>
                        <td className="py-3 px-3 text-[#9A9A9A] text-[11px]">{s.primary_weakness}</td>
                        <td className="py-3 px-3 text-right space-x-2">
                          {s.student_id && (
                            <button
                              onClick={() => openStudentDrilldown(s.student_id!)}
                              className="px-2.5 py-1 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-[11px] text-white"
                            >
                              Profile
                            </button>
                          )}
                          <button
                            onClick={() => handleOpenReview(s.submission_id)}
                            className="px-2.5 py-1 rounded-lg bg-[#8052FF]/20 hover:bg-[#8052FF]/30 text-[11px] text-[#8052FF]"
                          >
                            Review
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-[#777] text-xs">
                        No students currently flagged below 65%.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* VIEW: ASSIGNMENTS MANAGEMENT */}
      {currentView === 'assignments' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-white">Coursework & Rubrics</h3>
            <Button
              variant="primary"
              size="sm"
              icon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => setShowCreateModal(true)}
            >
              Create Assignment
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {assignments.map(asgn => {
              const isDraft = asgn.status === 'draft';
              return (
                <div
                  key={asgn.id}
                  className="p-5 rounded-2xl bg-[#0A0A0A] border border-white/[0.08] hover:border-white/[0.16] transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-white/[0.05] text-[#9A9A9A]">
                        {asgn.subject}
                      </span>
                      {isDraft ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-[#FFB829]/15 text-[#FFB829] border border-[#FFB829]/30">
                          Draft
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          Published
                        </span>
                      )}
                    </div>

                    <h4 className="text-base font-medium text-white">{asgn.title}</h4>
                    <p className="text-xs text-[#777] font-mono">
                      {asgn.questions?.length || 0} Questions • {asgn.total_maximum_marks} Maximum Marks
                    </p>
                    <p className="text-xs text-[#9A9A9A] font-mono">
                      Assigned to {asgn.assigned_students_count || asgn.assigned_students?.length || 0} students
                    </p>
                  </div>

                  <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between">
                    <span className="text-xs font-mono text-[#777]">
                      {asgn.submission_count} submissions
                    </span>
                    {isDraft ? (
                      <button
                        onClick={() => handlePublishAssignment(asgn.id)}
                        className="px-3 py-1.5 rounded-lg bg-[#8052FF] hover:bg-[#6D3DF5] text-white text-xs font-medium transition-colors"
                      >
                        Publish Now
                      </button>
                    ) : (
                      <span className="text-xs font-mono text-emerald-400">Live for students</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW: OVERVIEW & REVIEW QUEUE */}
      {currentView === 'dashboard' && (
        <div className="space-y-6">
          {/* Quick Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4">
              <span className="text-xs font-mono text-[#9A9A9A] uppercase">Total Assignments</span>
              <p className="text-2xl font-mono font-medium text-white mt-1">{assignments.length}</p>
            </Card>
            <Card className="p-4">
              <span className="text-xs font-mono text-[#9A9A9A] uppercase">Pending Reviews</span>
              <p className="text-2xl font-mono font-medium text-[#8052FF] mt-1">{stats?.pending_reviews ?? 0}</p>
            </Card>
            <Card className="p-4">
              <span className="text-xs font-mono text-[#9A9A9A] uppercase">Approved Submissions</span>
              <p className="text-2xl font-mono font-medium text-emerald-400 mt-1">{stats?.completed_reviews ?? 0}</p>
            </Card>
            <Card className="p-4">
              <span className="text-xs font-mono text-[#9A9A9A] uppercase">Class Average</span>
              <p className="text-2xl font-mono font-medium text-white mt-1">{stats?.average_class_score ?? 0}%</p>
            </Card>
          </div>

          {/* Review Queue Card */}
          <Card>
            <CardHeader
              title="Review Queue"
              subtitle="Student submissions waiting for teacher review and grading approval"
              icon={<CheckSquare className="w-5 h-5 text-[#8052FF]" />}
              action={
                <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-[#8052FF]/20 text-[#8052FF] border border-[#8052FF]/30">
                  {reviewQueue.length} in queue
                </span>
              }
            />

            <div className="overflow-x-auto pt-2">
              {reviewQueue.length > 0 ? (
                <table className="w-full text-left text-xs">
                  <thead className="bg-black text-[#9A9A9A] font-mono text-[10px] uppercase border-b border-white/[0.06]">
                    <tr>
                      <th className="py-3 px-3">Student</th>
                      <th className="py-3 px-3">Assignment</th>
                      <th className="py-3 px-3">Type</th>
                      <th className="py-3 px-3">AI Score</th>
                      <th className="py-3 px-3">Final Score</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {reviewQueue.map(item => (
                      <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 px-3 font-medium text-white">{item.student_name}</td>
                        <td className="py-3 px-3 text-[#BBB]">{item.assignment_title}</td>
                        <td className="py-3 px-3 font-mono text-[11px] text-[#777]">
                          {item.file_type === 'typed' ? 'Typed' : 'Scanned'}
                        </td>
                        <td className="py-3 px-3 font-mono text-[#9A9A9A]">
                          {item.ai_suggested_score} / {item.total_maximum_marks}
                        </td>
                        <td className="py-3 px-3 font-mono font-medium text-[#8052FF]">
                          {item.final_score !== null && item.final_score !== undefined
                            ? `${item.final_score} / ${item.total_maximum_marks}`
                            : '—'}
                        </td>
                        <td className="py-3 px-3">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.05] text-[#BBB]">
                            {item.approval_status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => handleOpenReview(item.id)}
                            className="px-3 py-1.5 rounded-lg bg-[#8052FF] hover:bg-[#6D3DF5] text-white text-xs font-medium transition-colors"
                          >
                            Review
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-8 text-center text-xs text-[#777]">
                  No pending submissions in the review queue.
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CREATE ASSIGNMENT */}
      {/* ========================================================================= */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-[#0A0A0A] border border-white/[0.08] rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl">
            <div className="p-5 border-b border-white/[0.08] flex items-center justify-between">
              <div>
                <h3 className="text-base font-medium text-white">Create New Course Assignment</h3>
                <p className="text-xs text-[#9A9A9A] mt-0.5">
                  Design questions, select student recipients, set rubrics, and publish.
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-[#9A9A9A] hover:text-white text-lg p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAssignmentSubmit} className="p-5 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-mono text-[10px] uppercase text-[#9A9A9A] block mb-1">
                    Assignment Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Object-Oriented Principles & Data Structures"
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-black border border-white/[0.1] text-white focus:outline-none focus:border-[#8052FF]"
                  />
                </div>

                <div>
                  <label className="font-mono text-[10px] uppercase text-[#9A9A9A] block mb-1">
                    Subject / Course *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Computer Science 201"
                    value={newSubject}
                    onChange={e => setNewSubject(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-black border border-white/[0.1] text-white focus:outline-none focus:border-[#8052FF]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-mono text-[10px] uppercase text-[#9A9A9A] block mb-1">
                    Due Date (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 15 Oct 2026, 11:59 PM"
                    value={newDueDate}
                    onChange={e => setNewDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-black border border-white/[0.1] text-white focus:outline-none focus:border-[#8052FF]"
                  />
                </div>

                <div>
                  <label className="font-mono text-[10px] uppercase text-[#9A9A9A] block mb-1">
                    Publishing Status
                  </label>
                  <select
                    value={newStatus}
                    onChange={e => setNewStatus(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-black border border-white/[0.1] text-white focus:outline-none focus:border-[#8052FF]"
                  >
                    <option value="published">Published (Visible to students immediately)</option>
                    <option value="draft">Draft (Hidden from students)</option>
                  </select>
                </div>
              </div>

              {/* Student Assignment Selector */}
              <div className="p-3.5 rounded-xl bg-black border border-white/[0.08] space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-mono text-[10px] uppercase text-[#9A9A9A]">
                    Assign To Students
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs text-white">
                    <input
                      type="checkbox"
                      checked={assignToAll}
                      onChange={e => setAssignToAll(e.target.checked)}
                      className="rounded accent-[#8052FF]"
                    />
                    <span>All Students ({registeredStudents.length})</span>
                  </label>
                </div>

                {!assignToAll && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                    {registeredStudents.map(s => (
                      <label
                        key={s.id}
                        className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.02] border border-white/[0.04] text-xs text-white cursor-pointer hover:bg-white/[0.05]"
                      >
                        <input
                          type="checkbox"
                          checked={selectedStudentIds.includes(s.id)}
                          onChange={e => {
                            if (e.target.checked) {
                              setSelectedStudentIds(prev => [...prev, s.id]);
                            } else {
                              setSelectedStudentIds(prev => prev.filter(id => id !== s.id));
                            }
                          }}
                          className="rounded accent-[#8052FF]"
                        />
                        <span>{s.name}</span>
                        <span className="text-[10px] text-[#777] font-mono">({s.email})</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="font-mono text-[10px] uppercase text-[#9A9A9A] block mb-1">
                  General Instructions
                </label>
                <textarea
                  rows={2}
                  placeholder="Instructions for students regarding clarity, length, or focus..."
                  value={newInstructions}
                  onChange={e => setNewInstructions(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-black border border-white/[0.1] text-white focus:outline-none focus:border-[#8052FF]"
                />
              </div>

              {/* Questions Definition */}
              <div className="space-y-3 pt-2 border-t border-white/[0.08]">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase text-[#9A9A9A]">
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

                <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                  {newQuestions.map((q, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-black border border-white/[0.08] space-y-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono font-medium text-xs text-[#8052FF]">Q{q.question_number}</span>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="Topic"
                            value={q.topic}
                            onChange={e => {
                              const val = e.target.value;
                              setNewQuestions(prev => prev.map((item, i) => (i === idx ? { ...item, topic: val } : item)));
                            }}
                            className="w-28 px-2 py-1 rounded bg-black border border-white/[0.1] text-xs text-white"
                          />
                          <input
                            type="number"
                            min="1"
                            max="100"
                            value={q.maximum_marks}
                            onChange={e => {
                              const val = parseFloat(e.target.value) || 1;
                              setNewQuestions(prev => prev.map((item, i) => (i === idx ? { ...item, maximum_marks: val } : item)));
                            }}
                            className="w-14 px-2 py-1 rounded bg-black border border-white/[0.1] text-xs font-mono text-white"
                          />
                          {newQuestions.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveQuestionRow(idx)}
                              className="text-rose-400 hover:text-rose-300 px-1 text-sm"
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
                          setNewQuestions(prev => prev.map((item, i) => (i === idx ? { ...item, question_text: val } : item)));
                        }}
                        className="w-full px-2.5 py-1.5 rounded bg-black border border-white/[0.1] text-xs text-white placeholder-[#555]"
                      />

                      <input
                        type="text"
                        placeholder="Grading Rubric (e.g. Definition = 3, Core Principle = 4, Example = 3)..."
                        value={q.rubric || ''}
                        onChange={e => {
                          const val = e.target.value;
                          setNewQuestions(prev => prev.map((item, i) => (i === idx ? { ...item, rubric: val } : item)));
                        }}
                        className="w-full px-2.5 py-1 rounded bg-black border border-white/[0.06] text-[11px] text-[#BBB] placeholder-[#444]"
                      />

                      <input
                        type="text"
                        placeholder="Model / Expected Answer (e.g. Concise explanation of the core concept and technical mechanics)..."
                        value={q.model_answer || ''}
                        onChange={e => {
                          const val = e.target.value;
                          setNewQuestions(prev => prev.map((item, i) => (i === idx ? { ...item, model_answer: val } : item)));
                        }}
                        className="w-full px-2.5 py-1 rounded bg-black border border-white/[0.06] text-[11px] text-[#BBB] placeholder-[#444]"
                      />

                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Key concepts (comma-separated)..."
                          value={q.key_concepts || ''}
                          onChange={e => {
                            const val = e.target.value;
                            setNewQuestions(prev => prev.map((item, i) => (i === idx ? { ...item, key_concepts: val } : item)));
                          }}
                          className="flex-1 px-2.5 py-1 rounded bg-black border border-white/[0.06] text-[11px] text-[#BBB] placeholder-[#444]"
                        />
                        <select
                          value={q.strictness || 'balanced'}
                          onChange={e => {
                            const val = e.target.value as any;
                            setNewQuestions(prev => prev.map((item, i) => (i === idx ? { ...item, strictness: val } : item)));
                          }}
                          className="px-2 py-1 rounded bg-black border border-white/[0.1] text-[11px] text-white"
                        >
                          <option value="balanced">Balanced (Semantic)</option>
                          <option value="strict">Strict Rubric</option>
                          <option value="flexible">Flexible</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between">
                <span className="text-xs font-mono text-[#9A9A9A]">
                  Total: <strong>{newQuestions.reduce((acc, q) => acc + (Number(q.maximum_marks) || 0), 0)} pts</strong>
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
                    {creatingAssignment ? 'Saving...' : newStatus === 'published' ? 'Publish Assignment' : 'Save Draft'}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TOPIC DRILLDOWN MODAL */}
      {topicDrilldown && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-[#0A0A0A] border border-white/[0.08] rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase text-[#8052FF]">Topic Mastery Drilldown</span>
                <h3 className="text-base font-medium text-white">{topicDrilldown.topic}</h3>
              </div>
              <button
                onClick={() => setTopicDrilldown(null)}
                className="text-[#9A9A9A] hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <div className="flex items-center justify-between text-xs font-mono text-[#9A9A9A] p-3 rounded-xl bg-black border border-white/[0.06]">
              <span>Attempts: {topicDrilldown.total_attempts}</span>
              <span className="text-white font-medium">Average: {topicDrilldown.average_percentage}%</span>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto">
              {topicDrilldown.records.map((r, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-black border border-white/[0.04] text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-white font-medium">{r.student_name}</span>
                    <span className="font-mono text-emerald-400">{r.score}/{r.maximum_marks} ({r.percentage}%)</span>
                  </div>
                  {r.learning_gap && (
                    <p className="text-[11px] text-[#FFB829]">Gap: {r.learning_gap}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* STUDENT DRILLDOWN MODAL */}
      {studentDrilldown && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-[#0A0A0A] border border-white/[0.08] rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase text-[#8052FF]">Student Mastery Profile</span>
                <h3 className="text-base font-medium text-white">{studentDrilldown.student_name}</h3>
                <p className="text-xs text-[#777] font-mono">{studentDrilldown.email}</p>
              </div>
              <button
                onClick={() => setStudentDrilldown(null)}
                className="text-[#9A9A9A] hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs font-mono p-3 rounded-xl bg-black border border-white/[0.06]">
              <div>
                <span className="text-[#777] block text-[10px]">Total Assigned</span>
                <span className="text-white font-medium">{studentDrilldown.total_assigned} Coursework</span>
              </div>
              <div>
                <span className="text-[#777] block text-[10px]">Total Submitted</span>
                <span className="text-white font-medium">{studentDrilldown.total_submitted} Assessments</span>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-mono uppercase text-[#9A9A9A]">Topic Mastery Breakdown</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {studentDrilldown.topic_mastery.map(tm => (
                  <div key={tm.topic} className="p-2.5 rounded-lg bg-black border border-white/[0.04] text-xs flex items-center justify-between">
                    <span className="text-white">{tm.topic}</span>
                    <span className="font-mono text-emerald-400">{tm.percentage}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
