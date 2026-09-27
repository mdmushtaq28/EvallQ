# FocusFlow AI: Final Competition Evidence Checklist

This checklist details the 15 required visual and technical evidence artifacts for the **Qualcomm Snapdragon AI Lab Build & Present Challenge** submission package.

---

## Evidence Artifacts Matrix

| # | Artifact Item | Recommended Evidence Type | What Must Be Visible | Verification Status |
| :-: | :--- | :--- | :--- | :---: |
| **1** | **Dashboard** | Screenshot (`evidence-01-dashboard.png`) | Full dashboard layout showing active status for all 4 models, focus summary metrics, and zero-cloud indicators. | Ready to capture |
| **2** | **Model Status** | Terminal / API Screenshot (`evidence-02-model-status.png`) | `GET /api/model/status` JSON output showing `environment: "host"`, `device: "Snapdragon X Series"`, `validated: false`, `qnn_available: false`. | Ready to capture |
| **3** | **AI Tutor Response** | Screenshot (`evidence-03-ai-tutor.png`) | Conversational exchange showing user query, streaming Qwen 2.5 reply, latency metric (~100 tok/s), and privacy badge. | Ready to capture |
| **4** | **Voice Transcription** | Screenshot (`evidence-04-voice-input.png`) | Active recording UI, microphone waveform, and transcription success message (*"Transcribed in 142ms via Whisper-tiny.en"*). | Ready to capture |
| **5** | **PDF Upload** | Screenshot (`evidence-05-pdf-upload.png`) | Drag-and-drop file upload interface showing parsed PDF with chunk count, page count, and file size. | Ready to capture |
| **6** | **Document Summary** | Screenshot (`evidence-06-doc-summary.png`) | Executive summary card showing generated chapter overview and 5 bulleted key takeaways extracted from document. | Ready to capture |
| **7** | **RAG Answer with Citation** | Screenshot (`evidence-07-rag-citation.png`) | Grounded answer to student question with clickable source page number badge citing retrieved textbook chunks. | Ready to capture |
| **8** | **Quiz** | Screenshot (`evidence-08-quiz.png`) | Synthesized 3-question multiple-choice comprehension quiz with option selection and instant explanation modal. | Ready to capture |
| **9** | **Flashcards** | Screenshot (`evidence-09-flashcards.png`) | Interactive 3D flip study flashcards showing front concept and back definition with navigation arrows. | Ready to capture |
| **10** | **Focus Mode** | Screenshot (`evidence-10-focus-mode.png`) | Live webcam feed with green face detection bounding box, 50 FPS telemetry indicator, and temporal debounce state. | Ready to capture |
| **11** | **Analytics** | Screenshot (`evidence-11-analytics.png`) | Historical study time chart, focus scores, interaction counts, and the **"Export Data (JSON)"** download action. | Ready to capture |
| **12** | **Benchmark Results** | Terminal Screenshot (`evidence-12-benchmarks.png`) | Console execution of `python backend/benchmark.py` displaying measured latencies (Vision: 19.88ms, Speech: 107.2ms, Embeddings: 10.76ms, LLM: 109.3 tok/s). | Ready to capture |
| **13** | **Snapdragon Target Architecture** | Screenshot (`evidence-13-snapdragon-target.png`) | Settings page and Dashboard card displaying host CPU execution vs. Qualcomm AI Hub Hexagon NPU target roadmap. | Ready to capture |
| **14** | **Backend Test Results** | Terminal Screenshot (`evidence-14-backend-tests.png`) | Output of `python test_all_features.py` showing `ALL 11 SUBSYSTEM VERIFICATIONS PASSED!` with exit code 0. | Ready to capture |
| **15** | **Frontend Build Success** | Terminal Screenshot (`evidence-15-frontend-build.png`) | Output of `npm run build` showing 2,468 modules transformed in ~3.3s with 0 errors and clean exit code 0. | Ready to capture |

---

## Detailed Capture Guidance for Each Item

### 1. Dashboard (`evidence-01-dashboard.png`)
- **Route**: `http://localhost:5173/dashboard`
- **Visible Elements**:
  - Top 4 engine pills: LLM (`qwen2.5:0.5b`), Vision (`ultra-face-320`), Speech (`whisper-tiny.en`), Embeddings (`bge-small-en-v1.5`).
  - Study metrics: Total Study Time, Active Documents, Focus Score, AI Interactions.
  - Quick action buttons ("Launch AI Tutor", "Study Materials", "Start Focus Mode").

### 2. Model Status (`evidence-02-model-status.png`)
- **Command**: `curl -s http://127.0.0.1:8000/api/model/status | jq .`
- **Visible Elements**:
  - `"current_environment": "Host CPU / x86_64"`
  - `"snapdragon": { "status": "target", "device": "Snapdragon X Series", "validated": false, "qnn_available": false }`
  - Explicit proof of scientific integrity and compliance with competition rules.

### 3. AI Tutor Response (`evidence-03-ai-tutor.png`)
- **Route**: `http://localhost:5173/tutor`
- **Visible Elements**:
  - User query bubble.
  - Local Qwen 2.5 streaming response bubble.
  - Telemetry badge showing token generation speed (~100 tok/s) and latency.
  - Notice confirming local on-device generation.

### 4. Voice Transcription (`evidence-04-voice-input.png`)
- **Route**: `http://localhost:5173/tutor`
- **Visible Elements**:
  - Glowing microphone button during voice capture.
  - Transcribed text populating the input box.
  - Sub-title notice: *"Transcribed in ~140ms via Whisper-tiny.en (Host CPU INT8)"*.

### 5. PDF Upload (`evidence-05-pdf-upload.png`)
- **Route**: `http://localhost:5173/study-materials`
- **Visible Elements**:
  - Course document card for `Distributed_Systems_Lecture.pdf`.
  - Ingestion statistics: 4 chunks, 2 pages, file size.
  - Badge confirming local vector index generation.

### 6. Document Summary (`evidence-06-doc-summary.png`)
- **Route**: `http://localhost:5173/study-materials` (Summary Tab)
- **Visible Elements**:
  - Executive summary text synthesized by local Qwen.
  - Bulleted key takeaways list.
  - Generation latency pill (~1.8s to 3.6s).

### 7. RAG Answer with Citation (`evidence-07-rag-citation.png`)
- **Route**: `http://localhost:5173/study-materials` (Q&A Tab)
- **Visible Elements**:
  - Question: *"What is the CAP theorem?"*
  - Grounded answer explaining Consistency, Availability, Partition Tolerance.
  - Source citation pill displaying `"Page 2"` and matching passage excerpt.

### 8. Quiz (`evidence-08-quiz.png`)
- **Route**: `http://localhost:5173/study-materials` (Quiz Tab)
- **Visible Elements**:
  - 3 multiple-choice questions synthesized from document chunks.
  - Option radio buttons with one option selected.
  - Instant explanation box revealing the correct answer rationale.

### 9. Flashcards (`evidence-09-flashcards.png`)
- **Route**: `http://localhost:5173/study-materials` (Flashcards Tab)
- **Visible Elements**:
  - 3D flip card displaying front concept (*"Distributed Consensus"*).
  - Navigation controls ("Card 1 of 4", "Flip Card", "Next").

### 10. Focus Mode (`evidence-10-focus-mode.png`)
- **Route**: `http://localhost:5173/focus`
- **Visible Elements**:
  - Live webcam feed with green bounding box tracking face.
  - Telemetry HUD: State: `Present / Screen-facing`, FPS: `~50 FPS`, Latency: `~19ms`.
  - Privacy banner: *"Zero biometric storage. Observable presence only."*

### 11. Analytics (`evidence-11-analytics.png`)
- **Route**: `http://localhost:5173/analytics`
- **Visible Elements**:
  - Weekly study time distribution chart.
  - Recent focus sessions table with duration and focus score.
  - Prominent **"Export Data (JSON)"** download action button.

### 12. Benchmark Results (`evidence-12-benchmarks.png`)
- **Command**: `python backend/benchmark.py`
- **Visible Elements**:
  - Output table showing Vision (19.88ms / 50.3 FPS), Speech (107.2ms / 0.054x RTF), Embeddings (10.76ms), LLM (109.3 tok/s).
  - Confirmation of raw logging to `backend/benchmark_results.json`.

### 13. Snapdragon Target Architecture (`evidence-13-snapdragon-target.png`)
- **Route**: `http://localhost:5173/dashboard` & `http://localhost:5173/settings`
- **Visible Elements**:
  - Snapdragon Optimization & Migration card.
  - Comparative breakdown contrasting Host CPU (Dev) with Qualcomm Hexagon NPU (Target).

### 14. Backend Test Results (`evidence-14-backend-tests.png`)
- **Command**: `python backend/test_all_features.py`
- **Visible Elements**:
  - Passing status across all 11 subsystems.
  - Final banner: `ALL 11 SUBSYSTEM VERIFICATIONS PASSED!`

### 15. Frontend Build Success (`evidence-15-frontend-build.png`)
- **Command**: `npm run build` in `frontend/`
- **Visible Elements**:
  - `tsc -b && vite build`
  - `2468 modules transformed`
  - Clean exit code 0 without errors.
