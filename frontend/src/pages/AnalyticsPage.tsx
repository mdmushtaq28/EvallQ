import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from 'recharts';
import {
  Clock,
  Target,
  MessageSquare,
  FileText,
  Award,
  Database,
  Download,
  Calendar,
  ShieldCheck,
  RefreshCw,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { StatCard } from '../components/common/StatCard';
import { Card, CardHeader } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { api } from '../services/api';
import type { AnalyticsOverviewResponse, AnalyticsTrendsResponse } from '../types';

export const AnalyticsPage: React.FC = () => {
  const { isDemoMode } = useApp();
  const [overview, setOverview] = useState<AnalyticsOverviewResponse | null>(null);
  const [trends, setTrends] = useState<AnalyticsTrendsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Demo fallback datasets
  const demoWeeklyData = [
    { day: 'Mon', totalMinutes: 120, focusedMinutes: 102, awayMinutes: 18 },
    { day: 'Tue', totalMinutes: 90, focusedMinutes: 76, awayMinutes: 14 },
    { day: 'Wed', totalMinutes: 150, focusedMinutes: 132, awayMinutes: 18 },
    { day: 'Thu', totalMinutes: 110, focusedMinutes: 94, awayMinutes: 16 },
    { day: 'Fri', totalMinutes: 180, focusedMinutes: 156, awayMinutes: 24 },
    { day: 'Sat', totalMinutes: 210, focusedMinutes: 182, awayMinutes: 28 },
    { day: 'Sun', totalMinutes: 140, focusedMinutes: 118, awayMinutes: 22 },
  ];

  const demoSessionScores = [
    { session: 'S-1', score: 78 },
    { session: 'S-2', score: 82 },
    { session: 'S-3', score: 80 },
    { session: 'S-4', score: 85 },
    { session: 'S-5', score: 88 },
    { session: 'S-6', score: 84 },
    { session: 'S-7', score: 91 },
  ];

  const fetchAnalytics = async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const [overviewData, trendsData] = await Promise.all([
        api.getAnalyticsOverview(),
        api.getAnalyticsTrends(),
      ]);
      setOverview(overviewData);
      setTrends(trendsData);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch analytics from local database.';
      setError(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const handleExport = async () => {
    setExporting(true);
    try {
      await api.downloadExportFile();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to export study data.';
      alert(`Export error: ${msg}`);
    } finally {
      setExporting(false);
    }
  };

  // Determine chart datasets
  const hasRealWeeklyData = trends && trends.weekly_data.some(d => d.totalMinutes > 0);
  const chartWeeklyData = hasRealWeeklyData
    ? trends.weekly_data
    : isDemoMode
    ? demoWeeklyData
    : (trends?.weekly_data || demoWeeklyData);

  const hasRealSessionScores = trends && trends.session_scores.length > 0;
  const chartSessionScores = hasRealSessionScores
    ? trends.session_scores
    : isDemoMode
    ? demoSessionScores
    : [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-[24px] bg-[#0A0A0A] border border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Badge variant="brand" size="sm">
              Study Telemetry
            </Badge>
            <div className="flex items-center gap-1.5 text-xs text-[#9A9A9A] font-mono">
              <Database className="w-3.5 h-3.5 text-[#8052FF]" />
              <span>SQLite: Local Database (Private)</span>
            </div>
          </div>
          <h2 className="text-xl font-normal tracking-tight text-white">
            Performance & Attention Analytics
          </h2>
          <p className="text-xs text-[#9A9A9A] font-light mt-0.5">
            Computed strictly on-device from your study sessions and local AI interactions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            icon={<RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />}
            onClick={() => fetchAnalytics(true)}
            disabled={loading || refreshing}
          >
            Refresh
          </Button>

          <Button
            variant="outline"
            size="sm"
            icon={exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            onClick={handleExport}
            disabled={exporting}
          >
            {exporting ? 'Exporting...' : 'Export Local Data (JSON)'}
          </Button>
        </div>
      </div>

      {/* Error Notice */}
      {error && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Study Time"
          value={
            overview && overview.total_sessions_count > 0
              ? overview.total_study_time_formatted
              : isDemoMode
              ? '16.7 hrs'
              : '0 min'
          }
          subtext={
            overview && overview.total_sessions_count > 0
              ? `Across ${overview.total_sessions_count} focus sessions`
              : isDemoMode
              ? 'Across 7 active days'
              : 'Recorded via Focus sessions'
          }
          icon={<Clock className="w-5 h-5 text-indigo-500" />}
          accentColor="indigo"
          trend={isDemoMode ? { value: '+2.4h this week', positive: true } : undefined}
        />
        <StatCard
          label="Overall Focus Score"
          value={
            overview && overview.total_study_time_seconds > 0
              ? `${overview.overall_focus_score}%`
              : isDemoMode
              ? '84.2%'
              : '--%'
          }
          subtext="Derived from face presence time"
          icon={<Target className="w-5 h-5 text-emerald-500" />}
          accentColor="emerald"
        />
        <StatCard
          label="AI Questions Answered"
          value={
            overview
              ? overview.ai_questions_answered.toString()
              : isDemoMode
              ? '48'
              : '0'
          }
          subtext="Processed by local LLM"
          icon={<MessageSquare className="w-5 h-5 text-amber-500" />}
          accentColor="amber"
        />
        <StatCard
          label="Documents Analyzed"
          value={
            overview
              ? overview.documents_analyzed.toString()
              : isDemoMode
              ? '6'
              : '0'
          }
          subtext="Processed via PyMuPDF"
          icon={<FileText className="w-5 h-5 text-rose-500" />}
          accentColor="rose"
        />
      </div>

      {/* Secondary Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium">Focused Study Time</span>
            <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 font-mono mt-1">
              {overview && overview.total_study_time_seconds > 0
                ? overview.focused_study_time_formatted
                : isDemoMode
                ? '14.1 hrs'
                : '0 min'}
            </div>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {overview && overview.total_study_time_seconds > 0
              ? `${overview.overall_focus_score}% of total`
              : isDemoMode
              ? '84% of total'
              : '0%'}
          </span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium">Away / Inactive Time</span>
            <div className="text-xl font-bold text-amber-600 dark:text-amber-400 font-mono mt-1">
              {overview && overview.total_study_time_seconds > 0
                ? overview.away_study_time_formatted
                : isDemoMode
                ? '2.6 hrs'
                : '0 min'}
            </div>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {overview && overview.total_study_time_seconds > 0
              ? `${Math.max(0, Math.round(100 - overview.overall_focus_score))}% of total`
              : isDemoMode
              ? '16% of total'
              : '0%'}
          </span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium">Quiz Sessions Completed</span>
            <div className="text-xl font-bold text-indigo-600 dark:text-indigo-400 font-mono mt-1">
              {overview
                ? overview.quiz_sessions_completed.toString()
                : isDemoMode
                ? '9'
                : '0'}
            </div>
          </div>
          <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500">
            <Award className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Visual Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Study Time vs Focus Time */}
        <Card>
          <CardHeader
            title="Weekly Study Duration & Focus Time"
            subtitle="Minutes logged per day (Mon - Sun)"
            icon={<Calendar className="w-5 h-5" />}
          />

          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartWeeklyData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={12} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    borderRadius: '8px',
                    border: '1px solid #334155',
                    color: '#f8fafc',
                    fontSize: '12px',
                  }}
                  formatter={(val: any) => [`${val ?? 0} min`, '']}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar
                  dataKey="totalMinutes"
                  name="Total Time (min)"
                  fill="#6366f1"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="focusedMinutes"
                  name="Focused Time (min)"
                  fill="#10b981"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Focus Score Progression */}
        <Card>
          <CardHeader
            title="Focus Score Trend Over Sessions"
            subtitle="Percentage of observable attentive presence per session"
            icon={<Target className="w-5 h-5" />}
          />

          <div className="h-72 w-full pt-2">
            {chartSessionScores.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartSessionScores}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="session" stroke="#94a3b8" fontSize={12} tickLine={false} />
                  <YAxis
                    domain={[0, 100]}
                    stroke="#94a3b8"
                    fontSize={12}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      borderRadius: '8px',
                      border: '1px solid #334155',
                      color: '#f8fafc',
                      fontSize: '12px',
                    }}
                    formatter={(val: any) => [`${val ?? 0}%`, 'Focus Score']}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Line
                    type="monotone"
                    dataKey="score"
                    name="Focus Score (%)"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#10b981' }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                <Target className="w-8 h-8 mb-2 opacity-40 text-slate-500" />
                <p className="text-xs">No focus session history available yet.</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Complete focus sessions in the Focus Mode tab to see score progression.
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Local Storage Transparency */}
      <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>
            Database schema: <code>documents</code>, <code>document_chunks</code>, <code>focus_sessions</code>, <code>study_interactions</code>. Stored locally without external cloud sync.
          </span>
        </div>
        <span className="font-mono text-[11px] text-slate-400">SQLite v3.x Engine</span>
      </div>
    </div>
  );
};
