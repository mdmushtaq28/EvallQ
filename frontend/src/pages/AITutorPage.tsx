import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Mic,
  MicOff,
  Trash2,
  Bot,
  User,
  ShieldCheck,
  AlertTriangle,
  Lightbulb,
  Loader2,
  Cpu,
  Clock,
  CheckCircle2,
  Volume2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Badge } from '../components/common/Badge';
import { api } from '../services/api';
import type { ChatMessage, ApiChatMessage } from '../types';

export const AITutorPage: React.FC = () => {
  const { isDemoMode, aiStatus, modelStatus, tutorInitialPrompt, setTutorInitialPrompt } = useApp();
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [thinkingSeconds, setThinkingSeconds] = useState(0);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  // Speech recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [speechSuccessNotice, setSpeechSuccessNotice] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (isDemoMode) {
      return [
        {
          id: 'demo-1',
          sender: 'user',
          text: 'Explain polymorphism in Java.',
          timestamp: '10:30 AM',
        },
        {
          id: 'demo-2',
          sender: 'assistant',
          text: 'Polymorphism in Java is a core Object-Oriented Programming (OOP) concept that allows objects of different classes to be treated as objects of a common superclass. The word itself means "many forms".\n\nThere are two primary types:\n1. **Compile-time Polymorphism (Method Overloading)**: Multiple methods with the same name but different signatures within the same class.\n2. **Runtime Polymorphism (Method Overriding)**: A subclass provides a specific implementation of a method declared in its superclass, resolved dynamically via virtual method tables.\n\n*Note: In live mode, responses are generated directly on your local machine using the on-device Qwen 2.5 LLM (Private On-Device Engine).*',
          timestamp: '10:31 AM',
          tokensPerSec: 28.4,
          latencyMs: 140,
        },
      ];
    }
    return [];
  });

  const samplePrompts = [
    'Explain binary search algorithm and its time complexity.',
    'How does Amdahl\'s Law apply to multicore scaling?',
    'What is the difference between TCP and UDP protocols?',
    'Explain virtual memory and page tables in operating systems.',
  ];

  // Auto-scroll to bottom of conversation
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  // Handle incoming Learning Gap transition prompt from Assessment Intelligence
  useEffect(() => {
    if (tutorInitialPrompt && tutorInitialPrompt.trim()) {
      const promptText = tutorInitialPrompt;
      setTutorInitialPrompt(null);

      const userMsg: ChatMessage = {
        id: `usr-${Date.now()}`,
        sender: 'user',
        text: promptText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, userMsg]);
      setIsThinking(true);

      api.sendChatMessage({
        message: promptText,
        conversation: messages.filter(m => m.sender === 'user' || m.sender === 'assistant').map(m => ({
          role: m.sender === 'user' ? 'user' : 'assistant',
          content: m.text,
        })),
      })
      .then(res => {
        const assistantMsg: ChatMessage = {
          id: `ast-${Date.now()}`,
          sender: 'assistant',
          text: res.reply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          tokensPerSec: res.tokens_per_second,
          latencyMs: res.latency_ms,
        };
        setMessages(prev => [...prev, assistantMsg]);
      })
      .catch((err: unknown) => {
        const errMsg = err instanceof Error ? err.message : 'Local inference error occurred.';
        const errorMsg: ChatMessage = {
          id: `err-${Date.now()}`,
          sender: 'assistant',
          text: `⚠️ **Inference Unavailable**: ${errMsg}\n\n*Ensure the local LLM runtime (Ollama) is active.*`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages(prev => [...prev, errorMsg]);
      })
      .finally(() => {
        setIsThinking(false);
      });
    }
  }, [tutorInitialPrompt]);

  // Stopwatch during LLM inference
  useEffect(() => {
    let timer: NodeJS.Timeout | undefined;
    if (isThinking) {
      setThinkingSeconds(0);
      timer = setInterval(() => {
        setThinkingSeconds(prev => prev + 1);
      }, 1000);
    } else {
      setThinkingSeconds(0);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isThinking]);

  // Cleanup audio tracks and timer on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const handleSend = async () => {
    const trimmedInput = input.trim();
    if (!trimmedInput || isThinking) return;

    setErrorNotice(null);

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: trimmedInput,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsThinking(true);

    try {
      // Build conversation history turns
      const conversationPayload: ApiChatMessage[] = messages
        .filter(m => m.sender === 'user' || m.sender === 'assistant')
        .map(m => ({
          role: m.sender === 'user' ? 'user' : 'assistant',
          content: m.text,
        }));

      const res = await api.sendChatMessage({
        message: trimmedInput,
        conversation: conversationPayload,
      });

      const assistantMsg: ChatMessage = {
        id: `ast-${Date.now()}`,
        sender: 'assistant',
        text: res.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        tokensPerSec: res.tokens_per_second,
        latencyMs: res.latency_ms,
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Unknown local inference error occurred.';
      setErrorNotice(errMsg);

      // Add honest error status turn so student sees failure in context
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: 'assistant',
        text: `⚠️ **Inference Unavailable**: ${errMsg}\n\n*Ensure the local LLM runtime (Ollama) is running with the configured model.*`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleMicClick = async () => {
    setErrorNotice(null);
    setSpeechSuccessNotice(null);

    // If currently recording, stop recording
    if (isRecording) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      return;
    }

    // Start recording from microphone
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setErrorNotice('Microphone access is not supported by your browser.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      }

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = event => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Stop audio tracks to release microphone hardware indicator
        stream.getTracks().forEach(t => t.stop());

        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        if (audioBlob.size < 100) {
          return;
        }

        setIsTranscribing(true);
        try {
          const speechResult = await api.transcribeSpeech(audioBlob);
          if (speechResult.text && speechResult.text.trim()) {
            const transcribed = speechResult.text.trim();
            setInput(prev => (prev ? `${prev} ${transcribed}` : transcribed));
            setSpeechSuccessNotice(
              `Transcribed in ${speechResult.latency_ms}ms via Whisper-tiny.en (Host CPU INT8)`
            );
          } else {
            setSpeechSuccessNotice('No speech detected in audio.');
          }
        } catch (speechErr: unknown) {
          const errText = speechErr instanceof Error ? speechErr.message : 'Speech transcription failed.';
          setErrorNotice(errText);
        } finally {
          setIsTranscribing(false);
        }
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setRecordingSeconds(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Microphone permission denied or unavailable.';
      setErrorNotice(`Microphone error: ${msg}`);
      setIsRecording(false);
    }
  };

  const handleClear = () => {
    setMessages([]);
    setErrorNotice(null);
    setSpeechSuccessNotice(null);
  };

  return (
    <div className="h-[calc(100vh-7.5rem)] flex flex-col max-w-5xl mx-auto">
      {/* Top Banner / Status Strip */}
      <div className="p-3.5 mb-3 rounded-xl bg-slate-800/60 border border-slate-700/80 flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <Badge variant="brand" size="sm">
            AI Tutor Engine
          </Badge>
          <span className="text-slate-300 flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-indigo-400" />
            LLM: <span className="font-mono text-emerald-400 font-medium">Qwen 2.5 (0.5B Instruct)</span>
          </span>
          <span className="text-slate-500">•</span>
          <span className="text-slate-300 flex items-center gap-1.5">
            <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
            Speech: <span className="font-mono text-emerald-400 font-medium">{modelStatus?.speech.model || 'Whisper-tiny.en (INT8)'}</span>
          </span>
          <span className="text-slate-500">•</span>
          <span className="text-slate-400 hidden sm:inline">
            Device: <span className="font-mono text-slate-200">Host CPU (x86_64)</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          {aiStatus === 'DEMO_MODE' && (
            <Badge variant="warning" size="sm">
              DEMO SIMULATION
            </Badge>
          )}
          {messages.length > 0 && (
            <button
              onClick={handleClear}
              className="text-slate-400 hover:text-rose-400 transition-colors flex items-center gap-1 text-xs"
              title="Clear current session"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear chat</span>
            </button>
          )}
        </div>
      </div>

      {/* Error Banner */}
      {errorNotice && (
        <div className="mb-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>
              <strong>Service Notice:</strong> {errorNotice}
            </span>
          </div>
          <button
            onClick={() => setErrorNotice(null)}
            className="text-rose-400 hover:text-rose-200 font-bold ml-3"
          >
            &times;
          </button>
        </div>
      )}

      {/* Speech Success Banner */}
      {speechSuccessNotice && (
        <div className="mb-3 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{speechSuccessNotice}</span>
          </div>
          <button
            onClick={() => setSpeechSuccessNotice(null)}
            className="text-emerald-400 hover:text-emerald-200 font-bold ml-3"
          >
            &times;
          </button>
        </div>
      )}

      {/* Chat Messages Canvas */}
      <div className="flex-1 overflow-y-auto pr-2 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/5">
              <Bot className="w-8 h-8" />
            </div>

            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Private AI Tutor
            </h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-md">
              Ask questions on coursework, algorithmic problem-solving, or literature review using text or local voice input.
            </p>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs">
              <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full">
                <ShieldCheck className="w-3.5 h-3.5" />
                100% Local Inference • Zero Cloud API Transmission
              </span>
              <span className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 rounded-full font-mono">
                <Volume2 className="w-3.5 h-3.5" />
                Whisper INT8 Speech-to-Text
              </span>
            </div>

            {/* Suggested Prompts */}
            <div className="mt-8 w-full max-w-xl">
              <div className="flex items-center gap-2 mb-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                <span>Suggested Questions</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {samplePrompts.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setInput(prompt);
                    }}
                    className="p-3 text-left rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 text-xs text-slate-700 dark:text-slate-300 transition-all hover:shadow-sm"
                  >
                    "{prompt}"
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          messages.map(msg => (
            <div
              key={msg.id}
              className={`flex gap-3.5 ${
                msg.sender === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {msg.sender === 'assistant' && (
                <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white flex-shrink-0 mt-1 shadow-sm shadow-indigo-600/30">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-2xl rounded-2xl p-4 text-sm leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-indigo-600 text-white rounded-br-none'
                    : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-slate-100 rounded-bl-none shadow-sm'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.text}</div>

                {/* Telemetry and timestamp */}
                <div
                  className={`mt-2 pt-2 border-t flex items-center justify-between text-[10px] ${
                    msg.sender === 'user'
                      ? 'border-indigo-500/50 text-indigo-200'
                      : 'border-slate-200 dark:border-slate-700/60 text-slate-400'
                  }`}
                >
                  <span>{msg.timestamp}</span>
                  {msg.latencyMs !== undefined && (
                    <span className="font-mono text-emerald-500 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      {msg.tokensPerSec ? `${msg.tokensPerSec} tok/s • ` : ''}{msg.latencyMs}ms (Host CPU Local)
                    </span>
                  )}
                </div>
              </div>

              {msg.sender === 'user' && (
                <div className="w-8 h-8 rounded-xl bg-slate-700 flex items-center justify-center text-white flex-shrink-0 mt-1">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))
        )}

        {/* Thinking / Inferencing Indicator */}
        {isThinking && (
          <div className="flex gap-3.5 justify-start animate-fadeIn">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white flex-shrink-0 mt-1 shadow-sm shadow-indigo-600/30">
              <Bot className="w-4 h-4" />
            </div>
            <div className="rounded-2xl p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-slate-100 rounded-bl-none shadow-sm flex items-center gap-3">
              <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />
              <div className="flex flex-col">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
                  Thinking locally on Host CPU...
                </span>
                <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                  <Clock className="w-3 h-3" />
                  Elapsed: {thinkingSeconds}s
                </span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Dock */}
      <div className="pt-3">
        {/* Audio Recording / Transcribing Live Indicator */}
        {isRecording && (
          <div className="mb-2 flex items-center justify-between px-3.5 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs animate-fadeIn">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
              <span className="font-medium">Recording voice query locally...</span>
              <span className="font-mono text-rose-400">({recordingSeconds}s)</span>
            </div>
            <span className="text-[11px] text-rose-300/80">Click mic again to transcribe</span>
          </div>
        )}

        {isTranscribing && (
          <div className="mb-2 flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs animate-fadeIn">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
            <span className="font-medium">Transcribing speech in memory via faster-whisper INT8 (zero cloud transmission)...</span>
          </div>
        )}

        <div className="relative flex items-center rounded-2xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 shadow-sm focus-within:border-indigo-500 dark:focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all p-1.5">
          {/* Microphone button */}
          <button
            onClick={handleMicClick}
            disabled={isThinking || isTranscribing}
            className={`p-2.5 rounded-xl transition-all ${
              isRecording
                ? 'bg-rose-500 text-white animate-pulse shadow-md shadow-rose-500/30'
                : 'text-slate-400 hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-700/50'
            }`}
            title={isRecording ? 'Stop recording and transcribe' : 'Speak your question (Local Whisper INT8)'}
          >
            {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* Text input */}
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            disabled={isThinking}
            placeholder={
              isRecording
                ? 'Listening... Click mic to finish speaking'
                : isTranscribing
                ? 'Transcribing speech locally...'
                : isThinking
                ? 'Model is generating response...'
                : 'Ask anything or click the microphone to speak... (e.g., Explain dynamic programming)'
            }
            className="flex-1 bg-transparent px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none disabled:opacity-50"
          />

          {/* Send button */}
          <button
            onClick={handleSend}
            disabled={!input.trim() || isThinking || isRecording}
            className="p-2.5 rounded-full bg-[#8052FF] hover:bg-[#6E3EF0] text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm shadow-[#8052FF]/30"
            title="Send query"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

        <p className="mt-2 text-center text-[10px] text-[#9A9A9A]">
          EvallQ operates 100% locally on-device. Zero audio or student prompts are sent to cloud services.
        </p>
      </div>
    </div>
  );
};
