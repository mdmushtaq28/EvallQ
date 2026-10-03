import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import type { StudentAssignmentItem } from '../types';
import {
  Calendar,
  User,
  Award,
  ArrowRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  RefreshCw,
  Search,
  BookOpen,
} from 'lucide-react';

export const StudentAssignmentsPage: React.FC = () => {
  const { setActiveTab, setSelectedAssignmentId, setSelectedStudentSubmissionId, currentUser } = useApp();
  const [assignments, setAssignments] = useState<StudentAssignmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'ASSIGNED' | 'UNDER_REVIEW' | 'APPROVED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const loadAssignments = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getStudentAssignments();
      setAssignments(data || []);
    } catch (err: any) {
      console.error('Failed to load student assignments:', err);
      setError(err?.message || 'Could not load your assigned coursework.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssignments();
  }, [currentUser]);

  const handleStartAssignment = (assignmentId: string) => {
    setSelectedAssignmentId(assignmentId);
    setActiveTab('student-solve');
  };

  const handleViewResult = (submissionId: string) => {
    setSelectedStudentSubmissionId(submissionId);
    setActiveTab('student-result');
  };

  const filteredAssignments = assignments.filter(item => {
    const matchesFilter =
      filter === 'ALL'
        ? true
        : filter === 'ASSIGNED'
        ? item.status === 'ASSIGNED' || item.status === 'NOT_STARTED'
        : item.status === filter;

    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.teacher_name.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3" />
            Approved
          </span>
        );
      case 'UNDER_REVIEW':
      case 'SUBMITTED':
      case 'EVALUATED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono bg-[#8052FF]/15 text-[#8052FF] border border-[#8052FF]/30">
            <Clock className="w-3 h-3" />
            Under Review
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono bg-[#FFB829]/15 text-[#FFB829] border border-[#FFB829]/30">
            <AlertCircle className="w-3 h-3" />
            Assigned
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 animate-fade-in">
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-[#0A0A0A] border border-white/[0.08] p-6 sm:p-8">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#8052FF]/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase bg-[#8052FF]/20 text-[#8052FF] border border-[#8052FF]/30">
                Coursework
              </span>
              <span className="text-xs text-[#9A9A9A] font-light">Student Platform</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-medium text-white tracking-tight">
              My Course Assignments
            </h1>
            <p className="text-sm text-[#9A9A9A] mt-1 font-light max-w-xl">
              Answer teacher-created questions directly on-platform. Your responses are evaluated against instructional rubrics with local Qwen AI and verified by your instructor.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadAssignments}
              disabled={loading}
              className="px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs text-white transition-colors flex items-center gap-2"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#8052FF]' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-[#0A0A0A] border border-white/[0.08] rounded-xl self-start">
          {(['ALL', 'ASSIGNED', 'UNDER_REVIEW', 'APPROVED'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filter === f
                  ? 'bg-[#8052FF] text-white shadow-sm'
                  : 'text-[#9A9A9A] hover:text-white'
              }`}
            >
              {f === 'ALL' ? 'All' : f === 'ASSIGNED' ? 'Assigned' : f === 'UNDER_REVIEW' ? 'Under Review' : 'Approved'}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#777]" />
          <input
            type="text"
            placeholder="Search assignments..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-[#0A0A0A] border border-white/[0.08] rounded-xl text-xs text-white placeholder-[#555] focus:outline-none focus:border-[#8052FF] transition-colors"
          />
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between text-xs text-rose-300">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={loadAssignments} className="underline hover:text-white">
            Retry
          </button>
        </div>
      )}

      {/* Assignments List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="p-6 rounded-2xl bg-[#0A0A0A] border border-white/[0.08] animate-pulse space-y-4">
              <div className="h-4 bg-white/[0.05] rounded w-3/4" />
              <div className="h-3 bg-white/[0.03] rounded w-1/2" />
              <div className="h-8 bg-white/[0.04] rounded" />
            </div>
          ))}
        </div>
      ) : filteredAssignments.length === 0 ? (
        <div className="p-12 rounded-2xl bg-[#0A0A0A] border border-white/[0.08] text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto text-[#777]">
            <BookOpen className="w-6 h-6" />
          </div>
          <h3 className="text-base font-medium text-white">No assignments found</h3>
          <p className="text-xs text-[#9A9A9A] max-w-md mx-auto">
            {searchQuery
              ? 'No assignments match your search query.'
              : filter !== 'ALL'
              ? `You currently have no assignments in status "${filter}".`
              : 'Your instructor has not published any assignments for your student account yet. Check back soon!'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredAssignments.map(asgn => {
            const isCompleted = asgn.status === 'APPROVED' || asgn.status === 'UNDER_REVIEW' || !!asgn.submission_id;
            return (
              <div
                key={asgn.id}
                className="group relative flex flex-col justify-between p-6 rounded-2xl bg-[#0A0A0A] border border-white/[0.08] hover:border-white/[0.16] transition-all duration-200"
              >
                <div>
                  {/* Top Metadata */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase bg-white/[0.04] text-[#9A9A9A] border border-white/[0.06]">
                      {asgn.subject}
                    </span>
                    {getStatusBadge(asgn.status)}
                  </div>

                  {/* Title */}
                  <h3 className="text-base font-medium text-white tracking-tight group-hover:text-[#8052FF] transition-colors mb-2">
                    {asgn.title}
                  </h3>

                  {/* Details */}
                  <div className="grid grid-cols-2 gap-2 text-xs text-[#9A9A9A] mb-4 font-light">
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-[#777]" />
                      <span className="truncate">{asgn.teacher_name}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-[#777]" />
                      <span>{asgn.total_maximum_marks} Maximum Marks</span>
                    </div>
                    {asgn.due_date && (
                      <div className="flex items-center gap-1.5 col-span-2">
                        <Calendar className="w-3.5 h-3.5 text-[#777]" />
                        <span>Due: {asgn.due_date}</span>
                      </div>
                    )}
                  </div>

                  {/* Feedback preview if approved */}
                  {asgn.teacher_feedback && (
                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] mb-4 text-xs text-[#BBB] italic">
                      "{asgn.teacher_feedback}"
                    </div>
                  )}
                </div>

                {/* Bottom Action Area */}
                <div className="pt-4 border-t border-white/[0.06] flex items-center justify-between">
                  {asgn.score !== null && asgn.score !== undefined ? (
                    <div>
                      <span className="text-[10px] font-mono text-[#9A9A9A] uppercase block">Result</span>
                      <span className="text-sm font-mono font-medium text-white">
                        {asgn.score} / {asgn.total_maximum_marks}{' '}
                        <span className="text-xs text-emerald-400">
                          ({Math.round((asgn.score / asgn.total_maximum_marks) * 100)}%)
                        </span>
                      </span>
                    </div>
                  ) : (
                    <div className="text-[11px] text-[#777] font-mono">
                      Ready to start
                    </div>
                  )}

                  {isCompleted ? (
                    <button
                      onClick={() => handleViewResult(asgn.submission_id || asgn.id)}
                      className="px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-medium text-white transition-colors flex items-center gap-1.5"
                    >
                      <span>View Results</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      onClick={() => handleStartAssignment(asgn.id)}
                      className="px-4 py-2 rounded-xl bg-[#8052FF] hover:bg-[#6D3DF5] text-xs font-medium text-white shadow-sm transition-all flex items-center gap-1.5"
                    >
                      <span>Solve Assignment</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
