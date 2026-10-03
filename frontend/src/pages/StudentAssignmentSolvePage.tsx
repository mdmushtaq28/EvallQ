import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import type { StudentAssignmentDetail } from '../types';
import {
  ArrowLeft,
  Send,
  Calendar,
  User,
  AlertCircle,
  CheckCircle2,
  Cpu,
  Brain,
  Sparkles,
  Info,
  ShieldCheck,
  Save,
  BookOpen,
} from 'lucide-react';

export const StudentAssignmentSolvePage: React.FC = () => {
  const {
    selectedAssignmentId,
    setSelectedAssignmentId,
    setActiveTab,
    setSelectedStudentSubmissionId,
  } = useApp();

  const [assignment, setAssignment] = useState<StudentAssignmentDetail | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const [evalProgressStep, setEvalProgressStep] = useState(0);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Active assignment ID: check state or fallback to localStorage
  const activeAssignmentId =
    selectedAssignmentId ||
    (typeof window !== 'undefined' ? localStorage.getItem('evallq_selected_assignment_id') : null);

  useEffect(() => {
    if (!activeAssignmentId) {
      setActiveTab('student-assignments');
      return;
    }

    // Keep state in sync if it was restored from localStorage
    if (!selectedAssignmentId && activeAssignmentId) {
      setSelectedAssignmentId(activeAssignmentId);
    }

    const fetchAssignment = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await api.getStudentAssignment(activeAssignmentId);
        setAssignment(data);

        // Check if there are draft answers stored locally
        const draftKey = `evallq_draft_${activeAssignmentId}`;
        let localDraft: Record<number, string> = {};
        if (typeof window !== 'undefined') {
          const raw = localStorage.getItem(draftKey);
          if (raw) {
            try {
              localDraft = JSON.parse(raw);
            } catch {
              localDraft = {};
            }
          }
        }

        // Pre-fill answer state: prioritize submitted answers if completed, otherwise local draft, else blank
        const initialAnswers: Record<number, string> = {};
        const questionsList = data.questions || [];

        questionsList.forEach((q: any, idx: number) => {
          const qNum = Number(q.question_number) || idx + 1;
          if (data.submitted_answers && data.submitted_answers[String(qNum)] !== undefined) {
            initialAnswers[qNum] = data.submitted_answers[String(qNum)];
          } else if (localDraft[qNum] !== undefined) {
            initialAnswers[qNum] = localDraft[qNum];
          } else {
            initialAnswers[qNum] = '';
          }
        });

        setAnswers(initialAnswers);
      } catch (err: any) {
        console.error('Failed to fetch assignment details:', err);
        setError(err?.message || 'Could not load assignment questions.');
      } finally {
        setLoading(false);
      }
    };

    fetchAssignment();
  }, [activeAssignmentId]);

  const handleAnswerChange = (qNum: number, text: string) => {
    setAnswers(prev => {
      const updated = { ...prev, [qNum]: text };
      // Auto-save draft to localStorage
      if (typeof window !== 'undefined' && activeAssignmentId) {
        try {
          localStorage.setItem(`evallq_draft_${activeAssignmentId}`, JSON.stringify(updated));
        } catch {
          // ignore storage quota errors
        }
      }
      return updated;
    });
  };

  const handleSaveDraft = () => {
    if (typeof window !== 'undefined' && activeAssignmentId) {
      localStorage.setItem(`evallq_draft_${activeAssignmentId}`, JSON.stringify(answers));
      setDraftSaved(true);
      setTimeout(() => setDraftSaved(false), 2500);
    }
  };

  const answeredCount = Object.values(answers).filter(a => a.trim().length > 0).length;
  const rawQuestions = assignment?.questions || [];
  const normalizedQuestions = rawQuestions.map((q: any, idx: number) => ({
    id: q.id || `q-${idx + 1}`,
    question_number: Number(q.question_number) || idx + 1,
    question_text: q.question_text || q.question || `Question ${idx + 1}`,
    maximum_marks: Number(q.maximum_marks ?? q.max_marks ?? 10),
    topic: q.topic || 'General',
    rubric: q.rubric || '',
    question_type: q.question_type || 'Subjective',
  }));
  const totalQuestions = normalizedQuestions.length;

  const isAlreadySubmitted =
    assignment?.is_submitted ||
    assignment?.status === 'APPROVED' ||
    assignment?.status === 'UNDER_REVIEW' ||
    assignment?.status === 'SUBMITTED' ||
    assignment?.status === 'EVALUATED';

  const handleSubmit = async () => {
    if (!activeAssignmentId || !assignment || isAlreadySubmitted) return;
    setShowConfirmModal(false);
    setSubmitting(true);
    setEvalProgressStep(1);

    // Progress animation milestones for local AI evaluation
    const stepTimer1 = setTimeout(() => setEvalProgressStep(2), 2500);
    const stepTimer2 = setTimeout(() => setEvalProgressStep(3), 6000);

    try {
      const payload = normalizedQuestions.map(q => ({
        question_number: q.question_number,
        answer_text: answers[q.question_number] || '',
      }));

      const evalResult = await api.submitStudentAssignment(activeAssignmentId, payload);
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      setEvalProgressStep(4);

      // Clear local draft on successful submission
      if (typeof window !== 'undefined') {
        localStorage.removeItem(`evallq_draft_${activeAssignmentId}`);
      }

      // Short delay so student sees successful completion before moving to results
      setTimeout(() => {
        setSelectedStudentSubmissionId(evalResult.submission_id);
        setActiveTab('student-result');
      }, 1000);
    } catch (err: any) {
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      setSubmitting(false);
      setError(err?.message || 'Evaluation submission failed. Please check local model status.');
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center space-y-4 animate-fade-in">
        <div className="w-12 h-12 rounded-2xl bg-[#8052FF]/10 border border-[#8052FF]/30 flex items-center justify-center mx-auto text-[#8052FF] animate-pulse">
          <Brain className="w-6 h-6" />
        </div>
        <h3 className="text-base font-medium text-white tracking-tight">Loading teacher's questions...</h3>
        <p className="text-xs text-[#9A9A9A]">Retrieving official assignment details and rubrics</p>
      </div>
    );
  }

  if (error && !submitting) {
    return (
      <div className="max-w-xl mx-auto py-12 space-y-4 text-center animate-fade-in">
        <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 space-y-3">
          <AlertCircle className="w-8 h-8 mx-auto" />
          <h3 className="text-base font-medium">Assignment Access Error</h3>
          <p className="text-xs">{error}</p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => setActiveTab('student-assignments')}
              className="px-4 py-2 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-white rounded-xl text-xs font-medium transition-colors"
            >
              Back to Assignments
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-white/[0.08] hover:bg-white/[0.14] text-white rounded-xl text-xs font-medium transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="max-w-xl mx-auto py-12 space-y-4 text-center animate-fade-in">
        <div className="p-6 rounded-2xl bg-[#0A0A0A] border border-white/[0.08] text-white space-y-3">
          <BookOpen className="w-8 h-8 mx-auto text-[#8052FF]" />
          <h3 className="text-base font-medium">Assignment Not Found</h3>
          <p className="text-xs text-[#9A9A9A]">
            Could not find the requested assignment or it is not assigned to your account.
          </p>
          <button
            onClick={() => setActiveTab('student-assignments')}
            className="px-4 py-2 bg-[#8052FF] hover:bg-[#6D3DF5] text-white rounded-xl text-xs font-medium transition-colors"
          >
            Back to Assignments
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-28 space-y-6 animate-fade-in">
      {/* Top Navigation & Status */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setActiveTab('student-assignments')}
          className="flex items-center gap-2 text-xs text-[#9A9A9A] hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Assignments</span>
        </button>

        <div className="flex items-center gap-3">
          {isAlreadySubmitted ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {assignment.status === 'APPROVED' ? 'Approved & Graded' : 'Submitted (Under Review)'}
            </span>
          ) : (
            <div className="flex items-center gap-2 text-xs font-mono text-[#9A9A9A]">
              <span className={`w-2 h-2 rounded-full ${answeredCount === totalQuestions && totalQuestions > 0 ? 'bg-emerald-500' : 'bg-[#FFB829]'}`} />
              <span>
                {answeredCount} of {totalQuestions} answered
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Assignment Overview Card */}
      <div className="p-6 sm:p-8 rounded-2xl bg-[#0A0A0A] border border-white/[0.08] relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase bg-[#8052FF]/20 text-[#8052FF] border border-[#8052FF]/30">
                {assignment.subject}
              </span>
              <span className="text-xs text-[#9A9A9A] font-light">Official Coursework</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-medium text-white tracking-tight">
              {assignment.title}
            </h1>
          </div>

          <div className="flex sm:flex-col items-end gap-1 text-right">
            <span className="text-[10px] uppercase font-mono text-[#777]">Total Marks</span>
            <span className="text-xl font-mono font-medium text-[#8052FF]">
              {assignment.total_maximum_marks} pts
            </span>
          </div>
        </div>

        {/* Metadata Details */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 text-xs text-[#9A9A9A]">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-[#777]" />
            <div>
              <p className="text-[10px] text-[#777] font-mono uppercase">Teacher</p>
              <p className="text-white font-medium">{assignment.teacher_name}</p>
            </div>
          </div>

          {assignment.due_date && (
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#777]" />
              <div>
                <p className="text-[10px] text-[#777] font-mono uppercase">Due Date</p>
                <p className="text-white font-medium">{assignment.due_date}</p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-[#777]" />
            <div>
              <p className="text-[10px] text-[#777] font-mono uppercase">Evaluation Engine</p>
              <p className="text-white font-medium">Local Qwen 2.5 Rubric Evaluator</p>
            </div>
          </div>
        </div>

        {/* Instructions */}
        {assignment.instructions && (
          <div className="mt-6 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] text-xs text-[#BBB] leading-relaxed">
            <div className="flex items-center gap-1.5 font-medium text-white mb-1">
              <Info className="w-3.5 h-3.5 text-[#8052FF]" />
              <span>Instructions</span>
            </div>
            <p>{assignment.instructions}</p>
          </div>
        )}

        {/* Already Submitted Banner */}
        {isAlreadySubmitted && (
          <div className="mt-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-emerald-300">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>
                You have already submitted this assignment. Your answers below are in read-only mode.
              </span>
            </div>
            <button
              onClick={() => {
                if (assignment.submission_id) {
                  setSelectedStudentSubmissionId(assignment.submission_id);
                }
                setActiveTab('student-result');
              }}
              className="px-4 py-1.5 rounded-lg bg-emerald-500 text-white font-medium text-xs hover:bg-emerald-600 transition-colors shrink-0"
            >
              View My Results
            </button>
          </div>
        )}
      </div>

      {/* Questions Section */}
      <div className="space-y-6">
        {normalizedQuestions.length === 0 ? (
          <div className="p-8 rounded-2xl bg-[#0A0A0A] border border-white/[0.08] text-center space-y-2 text-xs text-[#9A9A9A]">
            <Info className="w-6 h-6 mx-auto text-[#777]" />
            <p>No questions have been configured for this assignment yet.</p>
          </div>
        ) : (
          normalizedQuestions.map(q => {
            const answerValue = answers[q.question_number] || '';
            const isAnswered = answerValue.trim().length > 0;

            return (
              <div
                key={q.id}
                className="p-6 rounded-2xl bg-[#0A0A0A] border border-white/[0.08] hover:border-white/[0.14] transition-colors space-y-4"
              >
                {/* Question Header */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-[#8052FF]/20 text-[#8052FF] font-mono text-xs font-medium flex items-center justify-center">
                      Q{q.question_number}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-white/[0.04] text-[#9A9A9A] border border-white/[0.06]">
                      {q.topic}
                    </span>
                    {q.question_type && (
                      <span className="text-[10px] font-mono text-[#777]">
                        {q.question_type}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-[#9A9A9A]">
                      {q.maximum_marks} Marks
                    </span>
                    {isAnswered ? (
                      <span className="w-2 h-2 rounded-full bg-emerald-500" title="Answered" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-[#FFB829]" title="Unanswered" />
                    )}
                  </div>
                </div>

                {/* Question Text */}
                <div className="text-sm text-white font-normal leading-relaxed pl-1">
                  {q.question_text}
                </div>

                {/* Rubric Guidance Pill if available */}
                {q.rubric && (
                  <div className="px-3 py-1.5 rounded-lg bg-white/[0.02] border border-white/[0.05] text-[11px] text-[#888] font-light flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-[#FFB829] shrink-0" />
                    <span>Grading Focus: {q.rubric}</span>
                  </div>
                )}

                {/* Answer Textarea */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-[#777] font-mono px-1">
                    <span>
                      {isAlreadySubmitted ? 'Your Submitted Response:' : 'Type your detailed answer:'}
                    </span>
                    <span>{answerValue.length} characters</span>
                  </div>
                  <textarea
                    rows={5}
                    disabled={isAlreadySubmitted || submitting}
                    value={answerValue}
                    onChange={e => handleAnswerChange(q.question_number, e.target.value)}
                    placeholder={
                      isAlreadySubmitted
                        ? 'No answer submitted.'
                        : `Write your structured response for Question ${q.question_number} here. Explain principles, steps, formulas, and definitions clearly...`
                    }
                    className={`w-full p-4 rounded-xl bg-black border text-white text-sm transition-all resize-y leading-relaxed font-sans ${
                      isAlreadySubmitted
                        ? 'border-white/[0.06] text-[#CCC] bg-black/60 cursor-not-allowed'
                        : 'border-white/[0.1] placeholder-[#444] focus:outline-none focus:border-[#8052FF]'
                    }`}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Floating Bottom Submission Bar */}
      {!isAlreadySubmitted && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-black/90 backdrop-blur-md border-t border-white/[0.08] z-30">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveTab('student-assignments')}
                className="px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-xs text-[#9A9A9A] hover:text-white transition-colors"
              >
                Back
              </button>
              <div className="hidden sm:block text-xs font-mono text-[#9A9A9A]">
                Progress: <span className="text-white font-medium">{answeredCount}</span> of {totalQuestions} answered
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Save Draft Button */}
              <button
                onClick={handleSaveDraft}
                disabled={submitting}
                className="px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-medium text-white transition-colors flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5 text-[#9A9A9A]" />
                <span>{draftSaved ? 'Draft Saved ✓' : 'Save Draft'}</span>
              </button>

              {/* Submit Assignment Button */}
              <button
                onClick={() => setShowConfirmModal(true)}
                disabled={submitting || totalQuestions === 0}
                className="px-6 py-2 rounded-xl bg-[#8052FF] hover:bg-[#6D3DF5] text-white text-xs font-medium shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Submit Assignment</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submission Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md bg-[#0A0A0A] border border-white/[0.08] rounded-2xl p-6 sm:p-7 space-y-4 shadow-2xl">
            <div className="w-10 h-10 rounded-xl bg-[#8052FF]/15 border border-[#8052FF]/30 flex items-center justify-center text-[#8052FF]">
              <ShieldCheck className="w-5 h-5" />
            </div>

            <div>
              <h3 className="text-base font-medium text-white">Confirm Assignment Submission</h3>
              <p className="text-xs text-[#9A9A9A] mt-1.5 leading-relaxed font-light">
                Are you ready to submit your answers? You will not be able to edit your answers after submission. Your responses will be evaluated against instructional rubrics using local Qwen AI and submitted for teacher review.
              </p>
            </div>

            {answeredCount < totalQuestions && (
              <div className="p-3 rounded-xl bg-[#FFB829]/10 border border-[#FFB829]/30 text-xs text-[#FFB829] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>
                  You have answered {answeredCount} out of {totalQuestions} questions. Unanswered questions will receive 0 marks.
                </span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] text-xs text-[#9A9A9A] hover:text-white transition-colors"
              >
                Keep Editing
              </button>
              <button
                onClick={handleSubmit}
                className="px-5 py-2 rounded-xl bg-[#8052FF] hover:bg-[#6D3DF5] text-xs font-medium text-white shadow-sm transition-all"
              >
                Confirm & Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Evaluating State Overlay */}
      {submitting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-lg animate-fade-in">
          <div className="w-full max-w-md bg-[#0A0A0A] border border-white/[0.1] rounded-2xl p-8 text-center space-y-6 shadow-2xl">
            <div className="relative w-16 h-16 mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-[#8052FF]/20 border border-[#8052FF]/40 flex items-center justify-center text-[#8052FF]">
                <Cpu className="w-8 h-8 animate-pulse" />
              </div>
              <div className="absolute -inset-1 rounded-2xl border border-[#8052FF]/30 animate-ping pointer-events-none" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-base font-medium text-white tracking-tight">
                Evaluating Assignment On-Device
              </h3>
              <p className="text-xs text-[#9A9A9A] font-light">
                Private Qwen 2.5 AI Rubric Scoring Engine
              </p>
            </div>

            {/* Stepper */}
            <div className="space-y-3 text-left">
              {[
                { step: 1, label: 'Submitting typed answers to secure session' },
                { step: 2, label: 'Evaluating student answers against rubric criteria' },
                { step: 3, label: 'Synthesizing question-level feedback & learning gaps' },
                { step: 4, label: 'Finalizing assessment & queueing instructor review' },
              ].map(item => (
                <div key={item.step} className="flex items-center gap-3 text-xs">
                  {evalProgressStep > item.step ? (
                    <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                  ) : evalProgressStep === item.step ? (
                    <div className="w-5 h-5 rounded-full bg-[#8052FF]/20 text-[#8052FF] flex items-center justify-center shrink-0">
                      <div className="w-2 h-2 rounded-full bg-[#8052FF] animate-ping" />
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-white/[0.04] text-[#555] flex items-center justify-center shrink-0 font-mono text-[10px]">
                      {item.step}
                    </div>
                  )}
                  <span
                    className={
                      evalProgressStep >= item.step ? 'text-white font-medium' : 'text-[#555]'
                    }
                  >
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
