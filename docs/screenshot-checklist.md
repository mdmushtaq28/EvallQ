# FocusFlow AI: Competition Screenshot & Evidence Capture Checklist

This checklist defines the complete set of visual evidence required for competition submission artifacts, slide decks, and documentation showcase for the **Qualcomm Snapdragon AI Lab Build & Present Challenge**.

---

## 1. Visual Capture Specifications

- **Recommended Resolution**: 1920x1080 (16:9 full HD) or 2560x1440.
- **Color Scheme**: FocusFlow Dark Mode (Slate-900 / Indigo / Emerald accents).
- **Target Directory**: `docs/screenshots/` (recommended storage for submission captures).
- **Window Framing**: Clean browser window (F11 full screen or clean border without external toolbars).

---

## 2. Screenshot Inventory & Capture Instructions

### Screenshot 1: System Dashboard & Snapdragon Target Card
- **Filename**: `screenshot-01-dashboard-overview.png`
- **Route**: `http://localhost:5173/dashboard`
- **Setup**: Ensure backend is running and all 4 engine status badges display green **ACTIVE**.
- **Key Callouts to Annotate**:
  1. Top Engine Strip: LLM (`qwen2.5:0.5b`), Vision (`ultra-face-320`), Speech (`whisper-tiny.en`), Embeddings (`bge-small-en-v1.5`).
  2. Study Metrics: Focus hours, active documents, total study interactions.
  3. **Snapdragon Migration Architecture Card**: Current Environment (`Host CPU / x86_64`) vs. Target Platform (`Snapdragon X Series / Hexagon NPU - TARGET / PENDING VALIDATION`).

---

### Screenshot 2: Document Grounding & Semantic RAG
- **Filename**: `screenshot-02-study-materials-rag.png`
- **Route**: `http://localhost:5173/study-materials`
- **Setup**: Select an ingested academic document (e.g. *Attention Is All You Need* or Machine Learning notes).
- **Key Callouts to Annotate**:
  1. Semantic document search bar returning ranked text chunks.
  2. Grounded Q&A prompt interface with exact text chunk citations.
  3. Vector similarity search powered entirely on-device by `bge-small-en-v1.5` (<15ms latency).

---

### Screenshot 3: Interactive Quiz Synthesis & Flashcards
- **Filename**: `screenshot-03-quiz-and-flashcards.png`
- **Route**: `http://localhost:5173/study-materials` (Quiz / Flashcards Tab)
- **Setup**: Generate a 3-question quiz; select an option to show immediate explanation modal; toggle to flashcard flip card.
- **Key Callouts to Annotate**:
  1. Grounded multiple-choice quiz synthesized directly from local document chunks.
  2. Explanations citing source paragraphs.
  3. Interactive 3D flip study flashcards with question and answer sides.

---

### Screenshot 4: Voice-Enabled AI Tutor
- **Filename**: `screenshot-04-voice-tutor-active.png`
- **Route**: `http://localhost:5173/tutor`
- **Setup**: Record a voice query or trigger a speech transcription; display the conversation thread with citations.
- **Key Callouts to Annotate**:
  1. Voice input button with real-time waveform / recording indicator.
  2. Rapid speech-to-text transcription result (`Whisper-tiny.en` INT8 via faster-whisper).
  3. LLM streaming response (~109 tokens/sec) grounded in document context.
  4. Privacy badge: *"Audio processed strictly in RAM; never leaves device"*.

---

### Screenshot 5: Local Vision Focus Mode (Active Presence)
- **Filename**: `screenshot-05-focus-mode-tracking.png`
- **Route**: `http://localhost:5173/focus`
- **Setup**: Start a live Focus Session; position face toward the camera.
- **Key Callouts to Annotate**:
  1. Real-time webcam overlay with green face detection bounding box.
  2. Telemetry panel: State (`Present / Screen-facing`), FPS (`~50 FPS`), Latency (`~19ms`).
  3. Focus Session Timer and accumulating focus score.
  4. Privacy banner: *"Zero biometric storage. Observable presence only."*

---

### Screenshot 6: Focus Mode State Transition (Temporal Debounce)
- **Filename**: `screenshot-06-focus-mode-away.png`
- **Route**: `http://localhost:5173/focus`
- **Setup**: Turn head away or step back from camera frame to trigger the 3-frame debounce.
- **Key Callouts to Annotate**:
  1. State transition from `Present` to `Away` or `Head Turned`.
  2. Observable visual telemetry showing detection probability drop.
  3. Demonstration of scientific honesty: no psychological mind-reading, strictly observable presence.

---

### Screenshot 7: Local Analytics & One-Click Export
- **Filename**: `screenshot-07-analytics-and-export.png`
- **Route**: `http://localhost:5173/analytics`
- **Setup**: View analytics after recording at least one study/focus session.
- **Key Callouts to Annotate**:
  1. Weekly focus distribution chart.
  2. Historical focus session log with duration, average presence, and focus scores.
  3. **"Export Data (JSON)"** action button showing full student data ownership and portability.

---

### Screenshot 8: System Settings & Model Inventory
- **Filename**: `screenshot-08-settings-and-snapdragon.png`
- **Route**: `http://localhost:5173/settings`
- **Setup**: Open settings showing local model configurations and the runtime status card.
- **Key Callouts to Annotate**:
  1. Model selection showing local engines: `qwen2.5:0.5b`, `whisper-tiny.en`, `ultra-face-320`.
  2. Architecture comparison strip with current execution providers.
  3. Qualcomm AI Stack migration readiness note.

---

### Screenshot 9: Verified Model Status API Output
- **Filename**: `screenshot-09-terminal-model-status.png`
- **Action**: Run terminal command:
  ```bash
  curl -s http://127.0.0.1:8000/api/model/status | jq .
  ```
- **Key Callouts to Annotate**:
  1. `current_environment: "Host CPU / x86_64"`.
  2. `snapdragon.status: "target"`.
  3. `snapdragon.validated: false`.
  4. Undeniable proof of technical honesty and compliance with Section 21 rules.

---

### Screenshot 10: Empirical Host Benchmark Suite
- **Filename**: `screenshot-10-benchmark-suite.png`
- **Action**: Run terminal command:
  ```bash
  python backend/benchmark.py
  ```
- **Key Callouts to Annotate**:
  1. Real measured latencies across all 4 pipelines.
  2. Vision: 19.88 ms (50.3 FPS).
  3. Speech: 107.2 ms (0.054x RTF).
  4. Embedding: 10.76 ms / chunk.
  5. LLM: 109.3 tokens / second.
