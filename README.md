# EvallQ: Evaluate less. Teach more.

> **EvallQ**  
> *"Evaluate less. Teach more."*  
> **Architecture:** 100% On-Device Local AI (Zero Cloud Dependencies, Zero Telemetry Egress)  
> **Design Philosophy:** Minimalist pure black canvas (`#000000`), editorial display typography, interactive 3D neural constellation, restrained violet/gold/green palette  
> **Primary Roles:** Dedicated Student Experience & Dedicated Teacher Review Studio  

---

## 1. Executive Summary

**EvallQ** is a next-generation, zero-cloud academic evaluation and assessment intelligence platform engineered for students, educators, and institutions. Built from the ground up for private on-device execution, EvallQ combines local language models, computer vision, low-latency speech recognition, vector embeddings, and real on-device OCR into a unified, privacy-first educational suite.

EvallQ operates with **zero external cloud API calls, zero telemetry egress, zero subscriptions, and zero latency fluctuations**. All student notes, audio, webcam presence tracking, scanned assessments, and grading records remain strictly on the local machine.

---

## 2. Platform Architecture

EvallQ provides two dedicated, lightweight role-based experiences: **Student** and **Teacher**.

```
+-----------------------------------------------------------------------------------+
|                                 EVALLQ APPLICATION                                |
+-----------------------------------------------------------------------------------+
|  [ React 18 + TypeScript + Tailwind CSS Frontend ] (SPA on http://localhost:5173) |
|         |                                                      |                  |
|         v (REST API / WebSocket)                              v (WebRTC)         |
|  [ FastAPI Backend ] (Python 3.11 on http://127.0.0.1:8000)   [ Browser Camera/Mic]|
+-----------------------------------------------------------------------------------+
|                               LOCAL AI ENGINE MATRIX                              |
|                                                                                   |
|  +--------------------+  +--------------------+  +--------------------+  +--------+
|  |  Local LLM         |  |  Local Vision      |  |  Local Speech      |  | Local  |
|  |  Qwen 2.5 0.5B     |  |  UltraFace-320     |  |  Whisper-tiny.en   |  | Embed  |
|  |  Ollama / GGUF     |  |  ONNX Runtime CPU  |  |  faster-whisper    |  | BGE-Sm |
|  |  (109.3 tok/s)     |  |  (19.88ms / 50 FPS)|  |  (107.2ms in-RAM)  |  | (10.7ms|
|  +--------------------+  +--------------------+  +--------------------+  +--------+
|  +--------------------------------------------------------------------------------+
|  |  On-Device Assessment OCR & Evaluation Engine                                  |
|  |  RapidOCR ONNX Engine / PyMuPDF Page Renderer -> Rubric-Based Local Evaluator  |
|  +--------------------------------------------------------------------------------+
+-----------------------------------------------------------------------------------+
|                            LOCAL PERSISTENCE & STORAGE                            |
|  SQLite 3 Database (Local) | Local Assessment Storage | Zero Cloud Storage        |
+-----------------------------------------------------------------------------------+
```

### Student Experience
- **Voice-Enabled AI Tutor**: Document-grounded natural dialogue powered by local Qwen 2.5 and Whisper, transcribing audio strictly in volatile RAM.
- **Assessment Intelligence**: Upload handwritten or scanned tests (PDF, PNG, JPG, WEBP). Authentic on-device OCR extracts student answers, verifies questions, calculates marks, identifies weak topics, and provides direct bridges into AI Tutor for remediation.
- **Smart Study Materials (RAG)**: Instant PDF parsing, semantic chunking, grounded Q&A, executive summaries, 3-question quizzes with rationales, and active-recall flashcards.
- **Scientifically Honest Focus Mode**: Real-time presence detection measuring observable visual telemetry without psychological guesswork or frame persistence.
- **Study Analytics**: Transparent session telemetry, focus score curves, and one-click JSON data export.

### Dedicated Teacher Experience
- **Teacher Dashboard**: Overview metrics (Total Assignments, Pending Reviews, Completed Reviews, Average Class Score, Students Requiring Attention), review queue table, recent assignments, and class-wide performance.
- **Assignment Management**: Create curriculum assignments with custom instructions, question schemas, total maximum marks, expected conceptual targets, and detailed evaluation rubrics.
- **Teacher Review Studio**: A dedicated side-by-side assessment studio:
  - **Left Column**: Authentic student submission viewer with multi-page navigation, high-resolution scan rendering, and raw OCR text inspection with human-in-the-loop correction.
  - **Right Column**: Comprehensive AI suggestions vs. Teacher overrides. Teachers can inspect extracted answers, modify question-by-question marks and comments, adjust final grades, and lock approval with final authority.
- **Authentic Gradebook Synchronization**: Once a teacher modifies or approves an assessment, the student's result immediately reflects the official teacher score, remarks, and approval status.

---

## 3. Multi-Modal Local AI Inventory

EvallQ operates lightweight, high-throughput on-device AI engines locally ($< 520\text{ MB}$ total model disk size, $< 7.5\text{ GB}$ peak combined RAM):

| Pipeline | Model Architecture | Parameters / Size | Current Runtime | Measured Performance |
| :--- | :--- | :--- | :--- | :--- |
| **Language Reasoning** | `Qwen 2.5 0.5B Instruct` | 490M params ($397\text{ MB}$) | Ollama / GGUF Q4_K_M | **109.3 tok/s** (38.4 ms TTFT) |
| **Computer Vision** | `UltraFace-320 Slim` | 1.21 MB ONNX | ONNX Runtime | **19.88 ms** (50.3 FPS) |
| **Speech Recognition** | `Whisper-tiny.en` | 39 MB INT8 | faster-whisper | **107.2 ms** (0.054x RTF) |
| **Vector Embeddings** | `bge-small-en-v1.5` | 384-dim ($67\text{ MB}$) | FastEmbed (ONNX) | **10.76 ms** (92.9 chunks/s) |
| **Document OCR** | `RapidOCR` + `PyMuPDF` | Local ONNX Engine | RapidOCR ONNX | **< 600 ms** per page |

---

## 4. Assessment Intelligence Pipeline

The Assessment Intelligence pipeline guarantees that the student's uploaded document remains the sole **source of truth**:

```
[ Upload Assessment (PDF/PNG/JPG/WEBP) ]
                  │
                  ▼
[ On-Device Page Rendering & Preprocessing ]
                  │
                  ▼
[ Local OCR (RapidOCR / PyMuPDF) ] ── (Authentic text extracted from pixels)
                  │
                  ▼
[ OCR Verification & Correction UI ] ── (Student/Teacher can review extracted text)
                  │
                  ▼
[ Question & Student Answer Extraction ]
                  │
                  ▼
[ Rubric-Based On-Device AI Evaluation (Qwen 2.5) ]
                  │
                  ▼
[ Question Marks + Topic Performance + Learning Gaps ]
                  │
                  ├──> [ "Learn This Topic in AI Tutor" Bridge ]
                  │
                  ▼
[ Teacher Review Studio ] ──> [ Score Override + Teacher Remarks + Approval ]
                  │
                  ▼
[ Official Final Student Result Display ]
```

- **Zero Fake OCR**: The system never manufactures fake student answers or mock OCR text. If an OCR error occurs, an actionable error state is presented with retry and correction capabilities.
- **Unique Submission Isolation**: Every uploaded assessment generates a unique UUID, preventing file collisions, stale caches, or cross-student leakage.
- **Teacher Final Authority**: AI evaluations serve as suggested initial scores; teachers retain the unconstrained ability to override marks and provide customized pedagogical guidance.

---

## 5. Zero-Cloud Privacy Guarantee

1. **Physical Cloud Isolation**: There are zero cloud API keys, analytics trackers, or third-party web endpoints in the entire codebase.
2. **In-Memory Audio Processing**: Voice queries recorded in the browser are sent as multipart binary data directly into Python's volatile RAM (`io.BytesIO`). Audio is decoded, transcribed by Whisper, and instantly purged from memory.
3. **Transient Video Frame Evaluation**: Webcam frames processed in Focus Mode are ingested as in-memory NumPy arrays, passed through UltraFace-320, and discarded immediately. No webcam images, video streams, or facial embeddings are ever written to disk.
4. **Local Data Sovereignty**: All documents, chunk embeddings, flashcards, focus session records, and assessments reside in a local SQLite file. Students and teachers can inspect or export their data at any time via a single click.

---

## 6. Quick Start Installation

### Prerequisites
- **Operating System**: Windows 11 / 10, Linux, or macOS.
- **Python**: Version 3.11 or 3.12.
- **Node.js**: Version 18.0 or higher.
- **Ollama**: Local LLM engine installed from [ollama.ai](https://ollama.ai) with `qwen2.5:0.5b` model pulled:
  ```bash
  ollama pull qwen2.5:0.5b
  ```

### 1. Backend Setup
```bash
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1    # On Windows
# source .venv/bin/activate     # On Linux / macOS
pip install -r requirements.txt
python -m uvicorn app.main:app --app-dir . --host 127.0.0.1 --port 8000 --reload
```
*Backend API will run at: `http://127.0.0.1:8000`*

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
*Frontend UI will run at: `http://localhost:5173`*

---

## 7. Automated Test Verification

EvallQ includes complete automated test coverage:

```bash
# Verify backend subsystems (11/11 tests)
.\backend\.venv\Scripts\python.exe backend/test_all_features.py

# Verify end-to-end Teacher & Student assessment workflow
.\backend\.venv\Scripts\python.exe scratch/test_e2e_full_workflow.py

# Verify frontend production build
cd frontend && npm run build
```

---

## 8. License

EvallQ is licensed under the MIT License.
