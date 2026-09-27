# FocusFlow AI: Private On-Device Academic Study Companion

> **Qualcomm Snapdragon AI Lab Build & Present Challenge**  
> *Category: Productivity & Education / On-Device AI Innovation*  
> **Development Platform:** Host CPU (x86_64) | **Target Hardware:** Qualcomm Snapdragon X Series (Hexagon NPU)  
> **Validation Status:** `Target / Pending Hardware Validation` (`validated: false`)

---

## 1. Executive Summary

**FocusFlow AI** is a fully autonomous, zero-cloud academic study companion designed for students, researchers, and self-directed learners. Built from the ground up for edge execution, FocusFlow AI combines four distinct local AI engines—large language model reasoning, real-time computer vision, low-latency speech recognition, and vector embedding similarity search—into a unified, private study suite.

FocusFlow AI operates with **zero external cloud API calls, zero telemetry egress, zero monthly subscriptions, and zero latency fluctuations**. It is architected directly for the upcoming generation of AI-first laptops powered by the **Qualcomm Snapdragon X Series** platform, leveraging on-device INT8 quantization, standard ONNX execution graphs, and the Qualcomm AI Stack.

---

## 2. The Problem: Why Cloud AI Fails Education

Modern students and academic institutions face severe challenges with cloud-based AI tools:

1. **Privacy & Data Security Vulnerabilities**: Uploading unpublished academic research, student essays, medical notes, or personal study habits to cloud APIs risks data leakage, IP compromise, and institutional compliance violations (FERPA, GDPR).
2. **Subscription Costs & Inequity**: Monthly cloud API subscriptions create an economic barrier for students in developing regions or low-income households.
3. **Latency & Distraction**: Round-trip cloud network latencies (1–3 seconds per query) disrupt student concentration and flow-state.
4. **Surveillance Overreach**: Existing attention-tracking tools frequently make unscientific claims regarding "emotion recognition" or psychological mind-reading while streaming intimate webcam footage to remote servers.

---

## 3. The Solution: Local-First Multi-Modal AI

FocusFlow AI replaces the cloud with an integrated on-device edge pipeline:

```
+-----------------------------------------------------------------------------------+
|                              FOCUSFLOW AI APPLICATION                              |
+-----------------------------------------------------------------------------------+
|  [ React 18 + TypeScript + Tailwind CSS Frontend ] (SPA on http://localhost:5173) |
|         |                                                      |                  |
|         v (REST API / WebSocket)                              v (WebRTC)         |
|  [ FastAPI Backend ] (Python 3.11 on http://127.0.0.1:8000)   [ Browser Camera/Mic]|
+-----------------------------------------------------------------------------------+
|                               LOCAL AI ENGINE MATRIX                              |
|                                                                                   |
|  +--------------------+  +--------------------+  +--------------------+  +--------+
|  |  Local LLM (0.5B)  |  |  Local Vision      |  |  Local Speech      |  | Local  |
|  |  Qwen 2.5 0.5B     |  |  UltraFace-320     |  |  Whisper-tiny.en   |  | Embed  |
|  |  Ollama / GGUF     |  |  ONNX Runtime CPU  |  |  faster-whisper    |  | BGE-Sm |
|  |  (109.3 tok/s)     |  |  (19.88ms / 50 FPS)|  |  (107.2ms in-RAM)  |  | (10.7ms|
|  +--------------------+  +--------------------+  +--------------------+  +--------+
+-----------------------------------------------------------------------------------+
|                           LOCAL PERSISTENCE & STORAGE                             |
|  SQLite 3 Database (focusflow.db) | Local PDF Storage | Zero Cloud Dependencies   |
+-----------------------------------------------------------------------------------+
```

- **Voice-Enabled AI Tutor**: Document-grounded natural dialogue with audio transcribed strictly in volatile memory.
- **RAG Study Suite**: Instant PDF parsing, semantic chunking, grounded Q&A, executive summaries, 3-question quizzes, and active-recall flashcards.
- **Scientifically Honest Focus Mode**: Real-time presence detection measuring observable visual telemetry without psychological guesswork or frame persistence.
- **Local Study Analytics**: Transparent session telemetry, focus score curves, and one-click JSON data export.

---

## 4. Multi-Modal Local AI Inventory

FocusFlow AI operates four distinct local AI engines simultaneously within a lightweight footprint ($< 520\text{ MB}$ total model disk size, $< 7.5\text{ GB}$ peak combined RAM):

| Pipeline | Model Architecture | Parameters / Size | Current Runtime | Snapdragon Target Runtime |
| :--- | :--- | :--- | :--- | :--- |
| **Language Reasoning** | `Qwen 2.5 0.5B Instruct` | 490M params ($397\text{ MB}$) | Ollama / GGUF Q4_K_M | Qualcomm AI Hub Qwen 2.5 ONNX (Hexagon NPU) |
| **Computer Vision** | `UltraFace-320 Slim` | 1.21 MB ONNX | ONNX Runtime (CPU EP) | ONNX Runtime QNN EP (Hexagon NPU) |
| **Speech Recognition** | `Whisper-tiny.en` | 39 MB INT8 | faster-whisper (CTranslate2) | Whisper-tiny ONNX via QNN EP (Hexagon NPU) |
| **Vector Embeddings** | `bge-small-en-v1.5` | 384-dim ($67\text{ MB}$) | FastEmbed (ONNX Runtime) | FastEmbed ONNX via QNN EP (Hexagon NPU) |

For complete parameter specifications, layer topologies, and input/output contracts, see [`docs/ai-model-inventory.md`](file:///d:/FocusFlow%20AI/docs/ai-model-inventory.md).

---

## 5. Zero-Cloud Academic Privacy Guarantee

FocusFlow AI provides an uncompromised privacy envelope:

1. **Physical Cloud Isolation**: There are zero cloud API keys, analytics trackers, or third-party web endpoints in the entire codebase.
2. **In-Memory Audio Processing**: Voice queries recorded in the browser are sent as multipart binary data directly into Python's volatile RAM (`io.BytesIO`). Audio is decoded, transcribed by Whisper, and instantly purged from memory.
3. **Transient Video Frame Evaluation**: Webcam frames processed in Focus Mode are ingested as in-memory NumPy arrays, passed through UltraFace-320, and discarded immediately. No webcam images, video streams, or facial embeddings are ever written to disk.
4. **Local Data Sovereignty**: All documents, chunk embeddings, flashcards, and focus session records reside in a local SQLite file (`backend/focusflow.db`). Students can inspect or export their data at any time via a single click.

---

## 6. Snapdragon AI Strategy & Qualcomm AI Stack Alignment

FocusFlow AI is strategically engineered to exploit the architecture of the **Qualcomm Snapdragon X Series** compute platform:

### Why Snapdragon X Series?
- **45 TOPS Hexagon NPU**: Delivering high-performance INT8 tensor throughput while offloading compute-intensive AI operations from the CPU and GPU.
- **Sub-Watt Continuous Inference**: Continuous webcam focus tracking (50 FPS) and background voice listening on a traditional x86 CPU drains battery within 2–3 hours. Running these workloads on the Hexagon NPU enables all-day 15+ hour battery life on thin-and-light student laptops.
- **Thermal Efficiency**: Silent, fanless edge execution in quiet university libraries and study halls.

### Snapdragon Architectural Migration Path
The codebase implements a strict provider abstraction layer (`backend/app/services/ai/`) that separates host development from Snapdragon deployment:

```
Development Host (Implemented)                Snapdragon X Target (Architected)
==============================                =================================
ONNX Runtime (CPUExecutionProvider)    -->    ONNX Runtime (QNNExecutionProvider)
CTranslate2 / faster-whisper (CPU)     -->    Whisper-tiny ONNX (QNN EP)
Ollama Qwen 2.5 (Host CPU GGUF)        -->    Qualcomm AI Hub Qwen 2.5 (Hexagon NPU)
```

For the complete compilation workflows, `qai-hub` commands, and QNN Execution Provider flags, see [`docs/snapdragon-architecture.md`](file:///d:/FocusFlow%20AI/docs/snapdragon-architecture.md).

---

## 7. Hardware Execution & Validation Transparency

> [!IMPORTANT]
> **COMPETITION INTEGRITY DISCLOSURE**  
> FocusFlow AI strictly adheres to Qualcomm's scientific accuracy guidelines. **We do not claim current execution on a physical Snapdragon NPU.**

- **Current Verified Environment**: Host CPU / x86_64 development machine.
- **Snapdragon NPU Status**: `Target / Pending Hardware Validation` (`validated: false`).
- **Runtime Verification**: The live system exposes its authentic hardware state at runtime via `GET /api/model/status`:
  ```json
  {
    "current_environment": "Host CPU / x86_64",
    "snapdragon": {
      "status": "target",
      "target_platform": "Snapdragon X Series / Hexagon NPU",
      "validated": false,
      "qnn_available": false
    }
  }
  ```

To validate FocusFlow AI on physical Snapdragon hardware or a Qualcomm Device Cloud instance, follow the step-by-step procedures in [`docs/snapdragon-validation-plan.md`](file:///d:/FocusFlow%20AI/docs/snapdragon-validation-plan.md).

---

## 8. Empirical Benchmark Results

All host measurements were gathered using the automated benchmarking framework ([`backend/benchmark.py`](file:///d:/FocusFlow%20AI/backend/benchmark.py)) and recorded in [`backend/benchmark_results.json`](file:///d:/FocusFlow%20AI/backend/benchmark_results.json). Projected Snapdragon metrics represent expected performance using Qualcomm AI Hub NPU acceleration:

| AI Pipeline | Metric | Measured Host Result (CPU) | Projected Snapdragon X Elite (Hexagon NPU) |
| :--- | :--- | :--- | :--- |
| **Vision (UltraFace-320)** | Average Latency | **19.88 ms** | **$< 5.0\text{ ms}$** |
| | Frame Throughput | **50.3 FPS** | **$> 120\text{ FPS}$** (capped at 30 FPS for power) |
| **Speech (Whisper-tiny.en)** | Average Latency (2.0s audio) | **107.2 ms** | **$< 30.0\text{ ms}$** |
| | Real-Time Factor (RTF) | **0.054x** | **$< 0.015x$** |
| **Embeddings (BGE-small)** | Average Latency per Chunk | **10.76 ms** | **$< 2.5\text{ ms}$** |
| | Batch Throughput (10 chunks) | **92.9 chunks/sec** | **$> 400\text{ chunks/sec}$** |
| **LLM (Qwen 2.5 0.5B)** | Inference Throughput | **109.3 tokens/sec** | **$> 130\text{ tokens/sec}$** |
| | Time to First Token (TTFT) | **38.4 ms** | **$< 20.0\text{ ms}$** |

For the complete statistical breakdown (standard deviations, min/max distributions, cold vs. warm runs), see [`docs/benchmarks.md`](file:///d:/FocusFlow%20AI/docs/benchmarks.md).

---

## 9. Feature Tour

### A. Document-Grounded RAG Study Suite
- **PyMuPDF Document Parser**: Extracts clean layout-aware text from lecture slides, textbooks, and journal articles.
- **Semantic Sliding Chunker**: Splits text into 400-word passages with 50-word overlaps.
- **Local Vector Search**: Generates 384-dimensional dense vectors via `bge-small-en-v1.5` for sub-15ms semantic matching.
- **Automated Synthesis**: Generates grounded executive summaries, 3-question multiple-choice comprehension quizzes with detailed rationales, and active-recall flashcards.

### B. Voice-Enabled AI Tutor
- **Low-Latency Speech Recognition**: In-RAM INT8 Whisper transcription transcribing spoken queries in ~100ms.
- **Document Context Injection**: Grounded responses cross-referenced against the active document chunks.
- **Conversational Memory**: Maintains multi-turn context for deep academic explanations.

### C. Local Vision Focus Mode
- **Real-Time Presence Tracking**: 1.21 MB UltraFace ONNX model detecting student presence at ~50 FPS.
- **Scientific Honesty**: Detects observable physical signals only (`"Present"`, `"Screen-facing"`, `"Not detected"`). Explicitly rejects pseudoscientific "emotion" or "attention" mind-reading.
- **Temporal Debounce Filter**: 3-frame state machine eliminating false negatives caused by natural blinking or temporary head movements.
- **Ephemeral Frame Buffer**: Video frames reside solely in transient RAM arrays and are deleted immediately after inference.

### D. Local Study Analytics & Portability
- **Relational Session Tracking**: Logs focus intervals, interaction counts, and study duration in SQLite.
- **Focus Quality Scoring**: Transparent heuristic formula based strictly on verified active study duration.
- **One-Click Export**: Full JSON export endpoint allowing students to own, back up, and transfer their study records.

---

## 10. System Prerequisites & Installation

### Prerequisites
- **Operating System**: Windows 11 / 10 (x86_64 or ARM64) or Linux / macOS.
- **Python**: Version 3.11 or higher.
- **Node.js**: Version 18.0 or higher.
- **Ollama**: Local LLM engine installed from [ollama.ai](https://ollama.ai).
- **Webcam & Microphone**: Standard integrated or USB devices.

### Quick Start Installation

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/your-username/focusflow-ai.git
   cd focusflow-ai
   ```

2. **Backend Setup**:
   ```bash
   # Navigate to backend and create virtual environment
   cd backend
   python -m venv .venv

   # Activate virtual environment (Windows PowerShell)
   .\.venv\Scripts\Activate.ps1
   # (Linux / macOS: source .venv/bin/activate)

   # Install dependencies
   pip install -r requirements.txt
   ```

3. **Install and Pull the Local LLM**:
   ```bash
   # Start Ollama service (if not already running)
   ollama serve

   # In a separate terminal, pull Qwen 2.5 0.5B
   ollama pull qwen2.5:0.5b
   ```

4. **Frontend Setup**:
   ```bash
   # In a separate terminal, navigate to frontend
   cd frontend
   npm install
   npm run build
   ```

---

## 11. Quickstart & Deployment Options

FocusFlow AI can be run either via **One-Command Local Docker Deployment** (recommended for evaluation) or manually in local development environments.

### Option A: One-Command Local Docker Deployment (Recommended)
FocusFlow AI is fully containerized as an edge appliance (Nginx Frontend + FastAPI Backend + Ollama Engine):

```bash
# Windows Launcher:
start_focusflow.bat

# Or via Docker Compose:
docker compose up -d --build
```
- **Web UI**: `http://localhost` (Same-origin Nginx reverse proxy; webcam & mic work natively in browser secure context).
- **Backend Health**: `http://localhost/api/health`
- **Model Telemetry**: `http://localhost/api/model/status`
- **To Stop**: `stop_focusflow.bat` or `docker compose down`.
- For complete container architecture and volume details, see [`docs/docker-deployment.md`](docs/docker-deployment.md).

---

### Option B: Manual Host Setup & Live Demo Running
To launch the live application directly on the host machine:

### Step 1: Start Backend Server
In your backend terminal (with `.venv` active):
```bash
uvicorn app.main:app --host 127.0.0.1 --port 8000
```
*Backend API will be accessible at: `http://127.0.0.1:8000/docs`*

### Step 2: Start Frontend Application
In your frontend terminal:
```bash
npm run dev
```
*Frontend UI will be accessible at: `http://localhost:5173`*

### Step 3: Run Automated Verification Suite
To verify all 7 end-to-end features before presenting:
```bash
# In PowerShell:
$env:PYTHONPATH="d:\FocusFlow AI\backend"; python scratch/test_all_features.py
```
*Expected output: 7 of 7 features report `[PASS]`.*

---

## 12. 3–5 Minute Competition Demo Flow

Follow our step-by-step presentation script in [`docs/demo-script.md`](file:///d:/FocusFlow%20AI/docs/demo-script.md):

1. **0:00 - 0:45 | Dashboard & Architecture**: Open `http://localhost:5173`. Show the 4 active AI engine badges. Explain the zero-cloud privacy envelope and Snapdragon target architecture card.
2. **0:45 - 1:45 | Grounded RAG Study Suite**: Open Study Materials. Demonstrate semantic document search, 3-question quiz generation with instant rationales, and flashcard flip.
3. **1:45 - 2:45 | Voice-Enabled AI Tutor**: Open Tutor. Click the microphone, speak a voice question, and show in-RAM Whisper transcription and instant Qwen streaming response.
4. **2:45 - 3:45 | Local Vision Focus Mode**: Open Focus Mode. Start session, display 50 FPS bounding box and presence telemetry. Turn head away to demonstrate the 3-frame temporal debounce state machine.
5. **3:45 - 4:45 | Local Analytics & Snapdragon Roadmap**: Show the study analytics dashboard, click "Export Data (JSON)", and review the Snapdragon NPU migration roadmap.

---

## 13. Project Repository Structure

```
FocusFlow AI/
├── README.md                              # Main competition overview & documentation
├── backend/                               # FastAPI backend application
│   ├── app/
│   │   ├── api/routes/                    # REST endpoints (tutor, docs, focus, speech, model)
│   │   ├── core/                          # Configuration, database initialization
│   │   ├── models/                        # Pydantic schemas and SQLAlchemy models
│   │   └── services/
│   │       ├── ai/                        # Local AI wrappers (LLM, Vision, Speech)
│   │       ├── analytics/                 # Aggregation & reporting services
│   │       ├── documents/                 # PDF parser, semantic chunker, BGE embeddings
│   │       └── focus/                     # Focus session manager & temporal debouncing
│   ├── benchmark.py                       # Automated empirical benchmarking suite
│   ├── benchmark_results.json             # Empirical host measurement logs
│   ├── focusflow.db                       # Local SQLite relational database
│   └── requirements.txt                   # Backend dependencies
├── frontend/                              # React 18 + TypeScript + Vite frontend
│   ├── src/
│   │   ├── components/                    # UI elements, navigation, media widgets
│   │   ├── pages/                         # Dashboard, Tutor, Materials, Focus, Analytics, Settings
│   │   ├── services/                      # Axios API clients
│   │   └── types/                         # TypeScript interfaces
│   ├── package.json                       # Frontend dependencies
│   └── vite.config.ts                     # Vite build configuration
└── docs/                                  # Competition documentation suite
    ├── FINAL_SUBMISSION_CHECKLIST.md      # Master submission checklist & audit
    ├── ai-model-inventory.md              # Detailed parameter and layer specifications
    ├── benchmarks.md                      # Host CPU benchmarks and Snapdragon targets
    ├── competition-demo-checklist.md      # Pre-flight demo checklist and contingencies
    ├── competition-description.md         # Multi-length descriptions and summaries
    ├── competition-evidence.md            # Rubric evidence mapping guide
    ├── competition-final-checklist.md     # Final submission evaluation sign-off
    ├── demo-fallback-plan.md              # Live contingency & failure backup procedures
    ├── demo-script.md                     # Step-by-step 3-5 minute live demo script
    ├── demo-video-plan.md                 # Video recording sequence & screen layout plan
    ├── final-architecture.md              # Complete system architecture and data flows
    ├── final-demo-script.md               # Finalized 3-5 minute presentation script
    ├── final-evidence-checklist.md        # Evidence capture matrix and visible indicators
    ├── focus-mode.md                      # Computer vision & temporal debouncing deep dive
    ├── judge-questions-and-answers.md     # 20 technical judge defense Q&As
    ├── local-ai-tutor.md                  # LLM prompting & conversational architecture
    ├── local-rag-study-suite.md           # PDF extraction & vector search design
    ├── presentation-speaking-notes.md     # Spoken notes, technical points, and judge defenses
    ├── project-story.md                   # Complete 11-part project story
    ├── screenshot-checklist.md            # Submission screenshot capture guide
    ├── snapdragon-architecture.md         # Qualcomm AI Stack & QNN EP integration guide
    ├── snapdragon-validation-plan.md      # Step-by-step physical validation guide
    └── speech-and-analytics.md            # Whisper audio pipeline & SQLite analytics
```

---

## 14. Ethical Scope & Known Boundaries

FocusFlow AI is designed with strict boundaries regarding what edge AI should and should not attempt:

- **Observable Telemetry Only**: We reject all claims of "emotional state detection", "fatigue measurement", or "distraction mind-reading". FocusFlow AI measures strictly observable physical presence: whether a student is present in the camera frame and whether their face is directed toward the screen.
- **No Biometric Identification**: The vision pipeline contains no facial identification, face embedding vectors, or identity tracking. Any face in front of the camera registers solely as generic user presence.
- **Model Size Constraints**: Operating a 0.5B parameter language model on edge CPU yields exceptional speed (~109 tok/s) but has narrower reasoning depth than 70B+ cloud models. FocusFlow AI compensates for this through strict document grounding (RAG), which confines the LLM's responses to retrieved textbook excerpts.

---

## 15. Future Roadmap: Physical Snapdragon Validation

1. **Phase 1: Qualcomm AI Hub Compilation**: Profile and compile the `UltraFace-320` and `Whisper-tiny` ONNX models using the `qai-hub` CLI targeting the Snapdragon X Elite CRD.
2. **Phase 2: ONNX Runtime QNN Execution Provider**: Deploy `onnxruntime-qnn` on Windows on ARM64 and route inference tensors directly through the Hexagon NPU.
3. **Phase 3: Battery & Thermal Profiling**: Execute a continuous 4-hour study session on a Snapdragon X Series laptop to verify sub-5W total power consumption and all-day battery endurance.

---

## 16. Submission Metadata

- **Project Name**: FocusFlow AI
- **Challenge**: Qualcomm Snapdragon AI Lab Build & Present Challenge
- **Architecture**: Local-First Multi-Modal Edge Architecture
- **Target Hardware**: Qualcomm Snapdragon X Series (Hexagon NPU)
- **Host Execution Platform**: x86_64 / Windows 11
- **License**: MIT License
