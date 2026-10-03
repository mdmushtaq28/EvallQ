import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import type { AssessmentEvaluationResponse, StudentResultListItem } from '../types';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  AlertCircle,
  Sparkles,
  Bot,
  Brain,
  ChevronRight,
  TrendingUp,
  User,
  Lightbulb,
  Award,
  RefreshCw,
  Search,
  BookOpen,
  Calendar,
  FileCheck,
} from 'lucide-react';

export const StudentResultPage: React.FC = () => {
  const {
    selectedStudentSubmissionId,
    setSelectedStudentSubmissionId,
    setActiveTab,
    setTutorInitialPrompt,
    currentUser,
  } = useApp();

  // State for single detailed submission
  const [result, setResult] = useState<AssessmentEvaluationResponse | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);

  // State for all results list
  const [resultsList, setResultsList] = useState<StudentResultListItem[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [errorList, setErrorList] = useState<string | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'APPROVED' | 'UNDER_REVIEW'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Load results list whenever in list mode (selectedStudentSubmissionId is null)
  const fetchResultsList = async () => {
    setLoadingList(true);
    setErrorList(null);
    try {
      const data = await api.getStudentResults();
      setResultsList(data || []);
    } catch (err: any) {
      console.error('Failed to load student results list:', err);
      setErrorList(err?.message || 'Unable to retrieve your evaluated results.');
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    if (!selectedStudentSubmissionId) {
      fetchResultsList();
    }
  }, [selectedStudentSubmissionId, currentUser]);

  // 2. Load single submission detail whenever selectedStudentSubmissionId is set
  useEffect(() => {
    if (!selectedStudentSubmissionId) {
      setResult(null);
      return;
    }

    const fetchResultDetail = async () => {
      setLoadingDetail(true);
      setErrorDetail(null);
      try {
        const data = await api.getStudentSubmission(selectedStudentSubmissionId);
        setResult(data);
      } catch (err: any) {
        console.error('Failed to load student result detail:', err);
        setErrorDetail(err?.message || 'Could not load your evaluated submission.');
      } finally {
        setLoadingDetail(false);
      }
    };

    fetchResultDetail();
  }, [selectedStudentSubmissionId]);

  const handleAskTutor = (topic: string, questionText: string, learningGap?: string) => {
    const prompt = `I am reviewing my assignment evaluation. For Question: "${questionText}", my identified learning gap in "${topic}" was: "${learningGap || 'conceptual understanding'}". Can you guide me through this step-by-step so I can master this concept?`;
    setTutorInitialPrompt(prompt);
    setActiveTab('tutor');
  };

  // =========================================================================
  // VIEW 1: SINGLE SUBMISSION DETAILS BREAKDOWN
  // =========================================================================
  if (selectedStudentSubmissionId) {
    if (loadingDetail) {
      return (
        <div className="max-w-4xl mx-auto py-16 text-center space-y-4 animate-fade-in">
          <div className="w-12 h-12 rounded-2xl bg-[#8052FF]/10 border border-[#8052FF]/30 flex items-center justify-center mx-auto text-[#8052FF] animate-pulse">
            <Brain className="w-6 h-6" />
          </div>
          <h3 className="text-base font-medium text-white tracking-tight">Loading evaluation details...</h3>
          <p className="text-xs text-[#9A9A9A]">Retrieving rubric scores, teacher comments, and topic breakdown</p>
        </div>
      );
    }

    if (errorDetail || !result) {
      return (
        <div className="max-w-xl mx-auto py-12 space-y-4 text-center animate-fade-in">
          <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 space-y-3">
            <AlertCircle className="w-8 h-8 mx-auto" />
            <h3 className="text-base font-medium">Evaluation Not Found</h3>
            <p className="text-xs">{errorDetail || 'Unable to retrieve evaluation data.'}</p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setSelectedStudentSubmissionId(null)}
                className="px-4 py-2 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-white rounded-xl text-xs font-medium transition-colors"
              >
                Back to All Results
              </button>
              <button
                onClick={() => setActiveTab('student-assignments')}
                className="px-4 py-2 bg-white/[0.08] hover:bg-white/[0.14] text-white rounded-xl text-xs font-medium transition-colors"
              >
                Go to Assignments
              </button>
            </div>
          </div>
        </div>
      );
    }

    const displayScore = result.final_score ?? result.teacher_score ?? result.ai_suggested_score;
    const maxScore = result.total_maximum_marks || 100;
    const percentage = Math.round((displayScore / maxScore) * 100);
    const isApproved = result.approval_status === 'approved';

    return (
      <div className="max-w-4xl mx-auto pb-16 space-y-6 animate-fade-in">
        {/* Top Header Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setSelectedStudentSubmissionId(null)}
            className="flex items-center gap-2 text-xs text-[#9A9A9A] hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to All Results</span>
          </button>

          <div className="flex items-center gap-2">
            {isApproved ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Teacher Approved
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono bg-[#8052FF]/15 text-[#8052FF] border border-[#8052FF]/30">
                <Clock className="w-3.5 h-3.5" />
                Under Review
              </span>
            )}
          </div>
        </div>

        {/* Main Score Hero Card */}
        <div className="p-6 sm:p-8 rounded-2xl bg-[#0A0A0A] border border-white/[0.08] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-[#8052FF]/15 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase bg-white/[0.04] text-[#9A9A9A] border border-white/[0.06]">
                Evaluation Result
              </span>
              <h1 className="text-2xl sm:text-3xl font-medium text-white tracking-tight">
                Assessment Performance
              </h1>
              <p className="text-xs text-[#9A9A9A] font-light max-w-lg">
                {isApproved
                  ? 'Your teacher has reviewed your answers, verified the grading rubrics, and approved your final score.'
                  : 'Your submission has been evaluated on-device using local Qwen AI. Your instructor will review and finalize the score shortly.'}
              </p>
            </div>

            <div className="flex items-center gap-6 p-4 rounded-xl bg-black border border-white/[0.08] self-start md:self-auto">
              <div>
                <p className="text-[10px] font-mono uppercase text-[#777]">Final Score</p>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-3xl sm:text-4xl font-mono font-medium text-white">
                    {displayScore}
                  </span>
                  <span className="text-sm font-mono text-[#777]">/ {maxScore}</span>
                </div>
              </div>

              <div className="h-10 w-[1px] bg-white/[0.08]" />

              <div>
                <p className="text-[10px] font-mono uppercase text-[#777]">Percentage</p>
                <p
                  className={`text-2xl font-mono font-medium mt-0.5 ${
                    percentage >= 70
                      ? 'text-emerald-400'
                      : percentage >= 50
                      ? 'text-[#FFB829]'
                      : 'text-rose-400'
                  }`}
                >
                  {percentage}%
                </p>
              </div>
            </div>
          </div>

          {/* Teacher Feedback Banner */}
          {result.teacher_feedback && (
            <div className="mt-6 p-4 rounded-xl bg-[#8052FF]/10 border border-[#8052FF]/30 text-xs text-white space-y-1">
              <div className="flex items-center gap-1.5 font-medium text-[#8052FF]">
                <User className="w-3.5 h-3.5" />
                <span>Instructor Comments & Guidance</span>
              </div>
              <p className="text-[#DDD] italic leading-relaxed">
                "{result.teacher_feedback}"
              </p>
            </div>
          )}
        </div>

        {/* Topic Breakdown */}
        {result.topic_performance && result.topic_performance.length > 0 && (
          <div className="p-6 rounded-2xl bg-[#0A0A0A] border border-white/[0.08] space-y-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#8052FF]" />
              <h3 className="text-sm font-medium text-white">Curriculum Topic Mastery</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {result.topic_performance.map((tp: any, idx: number) => (
                <div key={idx} className="p-3.5 rounded-xl bg-black border border-white/[0.06] space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white font-medium">{tp.topic}</span>
                    <span className="font-mono text-[11px] text-[#9A9A9A]">
                      {tp.obtained_marks} / {tp.maximum_marks} ({Math.round(tp.percentage)}%)
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        tp.percentage >= 70
                          ? 'bg-emerald-400'
                          : tp.percentage >= 50
                          ? 'bg-[#FFB829]'
                          : 'bg-rose-400'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(5, tp.percentage))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Question by Question Detailed Evaluations */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-white px-1">
            Detailed Question Breakdown ({result.questions?.length || 0} Questions)
          </h3>

          {result.questions?.map((q: any, idx: number) => {
            const qScore = q.teacher_marks ?? q.suggested_marks;
            const qMax = q.maximum_marks || 10;
            const qPct = Math.round((qScore / qMax) * 100);

            return (
              <div
                key={idx}
                className="p-6 rounded-2xl bg-[#0A0A0A] border border-white/[0.08] space-y-4"
              >
                {/* Question Header */}
                <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-[#8052FF]/20 text-[#8052FF] font-mono text-xs font-medium flex items-center justify-center">
                      Q{q.question_number}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-white/[0.04] text-[#9A9A9A]">
                      {q.topic}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-medium text-white">
                      {qScore} / {qMax} pts
                    </span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                        qPct >= 70
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : qPct >= 50
                          ? 'bg-[#FFB829]/15 text-[#FFB829]'
                          : 'bg-rose-500/15 text-rose-400'
                      }`}
                    >
                      {q.rubric_match || (qPct >= 70 ? 'Strong' : 'Partial')}
                    </span>
                  </div>
                </div>

                {/* Question text */}
                <div>
                  <p className="text-[10px] font-mono text-[#777] uppercase mb-1">Question</p>
                  <p className="text-sm text-white font-normal leading-relaxed">{q.question_text}</p>
                </div>

                {/* Student's answer */}
                <div className="p-3.5 rounded-xl bg-black border border-white/[0.06]">
                  <p className="text-[10px] font-mono text-[#777] uppercase mb-1">Your Submitted Answer</p>
                  <p className="text-xs text-[#DDD] leading-relaxed whitespace-pre-wrap font-sans">
                    {q.student_answer || '[No answer submitted]'}
                  </p>
                </div>

                {/* AI Evaluation Analysis */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {q.strengths && (
                    <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-emerald-300">
                      <p className="text-[10px] font-mono uppercase text-emerald-400 mb-1">Demonstrated Strengths</p>
                      <p>{q.strengths}</p>
                    </div>
                  )}

                  {q.mistakes && (
                    <div className="p-3 rounded-xl bg-rose-500/5 border border-rose-500/20 text-rose-300">
                      <p className="text-[10px] font-mono uppercase text-rose-400 mb-1">Areas for Improvement</p>
                      <p>{q.mistakes}</p>
                    </div>
                  )}
                </div>

                {/* Teacher comments if any */}
                {q.teacher_feedback && (
                  <div className="p-3 rounded-xl bg-[#8052FF]/10 border border-[#8052FF]/20 text-xs text-white">
                    <p className="text-[10px] font-mono uppercase text-[#8052FF] mb-0.5">Instructor Comment</p>
                    <p className="italic">"{q.teacher_feedback}"</p>
                  </div>
                )}

                {/* Learning Gap & AI Tutor Bridge */}
                <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {q.learning_gap ? (
                    <div className="flex items-center gap-1.5 text-xs text-[#FFB829]">
                      <Lightbulb className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        Learning Gap: <strong className="font-normal text-white">{q.learning_gap}</strong>
                      </span>
                    </div>
                  ) : (
                    <div />
                  )}

                  <button
                    onClick={() => handleAskTutor(q.topic, q.question_text, q.learning_gap)}
                    className="px-3.5 py-1.5 rounded-xl bg-[#8052FF]/20 hover:bg-[#8052FF]/30 border border-[#8052FF]/40 text-xs font-medium text-white transition-all flex items-center justify-center gap-1.5 self-start sm:self-auto"
                  >
                    <Bot className="w-3.5 h-3.5 text-[#8052FF]" />
                    <span>Ask AI Tutor About This</span>
                    <ChevronRight className="w-3 h-3 text-[#8052FF]" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Remedial Recommendations */}
        {result.recommendations && result.recommendations.length > 0 && (
          <div className="p-6 rounded-2xl bg-[#0A0A0A] border border-white/[0.08] space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#FFB829]" />
              <h3 className="text-sm font-medium text-white">Targeted Next Steps & Recommendations</h3>
            </div>

            <div className="space-y-2">
              {result.recommendations.map((rec: any, idx: number) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-black border border-white/[0.06] text-xs text-[#CCC] flex items-start gap-2.5"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-[#8052FF] mt-1.5 shrink-0" />
                  <div className="space-y-0.5">
                    <span className="font-medium text-white block">{rec.topic}</span>
                    <p>{rec.recommendation}</p>
                    {rec.suggested_practice && (
                      <p className="text-[11px] text-[#8052FF] font-mono mt-1">
                        Practice: {rec.suggested_practice}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: MY RESULTS LIST OVERVIEW (Section 16 & Section 13)
  // =========================================================================

  const filteredResults = resultsList.filter(item => {
    const matchesFilter =
      filter === 'ALL'
        ? true
        : filter === 'APPROVED'
        ? item.status === 'APPROVED'
        : item.status !== 'APPROVED';

    const matchesSearch =
      item.assignment_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.teacher_name.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  const evaluatedCount = resultsList.filter(r => r.status === 'APPROVED').length;
  const underReviewCount = resultsList.filter(r => r.status !== 'APPROVED').length;
  const avgPct =
    evaluatedCount > 0
      ? Math.round(
          resultsList
            .filter(r => r.status === 'APPROVED' && r.percentage !== null && r.percentage !== undefined)
            .reduce((acc, r) => acc + (r.percentage || 0), 0) / evaluatedCount
        )
      : null;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 animate-fade-in">
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-[#0A0A0A] border border-white/[0.08] p-6 sm:p-8">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#8052FF]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase bg-[#8052FF]/20 text-[#8052FF] border border-[#8052FF]/30">
                Grades & Feedback
              </span>
              <span className="text-xs text-[#9A9A9A] font-light">Student Platform</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-medium text-white tracking-tight">
              My Assessment Results
            </h1>
            <p className="text-sm text-[#9A9A9A] mt-1 font-light max-w-xl">
              View your verified coursework scores, teacher feedback, and question-level rubric evaluations.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('student-assignments')}
              className="px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs text-white transition-colors flex items-center gap-2"
            >
              <BookOpen className="w-3.5 h-3.5 text-[#9A9A9A]" />
              <span>My Assignments</span>
            </button>
            <button
              onClick={fetchResultsList}
              disabled={loadingList}
              className="px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs text-white transition-colors flex items-center gap-2"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingList ? 'animate-spin text-[#8052FF]' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Quick Stat Counter Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-white/[0.06]">
          <div className="p-4 rounded-xl bg-black border border-white/[0.06]">
            <p className="text-[10px] font-mono text-[#777] uppercase">Total Completed</p>
            <p className="text-xl font-mono font-medium text-white mt-0.5">{resultsList.length}</p>
          </div>
          <div className="p-4 rounded-xl bg-black border border-white/[0.06]">
            <p className="text-[10px] font-mono text-[#777] uppercase">Evaluated</p>
            <p className="text-xl font-mono font-medium text-emerald-400 mt-0.5">{evaluatedCount}</p>
          </div>
          <div className="p-4 rounded-xl bg-black border border-white/[0.06]">
            <p className="text-[10px] font-mono text-[#777] uppercase">In Review</p>
            <p className="text-xl font-mono font-medium text-[#8052FF] mt-0.5">{underReviewCount}</p>
          </div>
          <div className="p-4 rounded-xl bg-black border border-white/[0.06]">
            <p className="text-[10px] font-mono text-[#777] uppercase">Average Score</p>
            <p className="text-xl font-mono font-medium text-white mt-0.5">
              {avgPct !== null ? `${avgPct}%` : '—'}
            </p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-[#0A0A0A] border border-white/[0.08] rounded-xl self-start">
          {(['ALL', 'APPROVED', 'UNDER_REVIEW'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filter === f
                  ? 'bg-[#8052FF] text-white shadow-sm'
                  : 'text-[#9A9A9A] hover:text-white'
              }`}
            >
              {f === 'ALL' ? 'All Results' : f === 'APPROVED' ? 'Evaluated' : 'Under Review'}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#777]" />
          <input
            type="text"
            placeholder="Search results..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-[#0A0A0A] border border-white/[0.08] rounded-xl text-xs text-white placeholder-[#555] focus:outline-none focus:border-[#8052FF] transition-colors"
          />
        </div>
      </div>

      {/* Error Banner */}
      {errorList && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between text-xs text-rose-300">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorList}</span>
          </div>
          <button onClick={fetchResultsList} className="underline hover:text-white">
            Retry
          </button>
        </div>
      )}

      {/* Results List Cards */}
      {loadingList ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="p-6 rounded-2xl bg-[#0A0A0A] border border-white/[0.08] animate-pulse space-y-4">
              <div className="h-4 bg-white/[0.05] rounded w-3/4" />
              <div className="h-3 bg-white/[0.03] rounded w-1/2" />
              <div className="h-8 bg-white/[0.04] rounded" />
            </div>
          ))}
        </div>
      ) : filteredResults.length === 0 ? (
        <div className="p-12 rounded-2xl bg-[#0A0A0A] border border-white/[0.08] text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto text-[#777]">
            <FileCheck className="w-6 h-6" />
          </div>
          <h3 className="text-base font-medium text-white">No evaluated results yet</h3>
          <p className="text-xs text-[#9A9A9A] max-w-md mx-auto">
            {searchQuery
              ? 'No results match your search query.'
              : filter !== 'ALL'
              ? `You currently have no results in filter "${filter}".`
              : 'Complete an assignment and wait for teacher evaluation to see your grades.'}
          </p>
          <div className="pt-2">
            <button
              onClick={() => setActiveTab('student-assignments')}
              className="px-4 py-2 rounded-xl bg-[#8052FF] hover:bg-[#6D3DF5] text-xs font-medium text-white shadow-sm transition-all"
            >
              View My Assignments
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredResults.map(item => {
            const isEvaluated = item.status === 'APPROVED';

            return (
              <div
                key={item.submission_id}
                className="group relative flex flex-col justify-between p-6 rounded-2xl bg-[#0A0A0A] border border-white/[0.08] hover:border-white/[0.16] transition-all duration-200"
              >
                <div>
                  {/* Top Metadata */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase bg-white/[0.04] text-[#9A9A9A] border border-white/[0.06]">
                      {item.subject}
                    </span>
                    {isEvaluated ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        <CheckCircle2 className="w-3 h-3" />
                        Evaluated
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono bg-[#8052FF]/15 text-[#8052FF] border border-[#8052FF]/30">
                        <Clock className="w-3 h-3" />
                        Under Review
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h3
                    onClick={() => setSelectedStudentSubmissionId(item.submission_id)}
                    className="text-base font-medium text-white tracking-tight cursor-pointer group-hover:text-[#8052FF] transition-colors mb-2"
                  >
                    {item.assignment_title}
                  </h3>

                  {/* Details */}
                  <div className="grid grid-cols-2 gap-2 text-xs text-[#9A9A9A] mb-4 font-light">
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-[#777]" />
                      <span className="truncate">{item.teacher_name}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-[#777]" />
                      <span>{item.total_maximum_marks} Max Marks</span>
                    </div>
                    {item.submitted_at && (
                      <div className="flex items-center gap-1.5 col-span-2">
                        <Calendar className="w-3.5 h-3.5 text-[#777]" />
                        <span>Submitted: {new Date(item.submitted_at).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>

                  {/* Under Review Message (Section 13 & 16) */}
                  {!isEvaluated && (
                    <div className="p-3.5 rounded-xl bg-[#8052FF]/5 border border-[#8052FF]/20 text-xs text-[#AAA] mb-4 space-y-1">
                      <div className="flex items-center gap-1.5 text-[#8052FF] font-medium text-[11px]">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Status: Under Review</span>
                      </div>
                      <p className="text-[11px] font-light">
                        Your result will appear after teacher evaluation.
                      </p>
                    </div>
                  )}

                  {/* Teacher Feedback Banner (Section 16) */}
                  {isEvaluated && item.teacher_feedback && (
                    <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] mb-4 text-xs text-[#CCC] italic space-y-1">
                      <span className="text-[10px] font-mono text-[#8052FF] uppercase block not-italic">
                        Teacher Feedback:
                      </span>
                      <p className="leading-relaxed">"{item.teacher_feedback}"</p>
                    </div>
                  )}
                </div>

                {/* Bottom Action Area */}
                <div className="pt-4 border-t border-white/[0.06] flex items-center justify-between gap-3">
                  {isEvaluated && item.final_score !== null && item.final_score !== undefined ? (
                    <div>
                      <span className="text-[10px] font-mono text-[#9A9A9A] uppercase block">Final Score</span>
                      <span className="text-base font-mono font-medium text-white">
                        {item.final_score} / {item.total_maximum_marks}{' '}
                        <span className="text-xs text-emerald-400">
                          ({item.percentage !== null && item.percentage !== undefined ? `${Math.round(item.percentage)}%` : ''})
                        </span>
                      </span>
                    </div>
                  ) : (
                    <div className="text-[11px] text-[#777] font-mono flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#8052FF]" />
                      <span>Pending final score</span>
                    </div>
                  )}

                  <button
                    onClick={() => setSelectedStudentSubmissionId(item.submission_id)}
                    className="px-4 py-2 rounded-xl bg-[#8052FF] hover:bg-[#6D3DF5] text-xs font-medium text-white transition-all flex items-center gap-1.5 shadow-sm"
                  >
                    <span>View Details</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
