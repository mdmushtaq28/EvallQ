# FocusFlow AI: Live Demo Fallback & Contingency Plan

This document establishes standard operating fallback procedures during live competition presentations, video recordings, and judge evaluations. In accordance with competition rules, **no fallback procedure involves fabricating AI responses or simulating unverified results**. If live execution encounters a hardware obstacle, the presenter switches to clearly labeled recorded evidence.

---

## Contingency Playbook Matrix

| Failure Mode | Trigger Indicator | Immediate Root Cause | Authorized Live Mitigation | Fallback Evidence Reference |
| :--- | :--- | :--- | :--- | :--- |
| **1. Ollama Not Responding** | Chat returns *"Inference Unavailable"* or HTTP 503 | Ollama service process terminated or port collision | Run PowerShell: `Start-Process ollama serve`. Wait 3 seconds, retry. | Present pre-recorded verified interaction in [`docs/local-ai-tutor.md`](file:///d:/FocusFlow%20AI/docs/local-ai-tutor.md). |
| **2. Slow LLM Response** | Generation takes $> 5$ seconds | Host CPU throttling or competing background process | Switch prompt to shorter query: *"Define mutex in one sentence."* | Reference verified benchmark numbers in [`docs/benchmarks.md`](file:///d:/FocusFlow%20AI/docs/benchmarks.md) (109.3 tok/s). |
| **3. Microphone Unavailable** | Browser error: *"Microphone access denied"* | Windows permissions or microphone in use by meeting software | Click lock icon in browser address bar -> Permissions -> Allow Microphone. Reload page. | Type the spoken query into chat text box and explain that speech runs via `POST /api/speech/transcribe`. |
| **4. Webcam Unavailable** | Video feed black or *"Camera access denied"* | Windows Camera locked by Zoom, Teams, or browser permission | Close background video conferencing apps. Refresh page (`Ctrl + F5`). | Demonstrate Focus Mode telemetry using the automated test suite output in [`docs/focus-mode.md`](file:///d:/FocusFlow%20AI/docs/focus-mode.md). |
| **5. PDF Upload Failure** | Upload banner displays *"Could not parse"* | Non-standard or DRM-encrypted PDF | Select pre-ingested lecture note `Distributed_Systems_Lecture.pdf` directly from document list. | Present pre-indexed document chunks and schema in [`docs/local-rag-study-suite.md`](file:///d:/FocusFlow%20AI/docs/local-rag-study-suite.md). |
| **6. Backend Unavailable** | Red status badges; *"Network Error"* | FastAPI process terminated | Open backend terminal, run: `uvicorn app.main:app --host 127.0.0.1 --port 8000`. | Run `python test_all_features.py` to demonstrate passing subsystem outputs. |
| **7. Frontend Failure** | Blank white screen or browser crash | Cached stale bundle or dev server disconnect | Run `npm run build` then `npm run preview`, or refresh browser with `Ctrl + Shift + R`. | Present production build verification logs from [`docs/FINAL_SUBMISSION_CHECKLIST.md`](file:///d:/FocusFlow%20AI/docs/FINAL_SUBMISSION_CHECKLIST.md). |
| **8. Internet Unavailable** | Wi-Fi disconnects or airplane mode | Zero effect on FocusFlow AI | Continue demo without interruption; highlight that FocusFlow operates 100% offline. | Open terminal, demonstrate `curl -s http://127.0.0.1:8000/api/model/status` functioning with no WAN. |

---

## Detailed Fallback Procedures

### 1. Ollama Daemon Recovery Procedure
If Ollama fails to respond during the live AI Tutor demonstration:
1. **Diagnosis**: Check if `ollama serve` is running:
   ```powershell
   Get-Process -Name ollama -ErrorAction SilentlyContinue
   ```
2. **Restart**:
   ```powershell
   Start-Process ollama serve
   Start-Sleep -Seconds 2
   curl http://127.0.0.1:11434/api/tags
   ```
3. **Presenter Spoken Pivot**:
   > *"As you can see, our backend strictly calls the local Ollama daemon at localhost:11434 rather than a cloud API. When the local daemon is active, Qwen processes tokens on-device."*

---

### 2. Media Device (Camera / Mic) Fallback Procedure
If the competition venue prevents browser access to the webcam or microphone:
1. **Microphone Fallback**:
   - Type the prompt: *"Explain binary search algorithm and its time complexity."*
   - Open terminal and show the automated speech test:
     ```powershell
     cd "d:\FocusFlow AI\backend"
     .\.venv\Scripts\python.exe -c "from app.services.ai.speech import speech_service; print(speech_service.get_status())"
     ```
   - Presenter Pivot:
     > *"Due to browser security policies in this sandbox, our audio input route `POST /api/speech/transcribe` can also be triggered directly from recorded WAV buffers, transcribing in 107 milliseconds via faster-whisper INT8."*
2. **Camera Fallback**:
   - Open terminal and demonstrate the vision engine directly:
     ```powershell
     cd "d:\FocusFlow AI\backend"
     .\.venv\Scripts\python.exe -c "from app.services.ai.vision import face_detector; print(face_detector.get_status())"
     ```
   - Presenter Pivot:
     > *"Our UltraFace-320 ONNX model is initialized in memory via ONNX Runtime CPUExecutionProvider, executing in 19 milliseconds at 50 FPS."*

---

### 3. Pre-Loaded Offline Document Fallback
To guard against file picker delays or corrupt attendee PDFs during the live presentation:
- The database `backend/focusflow.db` comes pre-populated with:
  - `Distributed_Systems_Lecture.pdf` (4 chunks, 2 pages, complete vector embeddings).
  - Pre-cached executive summary and 5 key takeaways.
- If an uploaded test file is unreadable, immediately click `Distributed_Systems_Lecture.pdf` and proceed with Q&A and Quiz demonstration without delay.

---

### 4. Demonstrating Offline Resilience Under Zero Internet
If judges ask to verify that FocusFlow AI is truly zero-cloud:
1. Open Windows Network Settings or disconnect Wi-Fi.
2. In the browser, navigate between **Dashboard**, **Study Materials**, and **AI Tutor**.
3. Submit a document query: *"What is the CAP theorem?"*.
4. Show the response generated in real time with the network physically disabled.
5. Presenter Statement:
   > *"This proves that FocusFlow AI has zero cloud reliance. No packets were transmitted over the network; all reasoning, vector retrieval, and speech processing occurred right here on this machine."*
