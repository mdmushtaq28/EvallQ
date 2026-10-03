import React, { useState, useEffect, useRef } from 'react';
import {
  Upload,
  FileCheck2,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Bot,
  BrainCircuit,
  Eye,
  Edit3,
  Check,
  ChevronLeft,
  ChevronRight,
  TrendingDown,
  Award,
  BookOpen,
  ArrowRight,
  RefreshCw,
  Clock,
  Layers,
  Save,
  ShieldCheck,
  FileText
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Card, CardHeader } from '../components/common/Card';
import { api } from '../services/api';
import type {
  AssessmentUploadResponse,
  AssessmentEvaluationResponse,
  AssessmentListItem,
  AssessmentAnalyticsResponse,
  AssignmentItem,
} from '../types';

export const AssessmentPage: React.FC = () => {
  const { setActiveTab, setTutorInitialPrompt, userRole, setSelectedTeacherSubmissionId } = useApp();

  // Navigation tab inside Assessment module: 'create' | 'results' | 'history' | 'analytics'
  const [currentStep, setCurrentStep] = useState<'upload' | 'verify' | 'results'>('upload');
  const [activeSubTab, setActiveSubTab] = useState<'assessment' | 'history' | 'analytics'>('assessment');

  // Student identity & Assignment selection
  const [studentName, setStudentName] = useState<string>('Jamie Vance');
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>('');
  const [assignmentList, setAssignmentList] = useState<AssignmentItem[]>([]);

  // Upload & processing state
  const [isUploading, setIsUploading] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Active submission data
  const [submission, setSubmission] = useState<AssessmentUploadResponse | null>(null);
  const [activePreviewPage, setActivePreviewPage] = useState<number>(1);
  const [editableOcrText, setEditableOcrText] = useState<string>('');
  const [isEditingOcr, setIsEditingOcr] = useState<boolean>(false);
  const [isSavingOcr, setIsSavingOcr] = useState<boolean>(false);
  const [evaluation, setEvaluation] = useState<AssessmentEvaluationResponse | null>(null);



  // History & Analytics state
  const [historyList, setHistoryList] = useState<AssessmentListItem[]>([]);
  const [analytics, setAnalytics] = useState<AssessmentAnalyticsResponse | null>(null);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);

  // Load history, analytics, and assignments on mount
  useEffect(() => {
    loadRecentAssessments();
    loadAnalytics();
    api.getAssignments().then(setAssignmentList).catch(() => {});
  }, []);

  const loadRecentAssessments = async () => {
    try {
      setLoadingHistory(true);
      const list = await api.getAssessmentList(20);
      setHistoryList(list);
    } catch (err) {
      console.error('Failed to load assessment history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const loadAnalytics = async () => {
    try {
      const data = await api.getAssessmentAnalytics();
      setAnalytics(data);
    } catch (err) {
      console.error('Failed to load assessment analytics:', err);
    }
  };

  const handleFileUpload = async (file: File) => {
    setUploadError(null);
    setIsUploading(true);

    try {
      const res = await api.uploadAssessment(
        file,
        studentName,
        selectedAssignmentId || undefined
      );
      setSubmission(res);
      setEditableOcrText(res.raw_ocr_text);
      setActivePreviewPage(1);
      setCurrentStep('verify');
      await loadRecentAssessments();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to process assessment file.';
      setUploadError(msg);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  // Quick-load realistic sample assessment for instant jury testing
  const handleLoadSampleAssessment = async () => {
    setUploadError(null);
    setIsUploading(true);

    try {
      // Create a canvas with realistic handwritten-style exam paper
      const canvas = document.createElement('canvas');
      canvas.width = 950;
      canvas.height = 750;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas rendering unsupported');

      // Paper background
      ctx.fillStyle = '#FAF9F6';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Header
      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 22px sans-serif';
      ctx.fillText('Department of Computer Science — Midterm Assessment', 50, 45);

      ctx.fillStyle = '#64748b';
      ctx.font = '14px sans-serif';
      ctx.fillText('Student: Jamie Vance   |   Course: Object-Oriented Software Design', 50, 75);

      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(50, 95);
      ctx.lineTo(900, 95);
      ctx.stroke();

      // Q1
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText('Q1: Explain Inheritance in OOP and state its primary advantage.', 50, 135);
      ctx.fillStyle = '#1e293b';
      ctx.font = '15px sans-serif';
      ctx.fillText('Ans: Inheritance allows a child class to inherit fields and methods from a parent', 70, 165);
      ctx.fillText('class. The primary advantage is code reuse, but I am unsure how method overriding', 70, 190);
      ctx.fillText('differs from method overloading in subclasses.', 70, 215);

      // Q2
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText('Q2: Define Polymorphism and explain runtime vs compile-time behavior.', 50, 275);
      ctx.fillStyle = '#1e293b';
      ctx.font = '15px sans-serif';
      ctx.fillText('Ans: Polymorphism means having many forms. Compile-time polymorphism is achieved', 70, 305);
      ctx.fillText('via method overloading. Runtime polymorphism is achieved via method overriding', 70, 330);
      ctx.fillText('through virtual method tables and base pointers at execution time.', 70, 355);

      // Q3
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText('Q3: What is the purpose of Exception Handling and the finally block?', 50, 415);
      ctx.fillStyle = '#1e293b';
      ctx.font = '15px sans-serif';
      ctx.fillText('Ans: Exception handling prevents unexpected program crashes. The finally block is', 70, 445);
      ctx.fillText('optional code that only executes when no exception occurs in the try block.', 70, 470);

      // Convert canvas to blob and upload
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('Canvas export failed');

      const sampleFile = new File([blob], 'student_assessment_jamie.png', { type: 'image/png' });
      await handleFileUpload(sampleFile);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to generate sample assessment.';
      setUploadError(msg);
      setIsUploading(false);
    }
  };

  const handleSaveVerifiedOcr = async () => {
    if (!submission) return;
    setIsSavingOcr(true);
    try {
      const res = await api.verifyAssessmentOCR(submission.submission_id, {
        verified_ocr_text: editableOcrText,
      });
      setSubmission(prev => prev ? {
        ...prev,
        raw_ocr_text: res.verified_ocr_text,
        extracted_questions: res.extracted_questions,
      } : null);
      setIsEditingOcr(false);
    } catch (err) {
      console.error('Failed to save verified OCR:', err);
    } finally {
      setIsSavingOcr(false);
    }
  };

  const handleEvaluate = async () => {
    if (!submission) return;
    setIsEvaluating(true);
    setUploadError(null);

    try {
      const res = await api.evaluateAssessment(submission.submission_id);
      setEvaluation(res);

      setCurrentStep('results');
      await loadRecentAssessments();
      await loadAnalytics();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Evaluation failed.';
      setUploadError(msg);
    } finally {
      setIsEvaluating(false);
    }
  };

  // High Priority P1 Feature: Connect Learning Gap to existing AI Tutor
  const handleLearnTopic = (topic: string, gap: string) => {
    const prompt = `I recently completed an assessment on "${topic}" and identified a learning gap: "${gap}". Could you guide me through this topic with clear conceptual explanations, real-world intuition, and a quick practice question to test my understanding?`;
    setTutorInitialPrompt(prompt);
    setActiveTab('tutor');
  };

  const handleOpenExistingSubmission = async (subId: string) => {
    try {
      setIsUploading(true);
      const data = await api.getAssessment(subId);
      setSubmission({
        submission_id: data.submission_id,
        original_filename: data.original_filename,
        file_type: data.file_type,
        page_count: data.page_count,
        ocr_status: data.ocr_status,
        ocr_engine: data.ocr_engine,
        ocr_confidence: data.ocr_confidence,
        pages: data.raw_ocr_pages,
        raw_ocr_text: data.verified_ocr_text || '',
        extracted_questions: data.questions.map((q: any) => ({
          question_number: q.question_number,
          page_number: q.page_number,
          question_text: q.question_text,
          student_answer: q.student_answer,
          maximum_marks: q.maximum_marks,
        })),
      });
      setEditableOcrText(data.verified_ocr_text || '');
      setActivePreviewPage(1);

      if (data.evaluation_status === 'completed') {
        const evalPayload: AssessmentEvaluationResponse = {
          submission_id: data.submission_id,
          total_maximum_marks: data.total_maximum_marks,
          ai_suggested_score: data.ai_suggested_score,
          teacher_score: data.teacher_score,
          final_score: data.final_score,
          percentage: data.percentage,
          approval_status: data.approval_status,
          questions: data.questions,
          topic_performance: Array.isArray(data.topic_performance) ? data.topic_performance : [],
          learning_gaps: data.learning_gaps || [],
          recommendations: data.recommendations || [],
        };
        setEvaluation(evalPayload);
        setCurrentStep('results');
      } else {
        setEvaluation(null);
        setCurrentStep('verify');
      }

      setActiveSubTab('assessment');
    } catch (err) {
      console.error('Failed to open submission:', err);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
              <FileCheck2 className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
              Assessment Intelligence
            </h1>
            <Badge variant="accent" size="sm">
              Local ONNX OCR + Qwen 2.5
            </Badge>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Evaluate real handwritten & scanned assessments locally on-device. Pinpoint learning gaps and bridge them instantly in the AI Tutor.
          </p>
        </div>

        {/* Sub-tab Navigation */}
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-lg border border-slate-200 dark:border-slate-700/80">
          <button
            onClick={() => setActiveSubTab('assessment')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeSubTab === 'assessment'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Assessment Flow
          </button>
          <button
            onClick={() => {
              setActiveSubTab('history');
              loadRecentAssessments();
            }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
              activeSubTab === 'history'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            History ({historyList.length})
          </button>
          <button
            onClick={() => {
              setActiveSubTab('analytics');
              loadAnalytics();
            }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
              activeSubTab === 'analytics'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <BrainCircuit className="w-3.5 h-3.5" />
            Analytics
          </button>
        </div>
      </div>

      {/* Error alert */}
      {uploadError && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-sm text-rose-800 dark:text-rose-300">
            <span className="font-semibold">Processing Notice: </span>
            {uploadError}
          </div>
          <button
            onClick={() => setUploadError(null)}
            className="text-xs text-rose-600 dark:text-rose-400 underline font-medium"
          >
            Dismiss
          </button>
        </div>
      )}



      {/* ========================================================================= */}
      {/* VIEW: MAIN ASSESSMENT FLOW                                               */}
      {/* ========================================================================= */}
      {activeSubTab === 'assessment' && (
        <div className="space-y-6">
          {/* Stepper Header */}
          <div className="flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-sm">
            <div className="flex items-center gap-3">
              <span
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  currentStep === 'upload'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-emerald-500 text-white'
                }`}
              >
                {currentStep === 'upload' ? '1' : <Check className="w-4 h-4" />}
              </span>
              <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                1. Upload Assessment
              </span>
            </div>

            <ChevronRight className="w-4 h-4 text-slate-400" />

            <div className="flex items-center gap-3">
              <span
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  currentStep === 'verify'
                    ? 'bg-indigo-600 text-white'
                    : currentStep === 'results'
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                }`}
              >
                {currentStep === 'results' ? <Check className="w-4 h-4" /> : '2'}
              </span>
              <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                2. OCR Verification
              </span>
            </div>

            <ChevronRight className="w-4 h-4 text-slate-400" />

            <div className="flex items-center gap-3">
              <span
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  currentStep === 'results'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                }`}
              >
                3
              </span>
              <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                3. AI Evaluation & Gaps
              </span>
            </div>
          </div>

          {/* --------------------------------------------------------------------- */}
          {/* STEP 1: UPLOAD                                                        */}
          {/* --------------------------------------------------------------------- */}
          {currentStep === 'upload' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                {/* Student & Course Association */}
                <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Student Name:
                    </label>
                    <input
                      type="text"
                      value={studentName}
                      onChange={e => setStudentName(e.target.value)}
                      placeholder="e.g. Jamie Vance"
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Target Assignment / Course:
                    </label>
                    <select
                      value={selectedAssignmentId}
                      onChange={e => setSelectedAssignmentId(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                    >
                      <option value="">Open / Self-Assessment (General Rubric)</option>
                      {assignmentList.map(a => (
                        <option key={a.id} value={a.id}>
                          {a.title} ({a.subject} • {a.total_maximum_marks} pts)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <Card className="p-8 text-center border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp,application/pdf"
                    className="hidden"
                    onChange={handleFileChange}
                  />

                  {isUploading ? (
                    <div className="py-12 space-y-4">
                      <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                        Running On-Device OCR...
                      </h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                        Executing RapidOCR ONNX model locally. Analyzing document layout, handwriting, and student answers with zero cloud egress.
                      </p>
                    </div>
                  ) : (
                    <div className="py-8 space-y-4">
                      <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto shadow-sm">
                        <Upload className="w-8 h-8" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                          Upload Assessment Paper or Scanned Test
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                          Supports multi-page PDF documents or camera snapshots (PNG, JPG, WEBP).
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                        <Button
                          variant="primary"
                          onClick={() => fileInputRef.current?.click()}
                          icon={<Upload className="w-4 h-4" />}
                        >
                          Select Assessment File
                        </Button>
                        <Button
                          variant="outline"
                          onClick={handleLoadSampleAssessment}
                          icon={<Sparkles className="w-4 h-4" />}
                        >
                          Load Sample CS Exam (One-Click Demo)
                        </Button>
                      </div>

                      <div className="pt-4 flex items-center justify-center gap-4 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> 100% Private On-Device
                        </span>
                        <span>•</span>
                        <span>Multi-Page PDF Supported</span>
                        <span>•</span>
                        <span>Handwriting OCR via ONNX</span>
                      </div>
                    </div>
                  )}
                </Card>
              </div>

              {/* Sidebar Quick Info */}
              <div className="space-y-4">
                <Card>
                  <CardHeader
                    title="How It Works"
                    icon={<BrainCircuit className="w-5 h-5 text-indigo-500" />}
                  />
                  <ol className="space-y-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed list-decimal list-inside">
                    <li>
                      <strong className="text-slate-900 dark:text-slate-100">Local OCR:</strong> RapidOCR-ONNX recognizes printed and handwritten questions and answers directly from image pixels.
                    </li>
                    <li>
                      <strong className="text-slate-900 dark:text-slate-100">Human Verification:</strong> Inspect original scan side-by-side with OCR text. Correct any transcription inaccuracies.
                    </li>
                    <li>
                      <strong className="text-slate-900 dark:text-slate-100">Rubric AI Evaluation:</strong> Local Qwen 2.5 awards partial credit and grades questions objectively.
                    </li>
                    <li>
                      <strong className="text-slate-900 dark:text-slate-100">Tutor Bridge:</strong> Click "Learn This Topic" to launch the on-device AI Tutor targeted on identified learning gaps.
                    </li>
                  </ol>
                </Card>

                {historyList.length > 0 && (
                  <Card>
                    <CardHeader
                      title="Recent Submission"
                      icon={<Clock className="w-5 h-5 text-slate-500" />}
                    />
                    <div className="space-y-2 text-xs">
                      <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {historyList[0].original_filename}
                      </div>
                      <div className="flex items-center justify-between text-slate-500">
                        <span>Score:</span>
                        <span className="font-bold text-indigo-600 dark:text-indigo-400">
                          {historyList[0].ai_suggested_score} / {historyList[0].total_maximum_marks}
                        </span>
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="w-full mt-2"
                        onClick={() => handleOpenExistingSubmission(historyList[0].id)}
                      >
                        Open Assessment
                      </Button>
                    </div>
                  </Card>
                )}
              </div>
            </div>
          )}

          {/* --------------------------------------------------------------------- */}
          {/* STEP 2: OCR VERIFICATION (HUMAN-IN-THE-LOOP)                          */}
          {/* --------------------------------------------------------------------- */}
          {currentStep === 'verify' && submission && (
            <div className="space-y-4">
              {/* Action Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 p-4 rounded-xl">
                <div>
                  <h3 className="text-sm font-semibold text-indigo-900 dark:text-indigo-200 flex items-center gap-2">
                    <Eye className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    Human-in-the-Loop OCR Verification
                  </h3>
                  <p className="text-xs text-indigo-700 dark:text-indigo-300 mt-0.5">
                    Compare the original scan on the left with the local OCR text on the right. You can edit text before running AI evaluation.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentStep('upload')}
                  >
                    Upload Another
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    isLoading={isEvaluating}
                    onClick={handleEvaluate}
                    icon={<BrainCircuit className="w-4 h-4" />}
                  >
                    Evaluate Assessment with AI
                  </Button>
                </div>
              </div>

              {/* Side-by-Side Split View */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-[550px]">
                {/* Left: Original Assessment Preview */}
                <Card className="flex flex-col h-full">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-slate-500" />
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[200px]">
                        {submission.original_filename}
                      </span>
                    </div>

                    {/* Multi-page controls */}
                    {submission.page_count > 1 && (
                      <div className="flex items-center gap-1.5">
                        <button
                          disabled={activePreviewPage <= 1}
                          onClick={() => setActivePreviewPage(prev => Math.max(1, prev - 1))}
                          className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                          Page {activePreviewPage} of {submission.page_count}
                        </span>
                        <button
                          disabled={activePreviewPage >= submission.page_count}
                          onClick={() => setActivePreviewPage(prev => Math.min(submission.page_count, prev + 1))}
                          className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 mt-3 bg-slate-100 dark:bg-slate-950 rounded-lg p-2 flex items-center justify-center overflow-auto min-h-[450px]">
                    <img
                      src={api.getAssessmentPreviewUrl(submission.submission_id, activePreviewPage)}
                      alt={`Assessment Page ${activePreviewPage}`}
                      className="max-h-[500px] w-auto object-contain rounded shadow-sm border border-slate-300 dark:border-slate-800"
                    />
                  </div>
                </Card>

                {/* Right: Real OCR Extracted Text & Questions */}
                <Card className="flex flex-col h-full">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <Badge variant="success" size="sm">
                        {submission.ocr_engine}
                      </Badge>
                      {submission.ocr_confidence !== undefined && (
                        <span className="text-xs text-slate-500 font-mono">
                          {Math.round(submission.ocr_confidence * 100)}% Confidence
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {isEditingOcr ? (
                        <Button
                          variant="primary"
                          size="sm"
                          isLoading={isSavingOcr}
                          onClick={handleSaveVerifiedOcr}
                          icon={<Save className="w-3.5 h-3.5" />}
                        >
                          Save OCR
                        </Button>
                      ) : (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setIsEditingOcr(true)}
                          icon={<Edit3 className="w-3.5 h-3.5" />}
                        >
                          Edit OCR Text
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 mt-3 overflow-y-auto space-y-4 max-h-[500px]">
                    {isEditingOcr ? (
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Edit Raw OCR Transcription:
                        </label>
                        <textarea
                          rows={16}
                          value={editableOcrText}
                          onChange={e => setEditableOcrText(e.target.value)}
                          className="w-full text-xs font-mono p-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            Extracted Assessment Questions ({submission.extracted_questions.length})
                          </span>
                          <span>Source: Authentic User File</span>
                        </div>

                        {submission.extracted_questions.map((q, idx) => (
                          <div
                            key={idx}
                            className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                                Question {q.question_number}
                              </span>
                              <span className="text-xs text-slate-400">
                                Max Marks: {q.maximum_marks}
                              </span>
                            </div>
                            <p className="text-xs font-medium text-slate-800 dark:text-slate-200">
                              {q.question_text}
                            </p>
                            <div className="pt-1 border-t border-slate-200/80 dark:border-slate-800/80">
                              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                                Student Answer (from OCR):
                              </span>
                              <p className="text-xs text-slate-700 dark:text-slate-300 mt-0.5 bg-white dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-800 font-mono">
                                {q.student_answer}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* --------------------------------------------------------------------- */}
          {/* STEP 3: RESULTS, SCORECARD, GAPS, & TEACHER REVIEW                    */}
          {/* --------------------------------------------------------------------- */}
          {currentStep === 'results' && evaluation && (
            <div className="space-y-6">
              {/* Top Scorecard Banner */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="md:col-span-2 bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 text-white border-indigo-800 p-6 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs uppercase tracking-wider font-semibold text-indigo-300">
                        Assessment Evaluation Result
                      </span>
                      <Badge
                        variant={evaluation.approval_status === 'approved' ? 'success' : 'accent'}
                        size="sm"
                      >
                        {evaluation.approval_status === 'approved'
                          ? 'Teacher Approved'
                          : evaluation.approval_status === 'modified'
                          ? 'Teacher Modified'
                          : 'AI Suggested Score'}
                      </Badge>
                    </div>

                    <div className="flex items-baseline gap-3 mt-4">
                      <span className="text-4xl font-extrabold tracking-tight">
                        {evaluation.final_score !== null && evaluation.final_score !== undefined
                          ? evaluation.final_score
                          : evaluation.ai_suggested_score}
                      </span>
                      <span className="text-lg text-indigo-300 font-medium">
                        / {evaluation.total_maximum_marks} marks
                      </span>
                      <span className="text-2xl font-bold text-emerald-400 ml-auto">
                        {evaluation.percentage}%
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-indigo-800/60 flex items-center justify-between text-xs text-indigo-200">
                    <span>
                      Model: <strong>Qwen 2.5 0.5B (On-Device AI Engine)</strong>
                    </span>
                    <span>
                      Questions Evaluated: <strong>{evaluation.questions.length}</strong>
                    </span>
                  </div>
                </Card>

                {/* Score breakdown helper */}
                <Card className="flex flex-col justify-between">
                  <CardHeader
                    title="Human-in-the-Loop"
                    icon={<Award className="w-5 h-5 text-amber-500" />}
                  />
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">AI Suggested:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {evaluation.ai_suggested_score} / {evaluation.total_maximum_marks}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Teacher Final:</span>
                      <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                        {evaluation.final_score !== null && evaluation.final_score !== undefined
                          ? `${evaluation.final_score} marks`
                          : 'Pending Review'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Status:</span>
                      <span className="font-semibold capitalize text-slate-700 dark:text-slate-300">
                        {evaluation.approval_status}
                      </span>
                    </div>
                  </div>
                  <div className="pt-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="w-full text-xs"
                      onClick={() => setCurrentStep('verify')}
                    >
                      Re-verify OCR
                    </Button>
                  </div>
                </Card>

                {/* Teacher Review Status / Evaluation Studio Bridge */}
                <Card className="flex flex-col justify-between">
                  <CardHeader
                    title={userRole === 'teacher' ? 'Teacher Evaluation Studio' : 'Teacher Verification'}
                    icon={<CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                  />
                  {userRole === 'teacher' ? (
                    <div className="space-y-3">
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        You are in Teacher mode. Open this submission in the Dedicated Evaluation Studio to inspect handwritten scans and override marks.
                      </p>
                      <Button
                        variant="primary"
                        size="sm"
                        className="w-full text-xs"
                        onClick={() => {
                          if (submission) {
                            setSelectedTeacherSubmissionId(submission.submission_id);
                            setActiveTab('teacher-review');
                          }
                        }}
                        icon={<Eye className="w-3.5 h-3.5" />}
                      >
                        Open in Evaluation Studio
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
                        <span className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">
                          Review Status
                        </span>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={evaluation.approval_status === 'approved' ? 'success' : 'warning'}
                            size="sm"
                          >
                            {evaluation.approval_status === 'approved'
                              ? 'Reviewed by Teacher'
                              : 'Pending Teacher Verification'}
                          </Badge>
                        </div>
                        {evaluation.final_score !== null && evaluation.final_score !== undefined && (
                          <p className="mt-2 text-slate-700 dark:text-slate-300 font-medium">
                            Official Grade: <strong>{evaluation.final_score} / {evaluation.total_maximum_marks} marks</strong>
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </Card>
              </div>

              {/* Topic Performance & Learning Gaps Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Topic Performance */}
                <Card>
                  <CardHeader
                    title="Topic Performance"
                    subtitle="Calculated from actual evaluated question marks"
                    icon={<Layers className="w-5 h-5 text-indigo-500" />}
                  />
                  {evaluation.topic_performance.length === 0 ? (
                    <p className="text-xs text-slate-500">Not enough evaluated questions.</p>
                  ) : (
                    <div className="space-y-3 mt-2">
                      {evaluation.topic_performance.map((tp, idx) => (
                        <div key={idx} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {tp.topic}
                            </span>
                            <span className="font-bold text-slate-700 dark:text-slate-300">
                              {tp.obtained_marks} / {tp.maximum_marks} ({tp.percentage}%)
                            </span>
                          </div>
                          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-2 rounded-full transition-all duration-500 ${
                                tp.percentage >= 75
                                  ? 'bg-emerald-500'
                                  : tp.percentage >= 50
                                  ? 'bg-amber-500'
                                  : 'bg-rose-500'
                              }`}
                              style={{ width: `${Math.min(100, Math.max(5, tp.percentage))}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>

                {/* Learning Gaps & Bridge to AI Tutor (HIGH PRIORITY P1) */}
                <Card>
                  <CardHeader
                    title="Learning Gaps Identified"
                    subtitle="Identified conceptual misunderstandings from student answers"
                    icon={<TrendingDown className="w-5 h-5 text-rose-500" />}
                  />
                  {evaluation.learning_gaps.length === 0 ? (
                    <div className="text-center py-6 text-xs text-slate-500">
                      No critical learning gaps detected. Student demonstrated mastery!
                    </div>
                  ) : (
                    <div className="space-y-3 mt-2">
                      {evaluation.learning_gaps.map((gap, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 rounded-lg border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20 space-y-2"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                                  {gap.topic}
                                </span>
                                <Badge
                                  variant={gap.severity === 'high' ? 'danger' : 'warning'}
                                  size="sm"
                                >
                                  {gap.severity.toUpperCase()} PRIORITY
                                </Badge>
                              </div>
                              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                                {gap.learning_gap}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-rose-200/60 dark:border-rose-900/40">
                            <span className="text-[11px] text-slate-500">
                              Question(s): {gap.question_numbers.join(', ')}
                            </span>

                            {/* P1: Clickable connection to AI Tutor */}
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleLearnTopic(gap.topic, gap.learning_gap)}
                              icon={<Bot className="w-3.5 h-3.5" />}
                              className="text-xs py-1"
                            >
                              Learn This Topic in AI Tutor
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>

              {/* Actionable Recommendations */}
              {evaluation.recommendations.length > 0 && (
                <Card>
                  <CardHeader
                    title="Personalized Pedagogical Recommendations"
                    icon={<Sparkles className="w-5 h-5 text-indigo-500" />}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {evaluation.recommendations.map((rec, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-lg bg-indigo-50/40 dark:bg-slate-950/40 border border-indigo-100 dark:border-slate-800 space-y-1"
                      >
                        <div className="text-xs font-bold text-indigo-700 dark:text-indigo-300">
                          {rec.topic}
                        </div>
                        <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                          {rec.recommendation}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {rec.rationale}
                        </p>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Question-by-Question Deep Dive & Teacher Modification */}
              <div className="space-y-4">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-indigo-500" />
                  Question-wise Evaluation & Teacher Review
                </h3>

                {evaluation.questions.map((q, idx) => {
                  return (
                    <Card key={idx} className="space-y-4">
                      {/* Question Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-xs font-bold">
                            Question {q.question_number}
                          </span>
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            Topic: {q.topic}
                          </span>
                          <Badge
                            variant={
                              q.rubric_match === 'Complete'
                                ? 'success'
                                : q.rubric_match === 'Partial'
                                ? 'warning'
                                : 'danger'
                            }
                            size="sm"
                          >
                            {q.rubric_match}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-xs text-slate-500">
                            AI Suggested:{' '}
                            <strong className="text-slate-900 dark:text-slate-100">
                              {q.suggested_marks} / {q.maximum_marks}
                            </strong>
                          </span>
                        </div>
                      </div>

                      {/* Question & Student Answer */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <span className="text-[11px] font-semibold text-slate-500 uppercase">
                            Question Prompt:
                          </span>
                          <p className="text-xs font-medium text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-950/60 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                            {q.question_text}
                          </p>
                        </div>

                        <div className="space-y-1">
                          <span className="text-[11px] font-semibold text-slate-500 uppercase">
                            Student Handwritten Answer (OCR):
                          </span>
                          <p className="text-xs font-mono text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-950/60 p-3 rounded-lg border border-slate-200 dark:border-slate-800 whitespace-pre-wrap">
                            {q.student_answer}
                          </p>
                        </div>
                      </div>

                      {/* AI Evaluation Insights */}
                      <div className="p-3.5 rounded-lg bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/60 space-y-2">
                        <div className="text-xs text-slate-700 dark:text-slate-300">
                          <strong className="text-indigo-700 dark:text-indigo-400">AI Reasoning: </strong>
                          {q.reasoning}
                        </div>
                        {q.feedback && (
                          <div className="text-xs text-slate-700 dark:text-slate-300">
                            <strong className="text-emerald-700 dark:text-emerald-400">Constructive Feedback: </strong>
                            {q.feedback}
                          </div>
                        )}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
                          {q.strengths && (
                            <div className="text-emerald-700 dark:text-emerald-400">
                              <strong>✓ Strengths: </strong> {q.strengths}
                            </div>
                          )}
                          {q.mistakes && (
                            <div className="text-rose-700 dark:text-rose-400">
                              <strong>✗ Areas for Improvement: </strong> {q.mistakes}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Question Score & Remarks Display */}
                      <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-600 dark:text-slate-300">
                            {q.teacher_marks !== null && q.teacher_marks !== undefined ? 'Awarded Score:' : 'Score:'}
                          </span>
                          <span className="font-bold font-mono text-indigo-600 dark:text-indigo-400">
                            {q.teacher_marks !== null && q.teacher_marks !== undefined ? q.teacher_marks : q.suggested_marks} / {q.maximum_marks} marks
                          </span>
                        </div>
                        {q.teacher_feedback && (
                          <div className="text-slate-600 dark:text-slate-300 italic text-[11px]">
                            Teacher Remarks: "{q.teacher_feedback}"
                          </div>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW: ASSESSMENT HISTORY                                                  */}
      {/* ========================================================================= */}
      {activeSubTab === 'history' && (
        <Card>
          <CardHeader
            title="Assessment Submissions History"
            subtitle="Persistent record of all on-device scanned tests and evaluations"
            icon={<Clock className="w-5 h-5 text-indigo-500" />}
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={loadRecentAssessments}
                icon={<RefreshCw className="w-3.5 h-3.5" />}
              >
                Refresh
              </Button>
            }
          />

          {loadingHistory ? (
            <div className="py-12 text-center text-xs text-slate-500">
              Loading assessments...
            </div>
          ) : historyList.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              No assessments recorded yet. Upload an assessment to begin.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider">
                    <th className="py-2.5 px-3">Filename</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">OCR Status</th>
                    <th className="py-2.5 px-3">Score</th>
                    <th className="py-2.5 px-3">Teacher Status</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {historyList.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-3 font-semibold text-slate-800 dark:text-slate-200 max-w-[200px] truncate">
                        {item.original_filename}
                      </td>
                      <td className="py-3 px-3 text-slate-500">
                        {new Date(item.created_at).toLocaleDateString()} {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-3 px-3">
                        <Badge variant="success" size="sm">
                          {item.ocr_status}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 font-bold text-indigo-600 dark:text-indigo-400">
                        {item.final_score !== null && item.final_score !== undefined
                          ? `${item.final_score} / ${item.total_maximum_marks}`
                          : `${item.ai_suggested_score} / ${item.total_maximum_marks}`}
                      </td>
                      <td className="py-3 px-3 capitalize text-slate-600 dark:text-slate-300">
                        {item.approval_status}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleOpenExistingSubmission(item.id)}
                          icon={<ArrowRight className="w-3.5 h-3.5" />}
                        >
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* ========================================================================= */}
      {/* VIEW: ASSESSMENT ANALYTICS                                                */}
      {/* ========================================================================= */}
      {activeSubTab === 'analytics' && (
        <div className="space-y-6">
          {analytics ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="p-5">
                <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                  Total Assessments
                </span>
                <div className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 mt-2">
                  {analytics.total_assessments}
                </div>
                <span className="text-xs text-slate-400 mt-1 block">
                  Scanned & evaluated
                </span>
              </Card>

              <Card className="p-5">
                <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                  Average Score
                </span>
                <div className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-2">
                  {analytics.average_score_percentage}%
                </div>
                <span className="text-xs text-slate-400 mt-1 block">
                  Across all test submissions
                </span>
              </Card>

              <Card className="p-5">
                <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                  Weakest Academic Topic
                </span>
                <div className="text-base font-bold text-rose-600 dark:text-rose-400 mt-2 truncate">
                  {analytics.weakest_topic || 'No weak topic identified'}
                </div>
                <span className="text-xs text-slate-400 mt-1 block">
                  Requires pedagogical review
                </span>
              </Card>

              <Card className="p-5">
                <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                  Learning Gaps Identified
                </span>
                <div className="text-3xl font-extrabold text-amber-600 dark:text-amber-400 mt-2">
                  {analytics.total_learning_gaps}
                </div>
                <span className="text-xs text-slate-400 mt-1 block">
                  Bridged into AI Tutor
                </span>
              </Card>
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-slate-500">
              Loading assessment analytics...
            </div>
          )}
        </div>
      )}
    </div>
  );
};
