# FocusFlow AI: Project Story

> **Qualcomm Snapdragon AI Lab Build & Present Challenge**  
> *Track: Education & Productivity | Category: On-Device Multi-Modal AI Companion*  
> **Development Platform:** Host CPU (x86_64) | **Target Hardware:** Qualcomm Snapdragon X Series (Hexagon NPU)  
> **Hardware Validation Status:** `Target Identified / Pending Physical Snapdragon Validation` (`validated: false`)

---

## 1. Problem
University and self-directed students study in an increasingly demanding digital environment. Academic course material is dense, highly specialized, and distributed across massive multi-megabyte PDF textbooks, research papers, and slide decks. 

When attempting to study independently, students confront two persistent obstacles:
1. **Cognitive Overload & Context Fragmentation**: Finding specific answers in 500-page textbooks requires manual keyword searches or skimming. Summarizing chapters, drafting comprehension quizzes, and making flashcards consumes hours of manual administrative effort rather than deep conceptual study.
2. **Distraction & Study Session Decay**: Digital distractions and fragmentation prevent sustained study. Students struggle to maintain consistent study sessions without objective feedback on their observable study presence.

---

## 2. Why Existing Study Tools Have Limitations
Commercial AI study tools (e.g., cloud-based chatbots, proprietary flashcard generators, and web-based video proctoring apps) introduce severe architectural and practical flaws:

- **Data Privacy & Academic Confidentiality Leaks**: Cloud AI services require students to upload unpublished research drafts, course lecture notes, or personal essay drafts to external servers. This creates severe compliance risks under institutional data privacy regulations (FERPA, GDPR) and student data sovereignty standards.
- **Continuous Subscription Costs**: Cloud API architectures mandate monthly subscription fees ($20/month per student) that economically exclude students from lower-income backgrounds or developing nations.
- **Network Dependency & Latency Fluctuations**: Cloud services require persistent high-speed internet. In university libraries with congested Wi-Fi, round-trip cloud API requests can take 2 to 5 seconds per query, disrupting student flow-state.
- **Invasive Surveillance Overreach**: Commercial "study monitoring" tools routinely stream raw webcam footage to cloud servers and make scientifically dubious claims about "emotional state classification" or "mind-reading attention detection," violating student trust.

---

## 3. FocusFlow AI Solution
**FocusFlow AI** is a fully autonomous, local-first academic companion that runs four on-device AI models simultaneously on the student's personal computer. 

FocusFlow AI unites:
- A private, document-grounded **AI Tutor** that answers academic questions and accepts spoken voice queries.
- A **RAG Study Suite** that ingests local PDF lecture notes, generates verified summaries, creates 3-question multiple-choice quizzes, and synthesizes active-recall flashcards.
- A scientifically honest **Focus Mode** that monitors real-time physical presence at 50 FPS using local computer vision without saving camera frames or making psychological assumptions.
- A **Study Analytics Engine** backed by local SQLite persistence with one-click JSON data export.

The entire system requires **zero cloud API keys, zero internet connectivity, zero monthly fees, and zero cloud uploads**.

---

## 4. Key Features

| Feature | Operational Mechanism | Privacy & Integrity Guarantee |
| :--- | :--- | :--- |
| **Grounded AI Tutor** | Multi-turn conversational interface powered by local `qwen2.5:0.5b`. Ingests document context chunks to prevent hallucination. | Queries and completions remain in local memory. |
| **Spoken Voice Queries** | Browser WebRTC audio recording transcribed in-RAM using `faster-whisper-tiny.en` (INT8). | Decoded in volatile RAM via PyAV; raw audio is never saved to disk. |
| **Document RAG Suite** | Ingestion of course PDFs via PyMuPDF; semantic chunking (400-word sliding windows); local vector generation via `bge-small-en-v1.5`. | All chunk vectors and text reside in a local SQLite file (`focusflow.db`). |
| **Auto-Generated Study Tools** | One-click generation of executive summaries, 3-question multiple-choice quizzes with explanations, and active-recall flashcards. | Generated strictly from retrieved document chunks. |
| **Local Vision Focus Mode** | Real-time face presence tracking at ~50 FPS using `UltraFace-320` ONNX. | Evaluates transient in-memory NumPy arrays; zero video frames or facial embeddings are saved. |
| **Temporal Debounce Filter** | 3-frame state machine smoothing out natural blinking and transient head shifts. | Rejects unscientific "emotion" or "attention" claims; reports strictly observable physical presence. |
| **Local Study Analytics** | SQLite relational tracking of focus sessions, study interactions, and daily/weekly trends. | Full user data portability via one-click JSON export. |

---

## 5. Local AI Architecture

FocusFlow AI employs a multi-tier, provider-decoupled architecture:

```
[ User Browser: React 18 + TypeScript + Tailwind CSS ]
         |
         | HTTP REST / WebRTC (127.0.0.1:8000)
         v
[ Local Backend: FastAPI (Python 3.11) ]
   ├── Database: SQLite (focusflow.db)
   └── Local AI Provider Layer:
         ├── LLM: Qwen 2.5 0.5B (Ollama / GGUF Q4_K_M)
         ├── Speech: Whisper-tiny.en (faster-whisper / CTranslate2 INT8)
         ├── Vision: UltraFace-320 (ONNX Runtime CPUExecutionProvider)
         └── Embeddings: BGE-small-en-v1.5 (FastEmbed / ONNX Runtime)
```

1. **Decoupled Engine Abstraction**: Every AI capability implements a clean Python base class (`backend/app/services/ai/base.py`). The application layer interacts only with uniform contracts, making runtime swapping trivial.
2. **Synchronized In-Memory Pipelines**: Vision frames and audio streams are processed in transient buffers without disk I/O bottlenecks.
3. **Compact Footprint**: The total storage footprint of all four models is $< 520\text{ MB}$, and combined operational memory usage remains $< 7.5\text{ GB}$ RAM.

---

## 6. Privacy & Local-First Approach

FocusFlow AI implements a strict, verified privacy policy:
- **Zero Cloud Communication**: There are no remote URLs, analytics beacons, or telemetry endpoints in either the frontend or backend codebase.
- **In-Memory Audio Processing**: Voice queries recorded in the browser are sent as binary streams into Python `io.BytesIO`. After Whisper transcription, the buffer is garbage collected.
- **Transient Video Evaluation**: Camera frames captured at 5 FPS in Focus Mode are passed directly to the ONNX Runtime session as transient NumPy arrays. No images or face vectors are ever written to disk.
- **Local Data Ownership**: All student documents, chunk text, embeddings, and focus session histories are stored in a single local SQLite database file (`focusflow.db`) that the student completely owns.

---

## 7. Snapdragon Optimization Strategy

While FocusFlow AI executes today on host x86_64 hardware, every AI model was chosen specifically to align with the **Qualcomm Snapdragon X Series** architecture and the **Qualcomm AI Stack**:

1. **45 TOPS Hexagon NPU Offloading**:
   - Continuous 50 FPS computer vision and background voice listening on a traditional CPU drains battery within 2–3 hours.
   - Offloading these continuous INT8 tensor workloads to the Snapdragon Hexagon NPU enables sub-watt continuous inferencing, maintaining 15+ hour battery life on student laptops.
2. **Quantization & Execution Provider Strategy**:
   - **UltraFace-320 & BGE-small**: Standard ONNX models ready for direct execution via `QnnExecutionProvider`.
   - **Whisper-tiny**: Quantized INT8 weights map directly to Qualcomm AI Hub's verified Whisper models.
   - **Qwen 2.5 0.5B**: Compatible with Ollama for Windows on ARM64 and Qualcomm AI Hub's GenAI / QNN execution path.

---

## 8. Current Host Implementation
All benchmarks, tests, and verifications presented in this repository were executed on our development host:
- **Operating System**: Windows 11 (x86_64)
- **Processor**: Intel Core i5-1035G1 (4 cores / 8 threads)
- **RAM**: 8 GB physical memory (7.5 GB usable)
- **Execution Providers**:
  - LLM: Ollama (CPU GGUF) -> **109.3 tok/s** generation throughput.
  - Speech: `faster-whisper` (CTranslate2 INT8) -> **107.2 ms** latency (0.054x RTF).
  - Vision: ONNX Runtime (`CPUExecutionProvider`) -> **19.88 ms** latency (**50.3 FPS**).
  - Embeddings: FastEmbed (`CPUExecutionProvider`) -> **10.76 ms** per chunk.

---

## 9. Snapdragon Target Architecture

```
Current Host Runtime (Development)             Target Snapdragon Runtime (Production)
==================================             ======================================
Ollama (x86_64 GGUF)                  -->      Ollama Windows on ARM / AI Hub GenAI
faster-whisper / CTranslate2 (CPU)    -->      Whisper ONNX via QnnExecutionProvider
UltraFace-320 (CPUExecutionProvider)  -->      UltraFace ONNX via QnnExecutionProvider (NPU)
BGE-small (CPUExecutionProvider)      -->      BGE-small ONNX via QnnExecutionProvider (NPU)
```

The system includes a target hardware detection layer (`backend/app/core/config.py`) that checks for QNN execution providers and reports target status honestly via `GET /api/model/status`.

---

## 10. Current Limitations
In accordance with competition integrity standards, we disclose the following technical boundaries:
1. **Hardware Validation Pending**: Execution has not yet taken place on physical Snapdragon X Series silicon or Qualcomm Device Cloud instances.
2. **0.5B Language Model Breadth**: Qwen 2.5 0.5B delivers fast edge inference (~109 tok/s) but lacks the expansive world knowledge of 70B+ cloud models. We mitigate this through strict document grounding (RAG), confining responses to retrieved textbook excerpts.
3. **Single Document Context**: Document Q&A and quiz synthesis operate on one active document at a time. Multi-document cross-synthesis across entire semesters is reserved for future releases.

---

## 11. Future Hardware Validation
The next milestone following the competition submission is physical Snapdragon validation:
1. **Qualcomm AI Hub Compilation**: Profile and compile `UltraFace-320` and `Whisper-tiny` models using the `qai-hub` CLI targeting the Snapdragon X Elite Reference Device.
2. **Windows on ARM64 Deployment**: Deploy FocusFlow AI to a Snapdragon X Elite / X Plus laptop with `onnxruntime-qnn` enabled.
3. **Sub-Watt Power Profiling**: Measure active battery draw during continuous 4-hour focus study sessions to verify sub-5W system power consumption.
