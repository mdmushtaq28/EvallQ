# FocusFlow AI: Competition Demo Pre-Flight Checklist

This checklist ensures seamless, error-free execution of the live 3–5 minute competition presentation for the **Snapdragon AI Lab Build & Present Challenge**.

---

## 1. Pre-Flight Timeline (Countdown to Presentation)

| Time | Stage | Action Items | Status |
| :--- | :--- | :--- | :---: |
| **T-15 min** | **Environment Cleanliness** | 1. Terminate conflicting background processes (Zoom, Teams, Skype) holding camera/mic.<br>2. Verify ports `8000` (FastAPI) and `5173` (Vite) are unoccupied.<br>3. Open terminal in `d:\FocusFlow AI`. | [ ] |
| **T-10 min** | **Service Initializations** | 1. Confirm Ollama daemon is running: `curl http://127.0.0.1:11434/api/tags`<br>2. Confirm model presence: `ollama list` contains `qwen2.5:0.5b`<br>3. Activate backend venv: `.\backend\.venv\Scripts\Activate.ps1` | [ ] |
| **T-7 min** | **Verification Run** | 1. Run automated test suite: `$env:PYTHONPATH="d:\FocusFlow AI\backend"; python scratch/test_all_features.py`<br>2. Confirm all 7 features report `[PASS]`. | [ ] |
| **T-5 min** | **Launch Services** | 1. Launch Backend in Terminal 1: `uvicorn app.main:app --host 127.0.0.1 --port 8000`<br>2. Launch Frontend in Terminal 2: `npm run dev` in `frontend/`<br>3. Open browser at `http://localhost:5173`. | [ ] |
| **T-2 min** | **Browser & Media Check** | 1. Open DevTools Console (F12) to verify 0 unhandled runtime errors.<br>2. Check camera and microphone permissions allowed on `http://localhost:5173`.<br>3. Navigate to **Dashboard** and confirm the 4 Model Status badges are green ("ACTIVE"). | [ ] |
| **T-0 min** | **Ready to Present** | Follow [`docs/demo-script.md`](file:///d:/FocusFlow%20AI/docs/demo-script.md). | [ ] |

---

## 2. Hardware & Software Readiness Matrix

### A. Core Software Pre-Requisites
- [ ] **Operating System**: Windows 11 (or 10) x86_64 host (Target architecture: Snapdragon X Series ARM64).
- [ ] **Python Runtime**: Python 3.11+ installed in `backend/.venv`.
- [ ] **Node.js**: Node 18+ and npm installed.
- [ ] **Ollama**: v0.3+ installed and serving on `127.0.0.1:11434`.
- [ ] **Browser**: Chrome / Edge with WebRTC camera and audio capture permitted.

### B. AI Engine Readiness Verification
Run the verification check via browser or terminal:
```bash
curl -s http://127.0.0.1:8000/api/model/status
```
Expected JSON Response Structure:
```json
{
  "llm": { "status": "active", "model": "qwen2.5:0.5b", "engine": "ollama" },
  "speech": { "status": "active", "model": "whisper-tiny.en", "engine": "faster-whisper", "quantization": "int8" },
  "vision": { "status": "active", "model": "ultra-face-320", "engine": "onnxruntime", "device": "CPUExecutionProvider" },
  "embeddings": { "status": "active", "model": "bge-small-en-v1.5", "engine": "fastembed", "device": "CPUExecutionProvider" },
  "current_environment": "Host CPU / x86_64",
  "snapdragon": {
    "status": "target",
    "target_platform": "Snapdragon X Series / Hexagon NPU",
    "validated": false,
    "qnn_available": false
  }
}
```

### C. Demo Asset Pre-Loading
- [ ] **Sample Document**: Ensure a standard academic PDF is available in `backend/data/` or ready on desktop for upload during the demo.
- [ ] **Database Integrity**: `backend/focusflow.db` is initialized and accessible.
- [ ] **Audio Test Sample**: Ensure a standard microphone input device is selected as default in Windows Sound Settings.

---

## 3. Live Demo Flow Checklist (3–5 Minutes)

- [ ] **0:00 - 0:45 | Scene 1: Dashboard & Architectural Positioning**
  - Navigate to `/dashboard`.
  - Highlight the 4 active local AI engines (LLM, Vision, Speech, Embeddings).
  - Point out the **Snapdragon AI Optimization & Migration Architecture** banner showing `Host CPU / x86_64` current status and `Snapdragon X Series Hexagon NPU` target.
  - Stress zero cloud dependencies and zero data egress.

- [ ] **0:45 - 1:45 | Scene 2: Private RAG Document Study Suite**
  - Navigate to `/study-materials`.
  - Demonstrate instant semantic search or select the loaded paper.
  - Generate a 3-question grounded quiz; submit answers and reveal explanations.
  - Flip an active flashcard.
  - Emphasize sub-15ms vector retrieval via local `bge-small-en-v1.5`.

- [ ] **1:45 - 2:45 | Scene 3: Voice-Enabled AI Tutor**
  - Navigate to `/tutor`.
  - Click microphone icon, speak: *"Can you summarize the core concept of this paper?"*
  - Watch local faster-whisper transcribe in ~100ms.
  - Watch Qwen 2.5 stream response with document context citations at ~109 tokens/sec.
  - Emphasize raw audio decoded purely in RAM; zero external transmission.

- [ ] **2:45 - 3:45 | Scene 4: Local Vision Focus Mode**
  - Navigate to `/focus`.
  - Click **Start Focus Session**; allow webcam.
  - Observe real-time face detection bounding box and presence telemetry (50 FPS, ~19ms latency).
  - Briefly turn head away to show temporal debounce state transition (`Present` -> `Away`).
  - Stress: zero biometric storage, zero face embeddings, strictly observable visual signals.

- [ ] **3:45 - 4:45 | Scene 5: Local Analytics & Snapdragon Roadmap**
  - Navigate to `/analytics`.
  - Show session telemetry, focus score calculation, and study interaction history.
  - Click **Export Data (JSON)** to demonstrate user data sovereignty.
  - Navigate to `/settings` to review model status and target QNN EP migration paths.

---

## 4. Contingency & Troubleshooting Playbook

| Scenario | Indicator | Root Cause | Immediate Action |
| :--- | :--- | :--- | :--- |
| **Ollama Not Responding** | Tutor displays *"LLM Connection Failed"* | Ollama process stopped or port collision | Open PowerShell: `Start-Process ollama serve`. Wait 3 seconds, retry prompt. |
| **Webcam Feed Blank** | Focus Mode video box is black / loading | Camera locked by another Windows app | Close Zoom, Teams, or Camera app. Click "Reset Camera" or reload page (`Ctrl+F5`). |
| **Microphone Not Transcribing** | Audio indicator stays idle | Audio permissions or default device | Check Chrome lock icon in address bar -> Permissions -> Allow Microphone. Ensure headset is default in Windows. |
| **Port 8000 / 5173 In Use** | FastAPI or Vite fails on start | Orphaned background process from previous run | Kill port occupant in PowerShell:<br>`Get-Process -Id (Get-NetTCPConnection -LocalPort 8000).OwningProcess \| Stop-Process -Force` |
| **Browser Cache Stale** | UI components don't reflect latest build | Cached JS bundle in browser | Perform hard refresh: `Ctrl + Shift + R` or `Ctrl + F5`. |

---

## 5. Judge Q&A Defense Sheet

1. **"Are you running on a Snapdragon NPU right now?"**
   > *"No. We are completely transparent: today's live demonstration runs on our host x86_64 development machine using CPU execution providers. All four AI models have been selected and architected specifically with Qualcomm AI Hub equivalents, INT8 quantization, and ONNX QNN Execution Provider paths documented in `docs/snapdragon-architecture.md`."*

2. **"Why use Ollama instead of ONNX for the LLM?"**
   > *"Ollama provides an immediate, robust development runtime for Qwen 2.5 0.5B via GGUF. Our target architecture maps this to Qualcomm AI Hub's validated Qwen 2.5 ONNX package running via QNN EP on the Hexagon NPU."*

3. **"How do you ensure student privacy?"**
   > *"Zero cloud API keys exist anywhere in this codebase. Audio buffers are processed in memory through BytesIO and destroyed. Video frames are analyzed in transient NumPy arrays and immediately discarded. All data is saved exclusively to a local SQLite database on the student's device."*
