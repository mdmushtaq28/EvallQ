import React, { useState, useEffect } from 'react';
import {
  FileText,
  Upload,
  BookOpen,
  Sparkles,
  HelpCircle,
  Award,
  Layers,
  CheckCircle,
  FileCheck,
  ShieldCheck,
  ChevronRight,
  Send,
  RotateCw,
  Loader2,
  Trash2,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Card, CardHeader } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { EmptyState } from '../components/common/EmptyState';
import { api } from '../services/api';
import type { DocumentItem, QuizQuestion, Flashcard, ApiSearchResult } from '../types';

type StudySubTab = 'documents' | 'summary' | 'qa' | 'quiz' | 'flashcards';

interface QAExchange {
  id: string;
  question: string;
  reply: string;
  sources: ApiSearchResult[];
  latency_ms: number;
  tokens_per_second: number;
  device: string;
}

export const StudyMaterialsPage: React.FC = () => {
  const { isDemoMode, backendConnected } = useApp();
  const [activeSubTab, setActiveSubTab] = useState<StudySubTab>('documents');
  const [dragActive, setDragActive] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState<string>('');
  const [qaInput, setQaInput] = useState('');
  const [selectedQuizAnswers, setSelectedQuizAnswers] = useState<Record<string, number>>({});
  const [isFlashcardFlipped, setIsFlashcardFlipped] = useState(false);
  const [currentFlashcardIndex, setCurrentFlashcardIndex] = useState(0);

  // Async loading & telemetry states
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isQueryingQA, setIsQueryingQA] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [isGeneratingFlashcards, setIsGeneratingFlashcards] = useState(false);
  const [qaHistory, setQaHistory] = useState<QAExchange[]>([]);

  // Demo Fallback Data
  const demoDocs: DocumentItem[] = [
    {
      id: 'demo-doc-1',
      filename: 'Operating_Systems_Concurrency.pdf',
      size: 2450000,
      uploadDate: 'Today, 11:20 AM',
      pageCount: 3,
      chunkCount: 7,
      processed: true,
      summary:
        'This chapter covers synchronization primitives, mutexes, semaphores, and condition variables. It analyzes race conditions, critical section requirements, and classic problems like the Dining Philosophers and Producer-Consumer.',
      keyTakeaways: [
        'Mutual exclusion ensures only one thread accesses a critical section at any instant.',
        'Semaphores maintain an integer counter to regulate access across multiple shared resources.',
        'Deadlock requires four concurrent Coffman conditions: Mutual Exclusion, Hold and Wait, No Preemption, and Circular Wait.',
        'Classic synchronization problems include the Producer-Consumer, Readers-Writers, and Dining Philosophers.',
      ],
    },
  ];

  const demoQuizData: QuizQuestion[] = [
    {
      id: 'q1',
      question: 'Which of the following conditions is NOT required for a deadlock to occur?',
      options: [
        'Mutual exclusion',
        'Hold and wait',
        'Preemptive resource allocation',
        'Circular wait',
      ],
      correctIndex: 2,
      explanation:
        'Preemption prevents deadlocks. The necessary condition is NO PREEMPTION (resources cannot be forcibly reclaimed).',
    },
  ];

  const demoFlashcardData: Flashcard[] = [
    {
      id: 'f1',
      front: 'What is a Race Condition?',
      back: 'A flaw that occurs when multiple concurrent threads access shared data and the final outcome depends on the non-deterministic timing of thread scheduling.',
      category: 'Concurrency',
    },
    {
      id: 'f2',
      front: 'What are the 4 Coffman Deadlock Conditions?',
      back: '1. Mutual Exclusion\n2. Hold and Wait\n3. No Preemption\n4. Circular Wait',
      category: 'Deadlocks',
    },
    {
      id: 'f3',
      front: 'Difference between Mutex and Binary Semaphore?',
      back: 'A Mutex has ownership (only the locking thread can unlock it). A Semaphore has no ownership concept and can be signaled by any thread.',
      category: 'Synchronization',
    },
  ];

  const [documents, setDocuments] = useState<DocumentItem[]>(demoDocs);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>(demoQuizData);
  const [flashcards, setFlashcards] = useState<Flashcard[]>(demoFlashcardData);

  // Fetch live documents from backend
  const loadDocuments = async () => {
    try {
      const res = await api.getDocuments();
      if (res && res.documents) {
        const mapped: DocumentItem[] = res.documents.map(d => ({
          id: d.id,
          filename: d.filename,
          size: d.file_size,
          uploadDate: new Date(d.created_at).toLocaleDateString([], {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }),
          pageCount: d.page_count,
          chunkCount: d.chunk_count,
          processed: true,
          summary: d.summary || undefined,
          keyTakeaways: d.key_takeaways || [],
        }));

        if (mapped.length > 0) {
          setDocuments(mapped);
          if (!selectedDocId || !mapped.some(m => m.id === selectedDocId)) {
            setSelectedDocId(mapped[0].id);
          }
        } else if (isDemoMode) {
          setDocuments(demoDocs);
          setSelectedDocId(demoDocs[0].id);
        } else {
          setDocuments([]);
          setSelectedDocId('');
        }
      }
    } catch {
      if (isDemoMode) {
        setDocuments(demoDocs);
        setSelectedDocId(demoDocs[0].id);
      }
    }
  };

  useEffect(() => {
    loadDocuments();
  }, [backendConnected, isDemoMode]);

  const selectedDoc = documents.find(d => d.id === selectedDocId) || documents[0];

  // Upload Handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    setUploadError(null);
    setIsUploading(true);

    try {
      if (backendConnected && !isDemoMode) {
        const uploaded = await api.uploadDocument(file);
        const newDocItem: DocumentItem = {
          id: uploaded.id,
          filename: uploaded.filename,
          size: uploaded.file_size,
          uploadDate: 'Just now',
          pageCount: uploaded.page_count,
          chunkCount: uploaded.chunk_count,
          processed: true,
          summary: uploaded.summary || undefined,
          keyTakeaways: uploaded.key_takeaways || [],
        };
        setDocuments(prev => [newDocItem, ...prev]);
        setSelectedDocId(newDocItem.id);
        setActiveSubTab('summary');
        // Trigger auto-summarization in background
        triggerSummarize(newDocItem.id);
      } else {
        // Fallback demo simulation
        const demoDoc: DocumentItem = {
          id: `doc-${Date.now()}`,
          filename: file.name,
          size: file.size,
          uploadDate: 'Just now',
          pageCount: 12,
          chunkCount: 38,
          processed: true,
          summary: `Local extraction complete for ${file.name}. PyMuPDF parsed 12 pages locally without external network transmission.`,
          keyTakeaways: [
            'Document parsed into semantic text chunks locally.',
            'Local embeddings generated for private vector similarity lookup.',
          ],
        };
        setDocuments(prev => [demoDoc, ...prev]);
        setSelectedDocId(demoDoc.id);
        setActiveSubTab('summary');
      }
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Failed to upload document.');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  // Summarize Handler
  const triggerSummarize = async (docId?: string, forceRefresh = false) => {
    const targetId = docId || selectedDoc?.id;
    if (!targetId || isSummarizing) return;

    setIsSummarizing(true);
    try {
      if (backendConnected && !isDemoMode) {
        const res = await api.summarizeDocument(targetId, forceRefresh);
        setDocuments(prev =>
          prev.map(d =>
            d.id === targetId
              ? { ...d, summary: res.summary, keyTakeaways: res.key_takeaways }
              : d
          )
        );
      }
    } catch (err: unknown) {
      alert(`Summarization notice: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsSummarizing(false);
    }
  };

  // Document Q&A Handler
  const handleAskQA = async () => {
    const trimmed = qaInput.trim();
    if (!trimmed || !selectedDoc || isQueryingQA) return;

    setQaInput('');
    setIsQueryingQA(true);

    try {
      if (backendConnected && !isDemoMode) {
        const res = await api.askDocumentQA(selectedDoc.id, { question: trimmed });
        const exchange: QAExchange = {
          id: `qa-${Date.now()}`,
          question: trimmed,
          reply: res.reply,
          sources: res.sources || [],
          latency_ms: res.latency_ms,
          tokens_per_second: res.tokens_per_second,
          device: res.device,
        };
        setQaHistory(prev => [exchange, ...prev]);
      } else {
        // Demo response
        const demoExchange: QAExchange = {
          id: `qa-${Date.now()}`,
          question: trimmed,
          reply: `In "${selectedDoc.filename}", this concept is defined through synchronization primitives that guard critical sections. (Page 2)`,
          sources: [
            {
              chunk_id: 'c1',
              page_number: 2,
              content: 'A mutex is a locking mechanism used to synchronize access to a resource...',
              score: 0.88,
            },
          ],
          latency_ms: 180,
          tokens_per_second: 32.5,
          device: 'Host CPU (x86_64)',
        };
        setQaHistory(prev => [demoExchange, ...prev]);
      }
    } catch (err: unknown) {
      alert(`Q&A query failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsQueryingQA(false);
    }
  };

  // Quiz Generation Handler
  const handleGenerateQuiz = async () => {
    if (!selectedDoc || isGeneratingQuiz) return;
    setIsGeneratingQuiz(true);
    setSelectedQuizAnswers({});

    try {
      if (backendConnected && !isDemoMode) {
        const res = await api.generateQuiz(selectedDoc.id);
        if (res.questions && res.questions.length > 0) {
          setQuizQuestions(res.questions);
        }
      } else {
        setQuizQuestions(demoQuizData);
      }
    } catch (err: unknown) {
      alert(`Quiz synthesis notice: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  // Flashcards Generation Handler
  const handleGenerateFlashcards = async () => {
    if (!selectedDoc || isGeneratingFlashcards) return;
    setIsGeneratingFlashcards(true);
    setIsFlashcardFlipped(false);
    setCurrentFlashcardIndex(0);

    try {
      if (backendConnected && !isDemoMode) {
        const res = await api.generateFlashcards(selectedDoc.id);
        if (res.flashcards && res.flashcards.length > 0) {
          setFlashcards(res.flashcards);
        }
      } else {
        setFlashcards(demoFlashcardData);
      }
    } catch (err: unknown) {
      alert(`Flashcards notice: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsGeneratingFlashcards(false);
    }
  };

  // Delete Document Handler
  const handleDeleteDoc = async (docId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this document and its vector embeddings?')) return;

    try {
      if (backendConnected && !isDemoMode) {
        await api.deleteDocument(docId);
      }
      setDocuments(prev => prev.filter(d => d.id !== docId));
      if (selectedDocId === docId) {
        const remaining = documents.filter(d => d.id !== docId);
        setSelectedDocId(remaining.length > 0 ? remaining[0].id : '');
      }
    } catch (err: unknown) {
      alert(`Failed to delete document: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const tabs: Array<{ id: StudySubTab; label: string; icon: React.ReactNode }> = [
    { id: 'documents', label: 'Documents', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'summary', label: 'Summary', icon: <Sparkles className="w-4 h-4" /> },
    { id: 'qa', label: 'Ask Questions', icon: <HelpCircle className="w-4 h-4" /> },
    { id: 'quiz', label: 'Generate Quiz', icon: <Award className="w-4 h-4" /> },
    { id: 'flashcards', label: 'Flashcards', icon: <Layers className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Navigation & Sub-tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-1 overflow-x-auto p-1">
          {tabs.map(tab => {
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 px-3">
          <Badge variant="brand" size="sm">
            RAG Pipeline
          </Badge>
          <span className="text-[11px] text-slate-500 font-mono hidden sm:inline">
            PyMuPDF + FastEmbed ONNX
          </span>
        </div>
      </div>

      {/* Main Content Area */}
      {activeSubTab === 'documents' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Upload Zone */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader
                title="Upload Study Material"
                subtitle="PDF documents up to 50MB"
                icon={<Upload className="w-5 h-5" />}
              />

              {uploadError && (
                <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              <div
                onDragOver={e => {
                  e.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={e => {
                  e.preventDefault();
                  setDragActive(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    const mockEvent = {
                      target: { files: e.dataTransfer.files, value: '' },
                    } as unknown as React.ChangeEvent<HTMLInputElement>;
                    handleFileUpload(mockEvent);
                  }
                }}
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                  dragActive
                    ? 'border-indigo-500 bg-indigo-50/10'
                    : 'border-slate-300 dark:border-slate-700 bg-slate-50/40 dark:bg-slate-900/30'
                }`}
              >
                <div className="w-12 h-12 mx-auto rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 flex items-center justify-center mb-3">
                  {isUploading ? (
                    <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                  ) : (
                    <FileText className="w-6 h-6" />
                  )}
                </div>
                <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {isUploading ? 'Parsing & Indexing on CPU...' : 'Select a Course PDF'}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4">
                  {isUploading
                    ? 'PyMuPDF is extracting text & FastEmbed is generating 384-d vectors.'
                    : 'Drag and drop files here, or browse from your device.'}
                </p>

                <label className="inline-flex cursor-pointer">
                  <span
                    className={`px-4 py-2 rounded-lg text-white text-xs font-semibold shadow-sm transition-all ${
                      isUploading
                        ? 'bg-slate-600 cursor-not-allowed'
                        : 'bg-indigo-600 hover:bg-indigo-700'
                    }`}
                  >
                    {isUploading ? 'Processing...' : 'Choose PDF File'}
                  </span>
                  <input
                    type="file"
                    accept=".pdf"
                    disabled={isUploading}
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>

                <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>100% Private • PyMuPDF + FastEmbed ONNX</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Document Library List */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader
                title="Document Library"
                subtitle={`${documents.length} document${documents.length === 1 ? '' : 's'} indexed`}
                icon={<BookOpen className="w-5 h-5" />}
              />

              {documents.length === 0 ? (
                <EmptyState
                  icon={<BookOpen className="w-8 h-8" />}
                  title="No documents uploaded yet"
                  description="Upload your textbook chapters or lecture slides. Text extraction and semantic embedding will happen entirely on your device."
                  actionText="Refresh Library"
                  onAction={loadDocuments}
                />
              ) : (
                <div className="space-y-3">
                  {documents.map(doc => {
                    const isSelected = selectedDoc?.id === doc.id;
                    return (
                      <div
                        key={doc.id}
                        onClick={() => setSelectedDocId(doc.id)}
                        className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-400 dark:border-indigo-600 shadow-sm'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-3.5">
                          <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-500">
                            <FileCheck className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                              {doc.filename}
                              {isSelected && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-600 text-white font-mono">
                                  ACTIVE
                                </span>
                              )}
                            </h4>
                            <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 dark:text-slate-400">
                              <span>{(doc.size / (1024 * 1024)).toFixed(2)} MB</span>
                              <span>•</span>
                              <span>{doc.pageCount} pages</span>
                              <span>•</span>
                              <span>{doc.chunkCount} vector chunks</span>
                              <span>•</span>
                              <span>{doc.uploadDate}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={e => {
                              e.stopPropagation();
                              setSelectedDocId(doc.id);
                              setActiveSubTab('summary');
                            }}
                          >
                            Analyze
                          </Button>
                          <button
                            onClick={e => handleDeleteDoc(doc.id, e)}
                            title="Delete Document"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* Summary View */}
      {activeSubTab === 'summary' && (
        <Card>
          <CardHeader
            title="Document Executive Summary"
            subtitle={selectedDoc ? selectedDoc.filename : 'No document selected'}
            icon={<Sparkles className="w-5 h-5" />}
          />

          {!selectedDoc ? (
            <EmptyState
              icon={<FileText className="w-8 h-8" />}
              title="No Document Selected"
              description="Upload or choose a document from the Documents tab to view its local AI summary."
              actionText="Go to Documents"
              onAction={() => setActiveSubTab('documents')}
            />
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Badge variant="brand" size="sm">
                    Qwen 2.5 (0.5B)
                  </Badge>
                  <span>Synthesized on Host CPU (Dev) • Standby: Snapdragon Hexagon NPU</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isSummarizing}
                  icon={isSummarizing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCw className="w-3.5 h-3.5" />}
                  onClick={() => triggerSummarize(selectedDoc.id, true)}
                >
                  {isSummarizing ? 'Synthesizing...' : 'Regenerate Summary'}
                </Button>
              </div>

              {isSummarizing ? (
                <div className="p-8 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center gap-3 text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    Generating Executive Summary...
                  </p>
                  <p className="text-xs text-slate-500">
                    Sampling chunks across the document and prompting the local instruction model.
                  </p>
                </div>
              ) : (
                <>
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                      Overview
                    </h4>
                    <p className="text-sm leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-line">
                      {selectedDoc.summary ||
                        'No executive summary generated yet. Click "Regenerate Summary" above to synthesize one on-device.'}
                    </p>
                  </div>

                  {selectedDoc.keyTakeaways && selectedDoc.keyTakeaways.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                        <span>Key Architectural & Concept Takeaways</span>
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {selectedDoc.keyTakeaways.map((point, idx) => (
                          <div
                            key={idx}
                            className="p-3.5 rounded-lg bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2.5"
                          >
                            <span className="w-5 h-5 rounded-full bg-indigo-500/10 text-indigo-500 font-bold flex items-center justify-center flex-shrink-0 text-[10px]">
                              {idx + 1}
                            </span>
                            <span className="leading-snug">{point}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-500">
                  Target pipeline: PyMuPDF extraction • FastEmbed ONNX • Qwen 2.5 Summarizer
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveSubTab('qa')}
                  >
                    Ask Questions
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setActiveSubTab('quiz');
                      handleGenerateQuiz();
                    }}
                  >
                    Generate Quiz
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Ask Questions View (RAG) */}
      {activeSubTab === 'qa' && (
        <Card>
          <CardHeader
            title="Document Grounded Q&A"
            subtitle={`Ask questions directly answered from: ${
              selectedDoc ? selectedDoc.filename : 'Selected PDF'
            }`}
            icon={<HelpCircle className="w-5 h-5" />}
          />

          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800/40 text-xs text-indigo-900 dark:text-indigo-300 flex items-start gap-3">
              <ShieldCheck className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" />
              <div>
                <strong>Local Retrieval-Augmented Generation (RAG):</strong> Your query is converted to a 384-dimensional dense vector via FastEmbed ONNX on CPU. Top-3 semantic matches are retrieved with cosine similarity and supplied to Qwen 2.5 for grounded, cited answers.
              </div>
            </div>

            {/* Conversation Stream */}
            {qaHistory.length > 0 && (
              <div className="space-y-4 max-h-[460px] overflow-y-auto pr-1">
                {qaHistory.map(item => (
                  <div
                    key={item.id}
                    className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                        Q: {item.question}
                      </h4>
                      <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-indigo-400" />
                          {item.latency_ms} ms
                        </span>
                        <span>•</span>
                        <span>{item.tokens_per_second.toFixed(1)} tok/s</span>
                      </div>
                    </div>

                    <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line pl-4 border-l-2 border-indigo-500/40">
                      {item.reply}
                    </p>

                    {item.sources && item.sources.length > 0 && (
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60">
                        <div className="text-[11px] font-semibold text-slate-500 mb-2 flex items-center gap-1.5">
                          <span>Grounding Excerpts ({item.sources.length} matches):</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                          {item.sources.map((s, sIdx) => (
                            <div
                              key={sIdx}
                              className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400"
                            >
                              <div className="flex items-center justify-between mb-1 font-mono text-[10px] text-indigo-400 font-semibold">
                                <span>Page {s.page_number}</span>
                                <span>Score: {(s.score * 100).toFixed(1)}%</span>
                              </div>
                              <p className="line-clamp-3">{s.content}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {qaHistory.length === 0 && (
              <div className="p-8 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 min-h-[160px] flex flex-col justify-center items-center text-center">
                <HelpCircle className="w-8 h-8 text-indigo-400 mb-2" />
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {selectedDoc
                    ? `Ask questions about "${selectedDoc.filename}"`
                    : 'Please select a document first.'}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Try: "What are the Coffman conditions?" or "Explain race conditions."
                </p>
              </div>
            )}

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={qaInput}
                disabled={isQueryingQA || !selectedDoc}
                onChange={e => setQaInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAskQA()}
                placeholder="Ask about this document... (e.g. What conditions cause a race condition?)"
                className="flex-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
              />
              <Button
                variant="primary"
                disabled={!qaInput.trim() || isQueryingQA || !selectedDoc}
                icon={isQueryingQA ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                onClick={handleAskQA}
              >
                {isQueryingQA ? 'Searching...' : 'Query'}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Generate Quiz View */}
      {activeSubTab === 'quiz' && (
        <Card>
          <CardHeader
            title="Generated Quiz"
            subtitle="Test your comprehension with automated questions synthesized from your document"
            icon={<Award className="w-5 h-5" />}
          />

          {!selectedDoc ? (
            <EmptyState
              icon={<Award className="w-8 h-8" />}
              title="No Document Selected"
              description="Upload or select a study material to generate multiple-choice conceptual quizzes evaluated locally."
              actionText="Go to Documents"
              onAction={() => setActiveSubTab('documents')}
            />
          ) : isGeneratingQuiz ? (
            <div className="p-12 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center gap-3 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Synthesizing Conceptual Quiz Questions...
              </p>
              <p className="text-xs text-slate-500">
                Local LLM is creating 3-4 multiple choice questions grounded in document chunks.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">
                  Grounded in: <span className="font-semibold text-slate-700 dark:text-slate-300">{selectedDoc.filename}</span>
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isGeneratingQuiz}
                  icon={<RotateCw className="w-3.5 h-3.5" />}
                  onClick={handleGenerateQuiz}
                >
                  Generate New Quiz
                </Button>
              </div>

              {quizQuestions.map((q, qIndex) => {
                const selectedAnswer = selectedQuizAnswers[q.id];
                return (
                  <div
                    key={q.id}
                    className="p-5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-4"
                  >
                    <div className="flex items-start justify-between">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        Question {qIndex + 1}: {q.question}
                      </h4>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-500">
                        Multiple Choice
                      </span>
                    </div>

                    <div className="space-y-2">
                      {q.options.map((opt, optIndex) => {
                        const isSelected = selectedAnswer === optIndex;
                        const isCorrect = optIndex === q.correctIndex;
                        let optionClasses =
                          'p-3 rounded-lg border text-xs font-medium cursor-pointer transition-all flex items-center justify-between ';

                        if (selectedAnswer !== undefined) {
                          if (isCorrect) {
                            optionClasses +=
                              'bg-emerald-500/15 border-emerald-500 text-emerald-700 dark:text-emerald-300';
                          } else if (isSelected) {
                            optionClasses +=
                              'bg-rose-500/15 border-rose-500 text-rose-700 dark:text-rose-300';
                          } else {
                            optionClasses +=
                              'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-800 opacity-60';
                          }
                        } else {
                          optionClasses +=
                            'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 text-slate-800 dark:text-slate-200';
                        }

                        return (
                          <div
                            key={optIndex}
                            onClick={() =>
                              setSelectedQuizAnswers(prev => ({ ...prev, [q.id]: optIndex }))
                            }
                            className={optionClasses}
                          >
                            <div className="flex items-center gap-3">
                              <span className="w-5 h-5 rounded-full border flex items-center justify-center font-mono text-[10px]">
                                {String.fromCharCode(65 + optIndex)}
                              </span>
                              <span>{opt}</span>
                            </div>
                            {selectedAnswer !== undefined && isCorrect && (
                              <CheckCircle className="w-4 h-4 text-emerald-500" />
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {selectedAnswer !== undefined && (
                      <div className="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300">
                        <strong>Explanation:</strong> {q.explanation}
                      </div>
                    )}
                  </div>
                );
              })}

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedQuizAnswers({})}
                >
                  Reset Answers
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={isGeneratingQuiz}
                  onClick={handleGenerateQuiz}
                >
                  Generate More Questions
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Flashcards View */}
      {activeSubTab === 'flashcards' && (
        <Card>
          <CardHeader
            title="Interactive Flashcards"
            subtitle="Spaced repetition cards generated from lecture materials"
            icon={<Layers className="w-5 h-5" />}
          />

          {!selectedDoc ? (
            <EmptyState
              icon={<Layers className="w-8 h-8" />}
              title="No Document Selected"
              description="Upload course materials to synthesize memory retention flashcards."
              actionText="Go to Documents"
              onAction={() => setActiveSubTab('documents')}
            />
          ) : isGeneratingFlashcards ? (
            <div className="p-12 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center gap-3 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Synthesizing Active Recall Flashcards...
              </p>
              <p className="text-xs text-slate-500">
                Extracting high-yield concepts from document chunks into memory flashcards.
              </p>
            </div>
          ) : flashcards.length === 0 ? (
            <EmptyState
              icon={<Layers className="w-8 h-8" />}
              title="No Flashcards Created Yet"
              description="Generate a batch of flashcards for this document using the local AI engine."
              actionText="Generate Flashcards"
              onAction={handleGenerateFlashcards}
            />
          ) : (
            <div className="max-w-xl mx-auto py-6 space-y-6">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">
                  Document: <span className="font-semibold text-slate-700 dark:text-slate-300">{selectedDoc.filename}</span>
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isGeneratingFlashcards}
                  icon={<RotateCw className="w-3.5 h-3.5" />}
                  onClick={handleGenerateFlashcards}
                >
                  Generate New Cards
                </Button>
              </div>

              {/* Flashcard Component */}
              <div
                onClick={() => setIsFlashcardFlipped(!isFlashcardFlipped)}
                className="h-64 rounded-2xl p-6 bg-gradient-to-tr from-slate-800 to-slate-900 border-2 border-indigo-500/30 hover:border-indigo-400 cursor-pointer shadow-xl flex flex-col justify-between transition-all duration-300 relative group"
              >
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-semibold text-indigo-400 uppercase tracking-wider text-[11px]">
                    {flashcards[currentFlashcardIndex]?.category || 'General'}
                  </span>
                  <span className="font-mono">
                    Card {currentFlashcardIndex + 1} of {flashcards.length}
                  </span>
                </div>

                <div className="text-center px-4">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest block mb-2">
                    {isFlashcardFlipped ? 'ANSWER' : 'QUESTION (Click to flip)'}
                  </span>
                  <p className="text-base sm:text-lg font-bold text-white whitespace-pre-line leading-relaxed">
                    {isFlashcardFlipped
                      ? flashcards[currentFlashcardIndex]?.back
                      : flashcards[currentFlashcardIndex]?.front}
                  </p>
                </div>

                <div className="flex items-center justify-center gap-1.5 text-xs text-indigo-300 group-hover:text-indigo-200">
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>Click anywhere to flip</span>
                </div>
              </div>

              {/* Navigation Controls */}
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentFlashcardIndex === 0}
                  onClick={() => {
                    setCurrentFlashcardIndex(prev => Math.max(0, prev - 1));
                    setIsFlashcardFlipped(false);
                  }}
                >
                  Previous
                </Button>

                <span className="text-xs text-slate-400 font-mono">
                  {currentFlashcardIndex + 1} / {flashcards.length}
                </span>

                <Button
                  variant="primary"
                  size="sm"
                  disabled={currentFlashcardIndex === flashcards.length - 1}
                  onClick={() => {
                    setCurrentFlashcardIndex(prev =>
                      Math.min(flashcards.length - 1, prev + 1)
                    );
                    setIsFlashcardFlipped(false);
                  }}
                >
                  Next Card
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
};
