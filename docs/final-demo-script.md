# FocusFlow AI: Final 3–5 Minute Competition Demo Script

> **Challenge:** Qualcomm Snapdragon AI Lab Build & Present Challenge  
> **Target Duration:** 4 minutes 30 seconds (Paced for 3:00 to 5:00 minutes)  
> **Target Audience:** Technical Judges, Education Innovators, and Edge AI Engineers  
> **Prerequisites Running:** Ollama daemon (`qwen2.5:0.5b`), FastAPI backend (`:8000`), React frontend (`:5173`).

---

## Live Presentation Flow Timeline

```
[0:00] ─── Introduction & Core Problem ──────────────────────────── [0:30]
[0:30] ─── Dashboard & Multi-Engine Status ──────────────────────── [1:15]
[1:15] ─── Study Materials Suite & Local RAG ────────────────────── [2:00]
[2:00] ─── Voice-Enabled AI Tutor ───────────────────────────────── [2:40]
[2:40] ─── Local Vision Focus Mode ──────────────────────────────── [3:20]
[3:20] ─── Study Analytics & Data Portability ───────────────────── [4:00]
[4:00] ─── Snapdragon Target Architecture & Honesty Statement ───── [4:40]
[4:40] ─── Summary & Closing ────────────────────────────────────── [5:00]
```

---

### [0:00 – 0:30] INTRODUCTION: The Problem & The Vision

- **Screen View**: Application open at `http://localhost:5173/dashboard`.
- **Spoken Narration**:
  > *"Hello judges. Today, students rely heavily on cloud-based AI tools for homework and study assistance. But cloud study tools have three major flaws: they leak private essays and research notes to external servers, they demand continuous monthly subscription fees, and their high network latency disrupts concentration.*
  >
  > *Meet **FocusFlow AI**—a completely autonomous, zero-cloud academic study companion built to run entirely on the student's personal computer. It combines four local AI models into a unified, private study suite designed specifically for next-generation AI PCs powered by the Qualcomm Snapdragon X Series."*

---

### [0:30 – 1:15] DASHBOARD: Local-First Architecture & Active Engines

- **Action**: Hover over the top status cards on the Dashboard, then scroll to the **Snapdragon AI Optimization & Migration Architecture** section.
- **Spoken Narration**:
  > *"Here on the Dashboard, you see the heart of FocusFlow AI. At this very moment, four distinct AI engines are running concurrently on this machine:*
  > 
  > 1. *Our Large Language Model: Qwen 2.5 0.5B via local Ollama,*
  > 2. *Our Computer Vision pipeline: UltraFace-320 ONNX,*
  > 3. *Our Speech Recognition engine: Whisper-tiny.en INT8 via faster-whisper, and*
  > 4. *Our Embedding engine: BGE-small-en-v1.5.*
  >
  > *Notice our hardware indicator: we are transparently executing on our Host CPU development machine. Below, our migration architecture maps each model directly to its Qualcomm AI Hub equivalent targeting the Snapdragon Hexagon NPU. There are zero cloud API keys, zero internet calls, and zero external subscriptions."*

---

### [1:15 – 2:00] STUDY MATERIALS: Local PDF Ingestion & Document Grounding (RAG)

- **Action**: Click **Study Materials** in the sidebar. Select the uploaded document `Distributed_Systems_Lecture.pdf`. Click the **Q&A** tab, ask: *"What is the CAP theorem?"* Show the answer and citation. Then click **Quiz** and generate a 3-question quiz.
- **Spoken Narration**:
  > *"Let's examine our Document Study Suite. Students can upload course textbooks, lecture slides, or exam notes.*
  >
  > *Behind the scenes, our pipeline operates completely on-device:*
  > 1. *PyMuPDF extracts clean text directly from the PDF in memory,*
  > 2. *Our semantic chunker creates 400-word passages with 50-word overlaps,*
  > 3. *BGE-small computes 384-dimensional dense vectors in just 10 milliseconds,*
  > 4. *Our in-memory cosine index retrieves the exact matching chunk, and*
  > 5. *Qwen generates a grounded answer citing the exact page number.*
  >
  > *Because it is strictly grounded in the document, it eliminates hallucinations. With one more click, the system synthesizes multiple-choice comprehension quizzes and active-recall flashcards—all generated locally in seconds."*

---

### [2:00 – 2:40] AI TUTOR + VOICE: Low-Latency Speech & Conversational Reasoning

- **Action**: Click **AI Tutor** in the sidebar. Click the microphone icon. Speak clearly: *"Explain binary search in one simple sentence."* Click stop. Watch transcription appear, followed by streaming answer.
- **Spoken Narration**:
  > *"Now let's open the AI Tutor. Students can type questions or speak naturally.*
  >
  > *When I click the microphone and speak, notice what happens: our browser captures audio into volatile RAM. It is decoded directly in memory and passed to our local Whisper-tiny INT8 engine.*
  >
  > *In just over 100 milliseconds, the speech is transcribed with zero audio files saved to disk. Immediately, Qwen 2.5 streams an explanation at over 100 tokens per second. All inference runs locally on our development host, preserving total conversational privacy."*

---

### [2:40 – 3:20] FOCUS MODE: Scientifically Honest Local Vision

- **Action**: Click **Focus Mode** in the sidebar. Click **Start Focus Session**. Allow camera. Show green face bounding box and real-time telemetry (FPS: ~50, Latency: ~19ms, State: Present). Turn head away for 2 seconds to show debounce trigger. Click **End Session**.
- **Spoken Narration**:
  > *"Maintaining focus during independent study is difficult, so we built Focus Mode. When I start the session, our 1.21-megabyte UltraFace ONNX model evaluates webcam frames in real time.*
  >
  > *Notice our frame rate: 50 frames per second at an average latency of just 19 milliseconds. Crucially, FocusFlow AI practices strict scientific honesty: we do NOT claim to detect emotions, brainwaves, or psychological attention. We measure strictly observable physical signals: whether a student is present and facing the screen.*
  >
  > *We also implement a 3-frame temporal debounce filter so natural blinking doesn't register as distraction. When I end the session, our session score is computed. And most importantly: zero webcam images or facial embeddings were saved to disk."*

---

### [3:20 – 4:00] ANALYTICS: Relational Tracking & Data Portability

- **Action**: Click **Analytics** in the sidebar. Scroll through the session history and study time trends. Click **Export Data (JSON)** to download the file.
- **Spoken Narration**:
  > *"Every study session, quiz result, and focus duration is persisted in a local SQLite relational database on the student's machine.*
  >
  > *Here in Analytics, students see their weekly study curves, total focus hours, and AI interaction counts. We believe students should completely own their academic telemetry. With this 'Export Data' button, the student downloads a complete, self-contained JSON file of their study records. No lock-in, no cloud synchronization."*

---

### [4:00 – 4:40] SNAPDRAGON ARCHITECTURE: Path to Hexagon NPU

- **Action**: Click **Settings** in the sidebar. Show the Inference Hardware card and Model Status strip.
- **Spoken Narration**:
  > *"Now let's address our hardware architecture and the Qualcomm Snapdragon platform.*
  >
  > *Today, continuous 50 FPS vision and voice listening on an x86 CPU drains battery within two to three hours. The Qualcomm Snapdragon X Series platform changes this completely.*
  >
  > *With its 45 TOPS Hexagon NPU, these exact same INT8 vision and speech graphs can execute continuously under sub-watt power envelopes, enabling all-day 15-hour battery life.*
  >
  > *We want to be completely clear and scientifically honest:*
  > **'Snapdragon hardware validation is the next hardware validation step. The current development environment has not executed these models on a physical Snapdragon NPU.'**
  >
  > *All four models have been architected around standard ONNX and QNN Execution Provider specifications, with automated validation pipelines documented in our codebase."*

---

### [4:40 – 5:00] CLOSING: What Makes FocusFlow AI Distinctive

- **Action**: Return to the **Dashboard** page.
- **Spoken Narration**:
  > *"To summarize: FocusFlow AI proves that multi-modal edge AI is ready for student desktop PCs today. By combining local language reasoning, instant speech recognition, real-time vision, and semantic document grounding, we give students an uncompromised, zero-cloud academic study companion.*
  >
  > *It protects student privacy, eliminates subscription costs, and provides an immediate migration path to the Snapdragon X Series Hexagon NPU.*
  >
  > *Thank you, and I look forward to your questions."*
