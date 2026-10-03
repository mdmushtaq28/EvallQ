import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import type { AssessmentEvaluationResponse } from '../types';
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
} from 'lucide-react';

export const StudentResultPage: React.FC = () => {
  const {
    selectedStudentSubmissionId,
    setActiveTab,
    setTutorInitialPrompt,
  } = useApp();

  const [result, setResult] = useState<AssessmentEvaluationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedStudentSubmissionId) {
      setActiveTab('student-assignments');
      return;
    }

    const fetchResult = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await api.getStudentSubmission(selectedStudentSubmissionId);
        setResult(data);
      } catch (err: any) {
        console.error('Failed to load student result:', err);
        setError(err?.message || 'Could not load your evaluated submission.');
      } finally {
        setLoading(false);
      }
    };

    fetchResult();
  }, [selectedStudentSubmissionId]);

  const handleAskTutor = (topic: string, questionText: string, learningGap?: string) => {
    const prompt = `I am reviewing my assignment evaluation. For Question: "${questionText}", my identified learning gap in "${topic}" was: "${learningGap || 'conceptual understanding'}". Can you guide me through this step-by-step so I can master this concept?`;
    setTutorInitialPrompt(prompt);
    setActiveTab('tutor');
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-[#8052FF]/10 border border-[#8052FF]/30 flex items-center justify-center mx-auto text-[#8052FF] animate-pulse">
          <Brain className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-medium text-white">Loading your evaluation results...</h3>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="max-w-xl mx-auto py-12 space-y-4 text-center">
        <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 space-y-3">
          <AlertCircle className="w-8 h-8 mx-auto" />
          <h3 className="text-base font-medium">Evaluation Not Found</h3>
          <p className="text-xs">{error || 'Unable to retrieve evaluation data.'}</p>
          <button
            onClick={() => setActiveTab('student-assignments')}
            className="px-4 py-2 bg-rose-500 text-white rounded-xl text-xs font-medium"
          >
            Back to Assignments
          </button>
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
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setActiveTab('student-assignments')}
          className="flex items-center gap-2 text-xs text-[#9A9A9A] hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Assignments</span>
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
              AI Evaluated (Pending Final Teacher Review)
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
              <p className={`text-2xl font-mono font-medium mt-0.5 ${percentage >= 70 ? 'text-emerald-400' : percentage >= 50 ? 'text-[#FFB829]' : 'text-rose-400'}`}>
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
                      tp.percentage >= 70 ? 'bg-emerald-400' : tp.percentage >= 50 ? 'bg-[#FFB829]' : 'bg-rose-400'
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
                    <span>Learning Gap: <strong className="font-normal text-white">{q.learning_gap}</strong></span>
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
};
