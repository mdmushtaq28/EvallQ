import React, { useState, useEffect } from 'react';
import {
  Clock,
  Target,
  MessageSquare,
  FileText,
  Bot,
  Upload,
  Play,
  Cpu,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { StatCard } from '../components/common/StatCard';
import { Card, CardHeader } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { api } from '../services/api';
import type { AnalyticsOverviewResponse } from '../types';

export const DashboardPage: React.FC = () => {
  const {
    setActiveTab,
    isDemoMode,
    systemStatus,
    modelStatus,
    backendConnected,
    backendLoading,
    retryBackendConnection,
  } = useApp();

  const [overview, setOverview] = useState<AnalyticsOverviewResponse | null>(null);

  useEffect(() => {
    if (backendConnected) {
      api.getAnalyticsOverview().then(setOverview).catch(() => {});
    }
  }, [backendConnected]);

  const formatModelStatus = (status?: string, model?: string | null) => {
    if (status === 'ready') {
      return `Ready (${model || 'Active'})`;
    }
    if (!status || status === 'not_initialized') {
      return 'Planned / Not Initialized';
    }
    return status;
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Hero / Greeting Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-900/60 via-slate-900 to-slate-900 border border-indigo-500/20 p-6 lg:p-8">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3" />
                Built for Snapdragon AI PCs
              </span>
              <Badge variant="success" dot size="sm">
                ON-DEVICE AI
              </Badge>
            </div>
            <h2 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
              {getGreeting()}, Scholar.
            </h2>
            <p className="mt-1 text-sm text-slate-300 font-medium">
              Learn smarter. Stay focused. Keep your data on your device.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="primary"
              size="sm"
              icon={<Bot className="w-4 h-4" />}
              onClick={() => setActiveTab('tutor')}
            >
              Ask AI Tutor
            </Button>
            <Button
              variant="outline"
              size="sm"
              icon={<Upload className="w-4 h-4" />}
              onClick={() => setActiveTab('study')}
            >
              Upload Material
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={<Play className="w-4 h-4" />}
              onClick={() => setActiveTab('focus')}
            >
              Start Focus Session
            </Button>
          </div>
        </div>

        {/* Subtle decorative glow */}
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Today's Study Time"
          value={
            overview && overview.total_sessions_count > 0
              ? overview.total_study_time_formatted
              : isDemoMode
              ? '42 min'
              : '0 min'
          }
          subtext={
            overview && overview.total_sessions_count > 0
              ? `Logged via ${overview.total_sessions_count} sessions`
              : isDemoMode
              ? 'Goal: 60 min'
              : 'Start a focus session today'
          }
          icon={<Clock className="w-5 h-5 text-indigo-500" />}
          accentColor="indigo"
          trend={isDemoMode ? { value: '+14% vs yesterday', positive: true } : undefined}
        />
        <StatCard
          label="Focus Score"
          value={
            overview && overview.total_study_time_seconds > 0
              ? `${overview.overall_focus_score}%`
              : isDemoMode
              ? '84%'
              : '--%'
          }
          subtext={isDemoMode ? 'Attentive screen presence' : 'Calculated from webcam observations'}
          icon={<Target className="w-5 h-5 text-emerald-500" />}
          accentColor="emerald"
        />
        <StatCard
          label="AI Questions"
          value={
            overview
              ? overview.ai_questions_answered.toString()
              : isDemoMode
              ? '12'
              : '0'
          }
          subtext="Processed on local LLM runtime"
          icon={<MessageSquare className="w-5 h-5 text-amber-500" />}
          accentColor="amber"
        />
        <StatCard
          label="Documents Studied"
          value={
            overview
              ? overview.documents_analyzed.toString()
              : isDemoMode
              ? '3'
              : '0'
          }
          subtext="Indexed locally via PyMuPDF"
          icon={<FileText className="w-5 h-5 text-rose-500" />}
          accentColor="rose"
        />
      </div>

      {/* Main Grid: Recent Activity & System/Model Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Study Activity (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader
              title="Recent Study Activity"
              subtitle="Local session logs and extracted study materials"
              action={
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveTab('analytics')}
                >
                  View Details
                </Button>
              }
            />

            {isDemoMode ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500">
                      <Target className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                        Focus Session: Distributed Systems
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Duration: 35 min • Focus score: 86%
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">1h ago</span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                        Analyzed: Lecture_04_OOP_Concepts.pdf
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Extracted 18 pages • Generated 5 flashcards
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">3h ago</span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                        AI Tutor: Polymorphism in Java
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Resolved query in 3 turns
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">Yesterday</span>
                </div>
              </div>
            ) : (
              <div className="py-10 text-center flex flex-col items-center">
                <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center text-slate-400 mb-3">
                  <Clock className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  No study sessions recorded yet
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1 mb-4">
                  Start your first focus session, analyze a PDF, or ask the AI Tutor to see your learning history here.
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveTab('study')}
                  >
                    Upload Document
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setActiveTab('focus')}
                  >
                    Start Focus
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Model & Architecture Status (1 col) */}
        <div className="space-y-4">
          <Card>
            <CardHeader
              title="On-Device AI Engine"
              subtitle="Runtime & Hardware Architecture"
              icon={<Cpu className="w-5 h-5" />}
            />

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">Current Dev Env</span>
                <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                  {modelStatus?.target.development_environment || `Host ${systemStatus.activeDevice} / x86_64`}
                </span>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">Snapdragon Target</span>
                <span className="font-mono font-semibold text-rose-500">
                  {modelStatus?.snapdragon?.device || 'Snapdragon X Series'}
                </span>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">Snapdragon Validation</span>
                <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
                  {modelStatus?.snapdragon?.validated ? 'Validated' : 'Target / Not Yet Validated'}
                </span>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">Local LLM</span>
                <span className="font-mono text-emerald-500 font-medium">
                  {formatModelStatus(modelStatus?.llm.status, modelStatus?.llm.model)}
                </span>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">Local Speech Recognizer</span>
                <span className="font-mono text-emerald-500 font-medium">
                  {formatModelStatus(modelStatus?.speech.status, modelStatus?.speech.model)}
                </span>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">Vision Attention Monitor</span>
                <span className="font-mono text-emerald-500 font-medium">
                  {formatModelStatus(modelStatus?.vision.status, modelStatus?.vision.model)}
                </span>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">Vector Embeddings</span>
                <span className="font-mono text-emerald-500 font-medium">
                  {formatModelStatus(modelStatus?.embeddings?.status, modelStatus?.embeddings?.model || 'bge-small-en-v1.5')}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Local Database</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">
                  SQLite (Local / Private)
                </span>
              </div>
            </div>

            {/* Backend Offline Notice if disconnected */}
            {!backendConnected && !backendLoading && (
              <div className="mt-3 p-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                <span>Backend offline — Start FastAPI to sync runtime.</span>
                <button
                  onClick={retryBackendConnection}
                  className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline ml-2"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Privacy Promise Box */}
            <div className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block">Privacy First</span>
                <span className="text-[11px] text-emerald-600/90 dark:text-emerald-300/80 block">
                  All 4 AI models run locally. Zero student audio, prompts, or video frames leave this device.
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Stage 9: Snapdragon Optimization & Migration Section */}
      <Card>
        <CardHeader
          title="Snapdragon AI Optimization & Migration Architecture"
          subtitle="Hardware-Targeted Offloading & Qualcomm AI Hub Model Mapping"
          icon={<Cpu className="w-5 h-5 text-indigo-400" />}
          action={
            <Badge variant="brand" size="sm">
              Stage 9: Snapdragon Ready
            </Badge>
          }
        />

        <div className="space-y-6 pt-2">
          {/* Environment Comparison Strip */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Current Development Runtime
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Host Validated
                </span>
              </div>
              <div className="text-sm font-bold text-slate-800 dark:text-slate-100 font-mono">
                Host CPU (x86_64)
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                4 local models active on Host CPU via ONNX Runtime, CTranslate2, FastEmbed, and Ollama.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Target Deployment Platform
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Target Identified
                </span>
              </div>
              <div className="text-sm font-bold text-slate-800 dark:text-slate-100 font-mono text-rose-500">
                Qualcomm Snapdragon X Elite / Plus
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Dedicated 45 TOPS Hexagon NPU offload via Qualcomm AI Engine Direct (QNN) & ONNX Runtime.
              </p>
            </div>
          </div>

          {/* Model Mapping & Optimization Matrix */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-2.5 px-3">Component</th>
                  <th className="py-2.5 px-3">Host Development Model</th>
                  <th className="py-2.5 px-3">Candidate Qualcomm AI Hub Model</th>
                  <th className="py-2.5 px-3">Snapdragon Target Runtime</th>
                  <th className="py-2.5 px-3">Optimization Status</th>
                  <th className="py-2.5 px-3">Validation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono text-[11px]">
                <tr>
                  <td className="py-3 px-3 font-semibold text-slate-800 dark:text-slate-200">Vision</td>
                  <td className="py-3 px-3 text-slate-600 dark:text-slate-300">UltraFace-320 (1.21 MB ONNX)</td>
                  <td className="py-3 px-3 text-indigo-500 dark:text-indigo-400">MediaPipe-Face-Detection</td>
                  <td className="py-3 px-3 text-slate-500">ONNX Runtime (QNN EP / Hexagon NPU)</td>
                  <td className="py-3 px-3">
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      TARGET IDENTIFIED
                    </span>
                  </td>
                  <td className="py-3 px-3 text-slate-400">Host (19.8ms) / Target Pending</td>
                </tr>
                <tr>
                  <td className="py-3 px-3 font-semibold text-slate-800 dark:text-slate-200">Speech</td>
                  <td className="py-3 px-3 text-slate-600 dark:text-slate-300">Whisper-tiny.en (39 MB INT8)</td>
                  <td className="py-3 px-3 text-indigo-500 dark:text-indigo-400">Whisper-Base (w8a16/INT8)</td>
                  <td className="py-3 px-3 text-slate-500">Qualcomm Voice AI SDK / QNN EP</td>
                  <td className="py-3 px-3">
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      TARGET IDENTIFIED
                    </span>
                  </td>
                  <td className="py-3 px-3 text-slate-400">Host (107ms) / Target Pending</td>
                </tr>
                <tr>
                  <td className="py-3 px-3 font-semibold text-slate-800 dark:text-slate-200">Embeddings</td>
                  <td className="py-3 px-3 text-slate-600 dark:text-slate-300">bge-small-en-v1.5 (67 MB)</td>
                  <td className="py-3 px-3 text-indigo-500 dark:text-indigo-400">Nomic-Embed-Text</td>
                  <td className="py-3 px-3 text-slate-500">ONNX Runtime (QNN EP / Hexagon NPU)</td>
                  <td className="py-3 px-3">
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      TARGET IDENTIFIED
                    </span>
                  </td>
                  <td className="py-3 px-3 text-slate-400">Host (10.7ms) / Target Pending</td>
                </tr>
                <tr>
                  <td className="py-3 px-3 font-semibold text-slate-800 dark:text-slate-200">LLM</td>
                  <td className="py-3 px-3 text-slate-600 dark:text-slate-300">qwen2.5:0.5b (397 MB)</td>
                  <td className="py-3 px-3 text-indigo-500 dark:text-indigo-400">Qwen2.5-0.5B / Llama-3.2-1B</td>
                  <td className="py-3 px-3 text-slate-500">Ollama (ARM64) / Qualcomm GenieX</td>
                  <td className="py-3 px-3">
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      TARGET IDENTIFIED
                    </span>
                  </td>
                  <td className="py-3 px-3 text-slate-400">Host (109 tok/s) / Target Pending</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Technical Disclosure Notice */}
          <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>
                <strong>Qualcomm AI Stack Compliance:</strong> Models follow standard ONNX and QNN Execution Provider specifications. Physical NPU validation is scheduled for Qualcomm AI Hub / Snapdragon hardware deployment.
              </span>
            </span>
            <span className="font-mono text-[11px] text-slate-400 hidden sm:inline">
              Docs: docs/snapdragon-architecture.md
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
};
