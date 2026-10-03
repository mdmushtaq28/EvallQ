import React, { useState, useEffect } from 'react';
import {
  Clock,
  Target,
  MessageSquare,
  FileText,
  Bot,
  Cpu,
  ShieldCheck,
  ArrowRight,
  GraduationCap,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { StatCard } from '../components/common/StatCard';
import { Card, CardHeader } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { NeuralConstellation } from '../components/common/NeuralConstellation';
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
      return 'Planned / Standby';
    }
    return status;
  };

  return (
    <div className="space-y-10 max-w-7xl mx-auto pb-12">
      {/* ============================================================
          DALA-STYLE HERO SECTION
          Pure black background, left editorial typography, right 3D neural constellation
          ============================================================ */}
      <section className="relative overflow-hidden rounded-[28px] bg-black border border-white/[0.08] p-8 lg:p-12 xl:p-14">
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: Editorial Brand Headline */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-[#8052FF] animate-pulse" />
              <span className="font-mono tracking-widest text-[#BDBDBD] text-[10px] uppercase">
                AI-POWERED EDUCATION
              </span>
            </div>

            <div className="space-y-3">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-normal tracking-[-0.03em] text-white leading-[1.08]">
                Evaluate less.<br />
                <span className="text-[#8052FF]">Teach more.</span>
              </h1>
              <p className="text-base sm:text-lg text-[#9A9A9A] font-light max-w-xl leading-relaxed pt-2">
                EvallQ connects real paper assessments directly to student concept mastery.
                Local OCR, rubric-based AI scoring, and zero-telemetry private tutoring.
              </p>
            </div>

            {/* CTAs */}
            <div className="pt-2 flex flex-wrap items-center gap-4">
              <Button
                variant="primary"
                size="lg"
                icon={<ArrowRight className="w-4 h-4" />}
                iconPosition="right"
                onClick={() => setActiveTab('assessment')}
              >
                Start Evaluating
              </Button>
              <button
                onClick={() => {
                  const el = document.getElementById('platform-architecture');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                  else setActiveTab('tutor');
                }}
                className="text-sm font-normal text-[#9A9A9A] hover:text-white transition-colors flex items-center gap-1.5 py-2 px-3 tracking-tight"
              >
                <span>Explore the Platform</span>
                <ChevronRight className="w-4 h-4 text-[#8052FF]" />
              </button>
            </div>

            {/* Quick Metrics Bar in Hero */}
            <div className="pt-6 border-t border-white/[0.06] grid grid-cols-3 gap-6 max-w-lg">
              <div>
                <p className="text-2xl font-light text-white tracking-tight">100%</p>
                <p className="text-[11px] text-[#9A9A9A] font-light uppercase tracking-wider mt-0.5">On-Device AI</p>
              </div>
              <div>
                <p className="text-2xl font-light text-white tracking-tight">RapidOCR</p>
                <p className="text-[11px] text-[#9A9A9A] font-light uppercase tracking-wider mt-0.5">Real Extraction</p>
              </div>
              <div>
                <p className="text-2xl font-light text-[#FFB829] tracking-tight">Qwen 2.5</p>
                <p className="text-[11px] text-[#9A9A9A] font-light uppercase tracking-wider mt-0.5">Rubric Engine</p>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive 3D Neural Constellation */}
          <div className="lg:col-span-5 h-[340px] sm:h-[400px] lg:h-[460px] relative rounded-[24px] overflow-hidden bg-black flex items-center justify-center border border-white/[0.04]">
            <NeuralConstellation particleCount={70} interactive={true} />
            <div className="absolute bottom-4 right-4 pointer-events-none">
              <span className="text-[10px] font-mono text-[#9A9A9A]/60 px-2.5 py-1 rounded-full bg-black/60 border border-white/[0.06]">
                Interactive Neural Field
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          METRICS ROW (Editorial Dala StatCards)
          ============================================================ */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
          icon={<Clock className="w-5 h-5 text-[#8052FF]" />}
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
          icon={<Target className="w-5 h-5 text-[#34D399]" />}
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
          icon={<MessageSquare className="w-5 h-5 text-[#FFB829]" />}
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
          icon={<FileText className="w-5 h-5 text-rose-400" />}
          accentColor="rose"
        />
      </section>

      {/* ============================================================
          PRIMARY WORKFLOW TILES (Minimal, functional, high-contrast)
          ============================================================ */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div
          onClick={() => setActiveTab('assessment')}
          className="group p-6 rounded-[24px] bg-[#0A0A0A] border border-white/[0.08] hover:border-white/[0.2] hover:bg-[#111111] transition-all cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-full bg-[#8052FF]/15 border border-[#8052FF]/30 flex items-center justify-center text-[#8052FF]">
                <GraduationCap className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.05] text-[#BDBDBD] border border-white/[0.08]">
                CORE WORKFLOW
              </span>
            </div>
            <h3 className="text-lg font-normal tracking-tight text-white mb-2 group-hover:text-[#9A75FF] transition-colors">
              Assessment Intelligence
            </h3>
            <p className="text-xs text-[#9A9A9A] font-light leading-relaxed">
              Upload scanned or photographed student assessments. Run real local OCR, extract answers, and compute rubric scores.
            </p>
          </div>
          <div className="mt-5 pt-4 border-t border-white/[0.06] flex items-center justify-between text-xs text-white">
            <span className="font-light text-[#9A9A9A]">Evaluate Assessment</span>
            <ArrowRight className="w-4 h-4 text-[#8052FF] group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        <div
          onClick={() => setActiveTab('tutor')}
          className="group p-6 rounded-[24px] bg-[#0A0A0A] border border-white/[0.08] hover:border-white/[0.2] hover:bg-[#111111] transition-all cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-full bg-[#FFB829]/15 border border-[#FFB829]/30 flex items-center justify-center text-[#FFB829]">
                <Bot className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.05] text-[#BDBDBD] border border-white/[0.08]">
                LOCAL LLM
              </span>
            </div>
            <h3 className="text-lg font-normal tracking-tight text-white mb-2 group-hover:text-[#FFB829] transition-colors">
              Personalized AI Tutor
            </h3>
            <p className="text-xs text-[#9A9A9A] font-light leading-relaxed">
              Targeted conversational remediation connected directly to weak assessment topics and student learning gaps.
            </p>
          </div>
          <div className="mt-5 pt-4 border-t border-white/[0.06] flex items-center justify-between text-xs text-white">
            <span className="font-light text-[#9A9A9A]">Open Tutor</span>
            <ArrowRight className="w-4 h-4 text-[#FFB829] group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        <div
          onClick={() => setActiveTab('study')}
          className="group p-6 rounded-[24px] bg-[#0A0A0A] border border-white/[0.08] hover:border-white/[0.2] hover:bg-[#111111] transition-all cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-full bg-[#15846E]/20 border border-[#15846E]/40 flex items-center justify-center text-[#34D399]">
                <Layers className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.05] text-[#BDBDBD] border border-white/[0.08]">
                RAG + CHUNKING
              </span>
            </div>
            <h3 className="text-lg font-normal tracking-tight text-white mb-2 group-hover:text-[#34D399] transition-colors">
              Smart Study Materials
            </h3>
            <p className="text-xs text-[#9A9A9A] font-light leading-relaxed">
              Ingest syllabi, lecture slides, and course readings. Generate instant summaries, practice quizzes, and recall flashcards.
            </p>
          </div>
          <div className="mt-5 pt-4 border-t border-white/[0.06] flex items-center justify-between text-xs text-white">
            <span className="font-light text-[#9A9A9A]">Upload Materials</span>
            <ArrowRight className="w-4 h-4 text-[#15846E] group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </section>

      {/* ============================================================
          MAIN GRID: RECENT ACTIVITY & ENGINE STATUS
          ============================================================ */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Study Activity (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader
              title="Recent Learning Activity"
              subtitle="Session records, assessment submissions, and study logs"
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
                <div className="flex items-center justify-between p-4 rounded-[18px] bg-black/60 border border-white/[0.06]">
                  <div className="flex items-center gap-3.5">
                    <div className="p-2.5 rounded-full bg-[#8052FF]/10 text-[#8052FF] border border-[#8052FF]/20">
                      <GraduationCap className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-normal text-white">
                        Assessment Evaluated: Distributed Systems Exam
                      </h4>
                      <p className="text-xs text-[#9A9A9A] font-light mt-0.5">
                        Score: 23 / 30 (76.7%) • 2 learning gaps identified
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-[#9A9A9A] font-mono">1h ago</span>
                </div>

                <div className="flex items-center justify-between p-4 rounded-[18px] bg-black/60 border border-white/[0.06]">
                  <div className="flex items-center gap-3.5">
                    <div className="p-2.5 rounded-full bg-[#15846E]/15 text-[#34D399] border border-[#15846E]/30">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-normal text-white">
                        Analyzed: Lecture_04_OOP_Concepts.pdf
                      </h4>
                      <p className="text-xs text-[#9A9A9A] font-light mt-0.5">
                        Extracted 18 pages • Generated 5 flashcards
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-[#9A9A9A] font-mono">3h ago</span>
                </div>

                <div className="flex items-center justify-between p-4 rounded-[18px] bg-black/60 border border-white/[0.06]">
                  <div className="flex items-center gap-3.5">
                    <div className="p-2.5 rounded-full bg-[#FFB829]/15 text-[#FFB829] border border-[#FFB829]/30">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-normal text-white">
                        AI Tutor: Polymorphism in Java
                      </h4>
                      <p className="text-xs text-[#9A9A9A] font-light mt-0.5">
                        Resolved student query in 3 turns
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-[#9A9A9A] font-mono">Yesterday</span>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-[#9A9A9A] mb-3">
                  <Clock className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-normal text-white">
                  No learning sessions recorded yet
                </h4>
                <p className="text-xs text-[#9A9A9A] font-light max-w-sm mt-1 mb-5">
                  Upload an assessment, analyze course notes, or ask the AI Tutor to start your learning telemetry.
                </p>
                <div className="flex items-center gap-3">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setActiveTab('assessment')}
                  >
                    Upload Assessment
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setActiveTab('tutor')}
                  >
                    Ask AI Tutor
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
              <div className="flex items-center justify-between pb-2.5 border-b border-white/[0.06]">
                <span className="text-[#9A9A9A] font-light">Host Environment</span>
                <span className="font-mono text-white">
                  {modelStatus?.target?.development_environment || `Host ${systemStatus.activeDevice} / x86_64`}
                </span>
              </div>

              <div className="flex items-center justify-between pb-2.5 border-b border-white/[0.06]">
                <span className="text-[#9A9A9A] font-light">Inference Engine</span>
                <span className="font-mono text-[#8052FF] font-medium">
                  {modelStatus?.target?.platform || 'EvallQ On-Device AI'}
                </span>
              </div>

              <div className="flex items-center justify-between pb-2.5 border-b border-white/[0.06]">
                <span className="text-[#9A9A9A] font-light">Engine Status</span>
                <span className="font-mono text-[11px] px-2 py-0.5 rounded-full bg-[#15846E]/15 text-[#34D399] border border-[#15846E]/30 font-medium">
                  Active / On-Device
                </span>
              </div>

              <div className="flex items-center justify-between pb-2.5 border-b border-white/[0.06]">
                <span className="text-[#9A9A9A] font-light">Local LLM</span>
                <span className="font-mono text-white">
                  {formatModelStatus(modelStatus?.llm.status, modelStatus?.llm.model)}
                </span>
              </div>

              <div className="flex items-center justify-between pb-2.5 border-b border-white/[0.06]">
                <span className="text-[#9A9A9A] font-light">Speech Transcriber</span>
                <span className="font-mono text-white">
                  {formatModelStatus(modelStatus?.speech.status, modelStatus?.speech.model)}
                </span>
              </div>

              <div className="flex items-center justify-between pb-2.5 border-b border-white/[0.06]">
                <span className="text-[#9A9A9A] font-light">Vision Attention</span>
                <span className="font-mono text-white">
                  {formatModelStatus(modelStatus?.vision.status, modelStatus?.vision.model)}
                </span>
              </div>

              <div className="flex items-center justify-between pb-2.5 border-b border-white/[0.06]">
                <span className="text-[#9A9A9A] font-light">Vector Embeddings</span>
                <span className="font-mono text-white">
                  {formatModelStatus(modelStatus?.embeddings?.status, modelStatus?.embeddings?.model || 'bge-small-en-v1.5')}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[#9A9A9A] font-light">Local Database</span>
                <span className="font-mono text-white">
                  SQLite (Local / Private)
                </span>
              </div>
            </div>

            {/* Backend Offline Notice if disconnected */}
            {!backendConnected && !backendLoading && (
              <div className="mt-4 p-3 rounded-[16px] bg-white/[0.03] border border-white/[0.08] text-[11px] text-[#9A9A9A] flex items-center justify-between">
                <span>FastAPI offline — check local server.</span>
                <button
                  onClick={retryBackendConnection}
                  className="text-[#8052FF] font-medium hover:underline ml-2"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Privacy Promise Box */}
            <div className="mt-4 p-3.5 rounded-[18px] bg-white/[0.02] border border-white/[0.08] text-xs flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-[#34D399] flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-normal text-white block">Absolute Privacy</span>
                <span className="text-[11px] text-[#9A9A9A] font-light block mt-0.5 leading-relaxed">
                  All 4 AI models run locally. Zero student audio, prompts, webcam observations, or assessment documents leave this machine.
                </span>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* ============================================================
          ON-DEVICE MULTI-MODEL ENGINE ARCHITECTURE
          ============================================================ */}
      <section id="platform-architecture">
        <Card>
          <CardHeader
            title="EvallQ On-Device Multi-Model Engine Architecture"
            subtitle="Local On-Device Execution & Zero-Cloud Privacy Guarantee"
            icon={<Cpu className="w-5 h-5 text-[#8052FF]" />}
            action={
              <Badge variant="accent" size="sm">
                100% On-Device
              </Badge>
            }
          />

          <div className="space-y-6 pt-2">
            {/* Comparison Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 rounded-[18px] bg-black/60 border border-white/[0.06]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#9A9A9A]">
                    Execution Runtime
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-[#15846E]/15 text-[#34D399] border border-[#15846E]/30">
                    Active
                  </span>
                </div>
                <div className="text-base font-normal text-white">
                  Local Acceleration Engine
                </div>
                <p className="text-xs text-[#9A9A9A] font-light mt-1.5 leading-relaxed">
                  4 specialized models running on-device via ONNX Runtime, CTranslate2, FastEmbed, and local Ollama.
                </p>
              </div>

              <div className="p-5 rounded-[18px] bg-black/60 border border-white/[0.06]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#9A9A9A]">
                    Privacy Architecture
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-[#8052FF]/15 text-[#9A75FF] border border-[#8052FF]/30">
                    Zero Cloud Egress
                  </span>
                </div>
                <div className="text-base font-normal text-[#8052FF]">
                  100% Private & Autonomous
                </div>
                <p className="text-xs text-[#9A9A9A] font-light mt-1.5 leading-relaxed">
                  Voice audio, webcam focus frames, and assessment documents remain strictly on your device.
                </p>
              </div>
            </div>

            {/* Model Mapping Matrix */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/[0.03] text-[#9A9A9A] font-normal border-b border-white/[0.08]">
                  <tr>
                    <th className="py-3 px-4 font-normal">Subsystem</th>
                    <th className="py-3 px-4 font-normal">Local Model</th>
                    <th className="py-3 px-4 font-normal">Execution Engine</th>
                    <th className="py-3 px-4 font-normal">Status</th>
                    <th className="py-3 px-4 font-normal">Latency</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06] font-mono text-[11px]">
                  <tr>
                    <td className="py-3.5 px-4 font-sans text-white">Vision Monitor</td>
                    <td className="py-3.5 px-4 text-[#BDBDBD]">UltraFace-320 (1.21 MB ONNX)</td>
                    <td className="py-3.5 px-4 text-[#9A9A9A]">ONNX Runtime</td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#15846E]/15 text-[#34D399] border border-[#15846E]/30">
                        ACTIVE
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-[#9A9A9A]">~19.8 ms</td>
                  </tr>
                  <tr>
                    <td className="py-3.5 px-4 font-sans text-white">Speech Transcriber</td>
                    <td className="py-3.5 px-4 text-[#BDBDBD]">Whisper-tiny.en (39 MB INT8)</td>
                    <td className="py-3.5 px-4 text-[#9A9A9A]">CTranslate2 Local</td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#15846E]/15 text-[#34D399] border border-[#15846E]/30">
                        ACTIVE
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-[#9A9A9A]">~107 ms</td>
                  </tr>
                  <tr>
                    <td className="py-3.5 px-4 font-sans text-white">Vector Embeddings</td>
                    <td className="py-3.5 px-4 text-[#BDBDBD]">bge-small-en-v1.5 (67 MB)</td>
                    <td className="py-3.5 px-4 text-[#9A9A9A]">FastEmbed ONNX</td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#15846E]/15 text-[#34D399] border border-[#15846E]/30">
                        ACTIVE
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-[#9A9A9A]">~10.7 ms</td>
                  </tr>
                  <tr>
                    <td className="py-3.5 px-4 font-sans text-white">Local LLM & Evaluator</td>
                    <td className="py-3.5 px-4 text-[#BDBDBD]">qwen2.5:0.5b (397 MB)</td>
                    <td className="py-3.5 px-4 text-[#9A9A9A]">Ollama Local Engine</td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#15846E]/15 text-[#34D399] border border-[#15846E]/30">
                        ACTIVE
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-[#9A9A9A]">~109 tok/s</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Privacy Assurance Strip */}
            <div className="p-4 rounded-[18px] bg-black/60 border border-white/[0.06] text-xs text-[#9A9A9A] flex items-center justify-between">
              <span className="flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 text-[#34D399]" />
                <span className="font-light">
                  <strong className="text-white font-normal">Privacy Guarantee:</strong> Zero external API calls or telemetry egress. All AI inference runs purely on your local machine.
                </span>
              </span>
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
};
