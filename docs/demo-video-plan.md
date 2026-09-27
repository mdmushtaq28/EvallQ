# FocusFlow AI: Demo Video Recording Plan

> **Qualcomm Snapdragon AI Lab Build & Present Challenge**  
> **Target Video Duration:** 4 minutes 15 seconds (Hard limit: 5 minutes)  
> **Target Audience:** Competition Evaluators & Technical Judges  
> **Recommended Screen Resolution:** 1920x1080 (1080p, 60 FPS) or 2560x1440

---

## 1. Recording Setup & Desktop Layout

### Display Configuration
- **Resolution**: 1920x1080 full screen.
- **Color Theme**: FocusFlow Dark Mode (slate-900 / indigo / emerald).
- **Browser Window (Primary)**: Google Chrome or Microsoft Edge at 100% zoom, navigated to `http://localhost:5173`. Bookmarks bar hidden (`Ctrl + Shift + B`).
- **Terminal Window (Secondary / Picture-in-Picture or Split Screen)**: Windows Terminal with PowerShell, split into two panes:
  - *Left Pane*: Running `uvicorn app.main:app` (showing live HTTP 200 API request logs).
  - *Right Pane*: Open terminal ready for quick verification commands (`curl /api/model/status` or `python test_all_features.py`).

### Audio Setup
- Clean microphone input with noise suppression.
- System audio recording enabled to capture browser chime/feedback if active.

---

## 2. Recording Sequence & Scene Timeline

| Timecode | Scene Name | Active Screen | Execution Type | Narration Focus |
| :---: | :--- | :--- | :---: | :--- |
| **0:00 - 0:30** | **Title & Problem** | Title Slide / Dashboard View | Live | Core student study challenge: privacy leaks, monthly subscriptions, and network latency of cloud AI. |
| **0:30 - 1:15** | **Dashboard & Model Matrix** | Browser (`/dashboard`) | Live | 4 active local AI engines, zero cloud keys, truthful host execution status, and Snapdragon target card. |
| **1:15 - 2:00** | **Document RAG Suite** | Browser (`/study-materials`) | Live | Upload PDF, semantic search, grounded Q&A with page citation, quiz generation, and flashcard flip. |
| **2:00 - 2:40** | **Voice-Enabled AI Tutor** | Browser (`/tutor`) | Live | Spoken microphone query, in-RAM Whisper INT8 transcription (~100ms), streaming Qwen response (109 tok/s). |
| **2:40 - 3:20** | **Local Vision Focus Mode** | Browser (`/focus`) | Live | Start session, 50 FPS webcam face tracking, latency HUD, 3-frame debounce test, zero frame storage guarantee. |
| **3:20 - 4:00** | **Analytics & Export** | Browser (`/analytics`) | Live | Relational session charts, focus scoring heuristic, and one-click JSON data export download. |
| **4:00 - 4:40** | **Snapdragon Architecture** | Browser (`/settings`) + Terminal | Live & Recorded Evidence | Host CPU vs. Hexagon NPU target comparison; show `GET /api/model/status`; read Snapdragon disclaimer. |
| **4:40 - 5:00** | **Closing & Summary** | Browser (`/dashboard`) | Live | Recap: multi-modal edge AI, privacy, cost elimination, and Snapdragon X Series readiness. |

---

## 3. Screen Switching & Narration Instructions

### Scene 1: Introduction (0:00 – 0:30)
- **Visual**: FocusFlow AI Dashboard loaded in clean 1080p browser window.
- **Action**: Smoothly mouse over the top navigation bar.
- **Narration**:
  > *"Welcome to FocusFlow AI, an on-device, private academic study companion built for the Qualcomm Snapdragon AI Lab Challenge. Commercial cloud study tools leak student research papers to external servers and charge recurring subscription fees. FocusFlow AI runs four local AI models simultaneously right on the student's laptop, completely offline, with zero subscriptions and zero data egress."*

### Scene 2: Dashboard & Model Status (0:30 – 1:15)
- **Visual**: Dashboard top status bar and Snapdragon Migration card.
- **Action**: Hover over the 4 green status badges: LLM (`qwen2.5:0.5b`), Vision (`ultra-face-320`), Speech (`whisper-tiny.en`), Embeddings (`bge-small-en-v1.5`). Scroll to the Snapdragon architecture comparison table.
- **Narration**:
  > *"Here on the Dashboard, four distinct AI engines operate concurrently. Notice our device indicator: it truthfully reports Host CPU / x86_64 development status. Below, our migration architecture maps each model directly to Qualcomm AI Hub equivalents targeting the Snapdragon Hexagon NPU. No cloud API keys exist in this codebase."*

### Scene 3: Document RAG Study Suite (1:15 – 2:00)
- **Visual**: Study Materials page.
- **Action**: Click `Distributed_Systems_Lecture.pdf`. Click **Q&A**, submit: *"What is the CAP theorem?"*. Show answer and source citation. Click **Quiz** tab, generate 3 questions, click an option, and show the explanation modal. Flip a flashcard.
- **Narration**:
  > *"In Study Materials, students upload course textbooks. PyMuPDF extracts text, our semantic chunker creates 400-word passages, and BGE-small generates dense embeddings in 10 milliseconds. When we ask about the CAP theorem, our local index retrieves the exact chunk, and Qwen generates a grounded answer citing the exact page number, eliminating hallucinations. The system also synthesizes instant comprehension quizzes and active-recall flashcards."*

### Scene 4: Voice-Enabled AI Tutor (2:00 – 2:40)
- **Visual**: AI Tutor page.
- **Action**: Click microphone icon. Speak aloud: *"Explain binary search algorithm and its time complexity."* Click stop. Watch speech-to-text populate input box in ~150ms. Watch Qwen stream answer.
- **Narration**:
  > *"In the AI Tutor, students can speak questions naturally. Audio is recorded via WebRTC directly into volatile memory and transcribed by our local Whisper-tiny INT8 model in just over 100 milliseconds. No audio files are ever saved to disk. Immediately, Qwen streams an explanation at over 100 tokens per second, completely preserving student conversational privacy."*

### Scene 5: Local Vision Focus Mode (2:40 – 3:20)
- **Visual**: Focus Mode page.
- **Action**: Click **Start Focus Session**. Allow webcam. Position face in frame, show green bounding box and HUD (50 FPS, ~19ms latency). Turn head away for 2 seconds to show debounce trigger. Click **End Session**.
- **Narration**:
  > *"Focus Mode uses our 1.2-megabyte UltraFace ONNX model to evaluate webcam frames at 50 frames per second with just 19 milliseconds of latency. We practice strict scientific honesty: we do NOT claim to detect emotions or read minds. We only measure observable physical presence. A 3-frame debounce filter prevents natural blinks from triggering false alerts. And crucially, zero video frames or face vectors are ever written to disk."*

### Scene 6: Local Analytics & Data Portability (3:20 – 4:00)
- **Visual**: Analytics page.
- **Action**: Scroll through weekly study curves and session logs. Click **Export Data (JSON)** to trigger file download. Show downloaded JSON file in browser download bar.
- **Narration**:
  > *"Every study session and quiz result is persisted in a local SQLite relational database. In Analytics, students track their study curves and focus scores. Because students own their data, clicking 'Export Data' downloads a complete, self-contained JSON archive. No cloud synchronization, no vendor lock-in."*

### Scene 7: Snapdragon Architecture & Honesty Statement (4:00 – 4:40)
- **Visual**: Settings page showing Inference Hardware card, followed by quick terminal window showing `curl http://127.0.0.1:8000/api/model/status`.
- **Action**: Show JSON output with `validated: false` and `current_environment: "Host CPU / x86_64"`.
- **Narration**:
  > *"Running continuous 50 FPS vision and voice listening on an x86 CPU drains battery quickly. The Qualcomm Snapdragon X Series platform changes this completely: its 45 TOPS Hexagon NPU runs these INT8 models under a sub-watt power budget, enabling all-day 15-hour battery life.
  >
  > We want to state clearly and honestly: 'Snapdragon hardware validation is the next hardware validation step. The current development environment has not executed these models on a physical Snapdragon NPU.' All four models are built around standard ONNX and QNN Execution Provider specifications for direct compilation via Qualcomm AI Hub."*

### Scene 8: Closing (4:40 – 5:00)
- **Visual**: Return to Dashboard.
- **Action**: Smooth camera zoom / framing on the active engine badges.
- **Narration**:
  > *"FocusFlow AI proves that multi-modal edge AI is ready for student desktop PCs today—protecting privacy, eliminating subscription costs, and providing an immediate migration path to the Snapdragon Hexagon NPU. Thank you!"*

---

## 4. Live vs. Pre-Recorded Evidence Guidelines

- **Always Live**:
  - Dashboard navigation and model status checks.
  - PDF document Q&A and quiz synthesis.
  - Focus Mode real-time webcam tracking and debounce testing.
  - Analytics visualization and JSON data export download.
- **Pre-Recorded / Pre-Verified Backups (Only if venue hardware fails)**:
  - If microphone permissions fail in the recording room, use the verified speech transcription log from `test_all_features.py` (107ms latency).
  - If webcam permissions fail, show the verified vision benchmark table from `docs/benchmarks.md` (50.3 FPS).
  - Always verbally disclose if any recorded terminal excerpt is referenced.
