import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  Square,
  Camera,
  Eye,
  ShieldCheck,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Cpu,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Card, CardHeader } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { api } from '../services/api';
import type { FocusSessionState, FocusSessionStatusResponse } from '../types';

export const FocusModePage: React.FC = () => {
  const { isDemoMode, backendConnected } = useApp();
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [focusState, setFocusState] = useState<FocusSessionState>('NOT_STARTED');

  // Timers & Metrics
  const [totalSeconds, setTotalSeconds] = useState(isDemoMode ? 2520 : 0);
  const [presentSeconds, setPresentSeconds] = useState(isDemoMode ? 2100 : 0);
  const [notDetectedSeconds, setNotDetectedSeconds] = useState(isDemoMode ? 420 : 0);
  const [focusScore, setFocusScore] = useState<number>(isDemoMode ? 83.33 : 100);
  const [screenFacing, setScreenFacing] = useState<boolean>(true);
  const [inferenceLatencyMs, setInferenceLatencyMs] = useState<number>(12.5);

  // Completed session summary state
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [completedSummary, setCompletedSummary] = useState<FocusSessionStatusResponse | null>(null);

  // Camera & Error handling
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isProcessingFrameRef = useRef(false);

  // Formatting helpers
  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins
      .toString()
      .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatMinSec = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins} min ${secs > 0 ? `${secs}s` : ''}`;
  };

  // Stop camera tracks cleanly
  const stopCameraStream = () => {
    if (frameTimerRef.current) {
      clearInterval(frameTimerRef.current);
      frameTimerRef.current = null;
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  // Start Camera Stream
  const initCameraStream = async (): Promise<boolean> => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API is not supported by your browser environment.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }

      setCameraActive(true);
      return true;
    } catch (err: unknown) {
      const msg =
        err instanceof Error && err.name === 'NotAllowedError'
          ? 'Camera permission was denied. Camera permission is required for Focus Mode presence detection.'
          : err instanceof Error
          ? err.message
          : 'Could not access local webcam.';
      setCameraError(msg);
      setCameraActive(false);
      return false;
    }
  };

  // Frame Capture & On-Device Vision Loop (Runs at ~5 FPS / 200ms)
  const startFrameCaptureLoop = () => {
    if (frameTimerRef.current) clearInterval(frameTimerRef.current);

    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
      canvasRef.current.width = 320;
      canvasRef.current.height = 240;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    frameTimerRef.current = setInterval(async () => {
      if (isProcessingFrameRef.current || !videoRef.current) return;
      if (videoRef.current.readyState < 2) return; // Wait for video frame readiness

      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, 320, 240);
        isProcessingFrameRef.current = true;

        canvas.toBlob(
          async blob => {
            if (!blob) {
              isProcessingFrameRef.current = false;
              return;
            }

            try {
              if (backendConnected && !isDemoMode) {
                const res = await api.sendFocusFrame(blob);
                setFocusState(res.state);
                setTotalSeconds(res.elapsed_seconds);
                setPresentSeconds(res.present_seconds);
                setNotDetectedSeconds(res.not_detected_seconds);
                setFocusScore(res.focus_score);
                setScreenFacing(res.screen_facing);
                setInferenceLatencyMs(res.inference_latency_ms);
              }
            } catch {
              // Ignore transient single frame network drops
            } finally {
              isProcessingFrameRef.current = false;
            }
          },
          'image/jpeg',
          0.7
        );
      }
    }, 200); // 5 FPS rate limit
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, []);

  // Session Handlers
  const handleStartSession = async () => {
    setSessionCompleted(false);
    setCompletedSummary(null);

    // Request camera permission only when user clicks Start Focus Session
    const cameraOk = await initCameraStream();
    if (!cameraOk && !isDemoMode) {
      return;
    }

    setIsActive(true);
    setIsPaused(false);
    setFocusState('FOCUSED');

    if (backendConnected && !isDemoMode) {
      try {
        const startRes = await api.startFocusSession();
        setTotalSeconds(startRes.elapsed_seconds);
        setPresentSeconds(startRes.present_seconds);
        setNotDetectedSeconds(startRes.not_detected_seconds);
        setFocusScore(startRes.focus_score);
      } catch (err: unknown) {
        console.warn('Backend start failed, running locally:', err);
      }
    } else {
      setTotalSeconds(0);
      setPresentSeconds(0);
      setNotDetectedSeconds(0);
      setFocusScore(100);
    }

    startFrameCaptureLoop();
  };

  const handlePauseSession = async () => {
    const nextPaused = !isPaused;
    setIsPaused(nextPaused);

    if (backendConnected && !isDemoMode) {
      try {
        const res = await api.pauseFocusSession();
        setFocusState(res.state);
      } catch {}
    } else {
      setFocusState(nextPaused ? 'PAUSED' : 'FOCUSED');
    }
  };

  const handleStopSession = async () => {
    setIsActive(false);
    setIsPaused(false);
    stopCameraStream();

    if (backendConnected && !isDemoMode) {
      try {
        const summary = await api.stopFocusSession();
        setFocusState('COMPLETED');
        setCompletedSummary(summary);
        setTotalSeconds(summary.elapsed_seconds);
        setPresentSeconds(summary.present_seconds);
        setNotDetectedSeconds(summary.not_detected_seconds);
        setFocusScore(summary.focus_score);
      } catch {}
    } else {
      setFocusState('COMPLETED');
      setCompletedSummary({
        session_id: 'demo-completed',
        state: 'COMPLETED',
        started_at: new Date().toISOString(),
        ended_at: new Date().toISOString(),
        elapsed_seconds: totalSeconds,
        present_seconds: presentSeconds,
        not_detected_seconds: notDetectedSeconds,
        screen_facing_seconds: presentSeconds,
        paused_seconds: 0,
        focus_score: focusScore,
      });
    }

    setSessionCompleted(true);
  };

  const getStateBadge = () => {
    switch (focusState) {
      case 'FOCUSED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/30 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            ● FOCUSED ({screenFacing ? 'Screen-facing' : 'Present'})
          </span>
        );
      case 'NOT_DETECTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 font-bold border border-rose-500/30 text-xs">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            ○ NOT DETECTED
          </span>
        );
      case 'PAUSED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/30 text-xs">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            PAUSED
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-500/30 text-xs">
            COMPLETED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 font-medium text-xs">
            STANDBY
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner / Session Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="brand" size="sm">
              Local Vision Sensor
            </Badge>
            {getStateBadge()}
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Observable Presence Study Session
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Measures observable physical presence and screen orientation via UltraFace ONNX. No emotional claims or video streaming.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {!isActive ? (
            <Button
              variant="snapdragon"
              icon={<Play className="w-4 h-4 fill-white" />}
              onClick={handleStartSession}
            >
              Start Focus Session
            </Button>
          ) : (
            <>
              <Button
                variant={isPaused ? 'primary' : 'outline'}
                icon={<Pause className="w-4 h-4" />}
                onClick={handlePauseSession}
              >
                {isPaused ? 'Resume' : 'Pause'}
              </Button>
              <Button
                variant="danger"
                icon={<Square className="w-4 h-4" />}
                onClick={handleStopSession}
              >
                End Session
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Camera Permission or Access Error Alert */}
      {cameraError && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <span>{cameraError}</span>
          </div>
          <Button variant="outline" size="sm" onClick={handleStartSession}>
            <RotateCw className="w-3.5 h-3.5 mr-1" /> Retry Camera
          </Button>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Camera Feed / Viewport (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="relative overflow-hidden">
            <CardHeader
              title="Camera Attention Sensor"
              subtitle="Runs on local UltraFace ONNX vision pipeline (Host CPU • 100% In-Memory)"
              icon={<Eye className="w-5 h-5" />}
            />

            {/* Video Viewport */}
            <div className="relative aspect-video rounded-xl bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover scale-x-[-1] ${
                  cameraActive ? 'block' : 'hidden'
                }`}
              />

              {!cameraActive && (
                <div className="text-center p-6 space-y-3">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500">
                    <Camera className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-300">
                      Webcam Monitor Standby
                    </h4>
                    <p className="text-xs text-slate-500 max-w-sm mt-1">
                      Camera permission is requested only when you click "Start Focus Session". Frames are evaluated in memory and discarded immediately.
                    </p>
                  </div>
                </div>
              )}

              {/* HUD Overlay when Camera is active */}
              {cameraActive && (
                <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                  <div className="px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-[11px] text-white font-mono flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        focusState === 'FOCUSED' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
                      }`}
                    />
                    <span>
                      {focusState === 'FOCUSED'
                        ? screenFacing
                          ? 'STATUS: SCREEN-FACING'
                          : 'STATUS: PRESENT'
                        : 'STATUS: NOT DETECTED'}
                    </span>
                  </div>
                  <div className="px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-[11px] text-white font-mono">
                    INFERENCE: {inferenceLatencyMs.toFixed(1)}ms • 5 FPS
                  </div>
                </div>
              )}
            </div>

            {/* Subtle Privacy Notice */}
            <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Privacy-first focus tracking
                </span>
                <span>•</span>
                <span>Camera frames are processed locally and are not stored.</span>
              </div>
              <span className="font-mono text-[11px] hidden sm:inline text-slate-400">
                UltraFace ONNX (1.2 MB)
              </span>
            </div>
          </Card>

          {/* Scientific Disclaimer Card */}
          <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 space-y-1.5">
            <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-semibold">
              <Cpu className="w-4 h-4 text-indigo-400" />
              <span>Observable Physical Presence Tracking</span>
            </div>
            <p className="leading-relaxed">
              FocusFlow AI measures only <strong>observable physical signals</strong> (face detected vs not detected, approximate screen alignment) using local ONNX computer vision. The system does not attempt to detect concentration, emotion, fatigue, or psychological states. All calculations use actual observed presence intervals.
            </p>
          </div>
        </div>

        {/* Right: Telemetry & Summary (1 col) */}
        <div className="space-y-4">
          <Card className="text-center">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest block mb-1">
              SESSION ELAPSED TIME
            </span>
            <div className="text-4xl lg:text-5xl font-extrabold font-mono tracking-tight text-slate-900 dark:text-white my-3">
              {formatTime(totalSeconds)}
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-300 font-mono">
              <Clock className="w-3.5 h-3.5" />
              <span>
                {isActive ? (isPaused ? 'SESSION PAUSED' : 'TRACKING ACTIVE') : 'STANDBY'}
              </span>
            </div>
          </Card>

          {/* Metrics breakdown */}
          <Card>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
              Observable Presence Breakdown
            </h4>

            <div className="space-y-4">
              {/* Focus Score Gauge */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-slate-600 dark:text-slate-300 font-medium">
                    Calculated Focus Score
                  </span>
                  <span className="text-base font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                    {focusScore.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-300 rounded-full"
                    style={{ width: `${Math.min(Math.max(focusScore, 0), 100)}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Formula: (Present Time / Active Session Duration) × 100
                </p>
              </div>

              {/* Present Time Counter */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span className="text-slate-700 dark:text-slate-200 font-medium">Present</span>
                </div>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {formatMinSec(presentSeconds)}
                </span>
              </div>

              {/* Not Detected Counter */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-500" />
                  <span className="text-slate-700 dark:text-slate-200 font-medium">Not Detected</span>
                </div>
                <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                  {formatMinSec(notDetectedSeconds)}
                </span>
              </div>
            </div>
          </Card>

          {/* Final Completed Summary Card */}
          {sessionCompleted && completedSummary && (
            <Card className="border-indigo-500/40 bg-indigo-50/20 dark:bg-indigo-950/20">
              <h4 className="text-sm font-bold text-indigo-600 dark:text-indigo-400 mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Focus Session Complete
              </h4>
              <div className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
                <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-800">
                  <span className="text-slate-500">Duration:</span>
                  <span className="font-mono font-semibold">
                    {formatMinSec(completedSummary.elapsed_seconds)}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-800">
                  <span className="text-slate-500">Present:</span>
                  <span className="font-mono font-semibold text-emerald-500">
                    {formatMinSec(completedSummary.present_seconds)}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-800">
                  <span className="text-slate-500">Away:</span>
                  <span className="font-mono font-semibold text-rose-500">
                    {formatMinSec(completedSummary.not_detected_seconds)}
                  </span>
                </div>
                <div className="flex justify-between py-1 pt-2">
                  <span className="font-bold">Focus Score:</span>
                  <span className="font-mono font-bold text-emerald-500 text-sm">
                    {completedSummary.focus_score.toFixed(1)}%
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 mt-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                Derived session metrics saved to local SQLite database (`focus_sessions`).
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
