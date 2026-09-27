# FocusFlow AI: Snapdragon Architecture & Migration Guide

## 1. Why Snapdragon
**FocusFlow AI** is designed specifically around the hardware value proposition of **Qualcomm Snapdragon X Series (X Elite & X Plus) Copilot+ PCs**:
1. **45 TOPS Hexagon NPU**: Dedicated neural processing for continuous background workloads (observable presence monitoring at 5 FPS and real-time voice-to-text) with near-zero impact on system battery life or CPU thermal throttling.
2. **True Academic Privacy**: Complete on-device processing guarantees that student coursework, questions, webcam presence frames, and audio inputs remain physically quarantined inside local device RAM.
3. **All-Day Battery Life for Students**: Offloading AI execution from power-hungry x86 CPUs or discrete GPUs to the ultra-efficient Hexagon NPU enables students to run FocusFlow AI through entire study sessions and lectures without hunting for power outlets.
4. **Unified Memory Architecture**: Snapdragon X Series unified LPDDR5x memory allows large models (Ollama LLM, embeddings, Whisper) to sit in shared RAM without costly PCIe transfers.

---

## 2. Current Architecture vs. Snapdragon Target Architecture

### A. Current Development Architecture (IMPLEMENTED)
```
[React + Vite Frontend]
       │
       ▼ (HTTP localhost:8000)
[FastAPI Backend Core]
       │
       ├─► LLM (AI Tutor): Ollama daemon (qwen2.5:0.5b GGUF) on Host CPU (x86_64)
       ├─► Embeddings (RAG): FastEmbed BGE-small-en-v1.5 (ONNX) on Host CPU
       ├─► Speech (ASR): faster-whisper tiny.en (INT8 CTranslate2) on Host CPU
       ├─► Vision (Focus Mode): UltraFace-320 (ONNX Runtime CPUExecutionProvider)
       └─► Persistence: SQLite (focusflow.db)
```

### B. Snapdragon Target Architecture (TARGET)
```
[React + Vite Frontend] (Windows on ARM64 Native)
       │
       ▼ (HTTP localhost:8000)
[FastAPI Backend Core] (Python ARM64 Native)
       │
       ├─► LLM: Ollama for Windows on ARM64 / Qualcomm AI Hub GenieX NPU Runtime
       ├─► Embeddings: ONNX Runtime (QnnExecutionProvider) ──► Hexagon NPU
       ├─► Speech: ONNX Runtime (QnnExecutionProvider) / Voice AI SDK ──► Hexagon NPU
       ├─► Vision: UltraFace-320 (QnnExecutionProvider) ──► Hexagon NPU (45 TOPS)
       └─► Persistence: SQLite (Zero network overhead, zero cloud dependency)
```

---

## 3. Model Mapping Table

| Component | Current Development Model | Candidate Qualcomm AI Hub Model | Target Snapdragon Device | Target Runtime | Integration Effort |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Vision** | `UltraFace-320` (`version-RFB-320.onnx`, 1.21 MB) | `MediaPipe-Face-Detection` / `Lightweight-Face-Detection` | Snapdragon X Elite / X Plus | ONNX Runtime (`QnnExecutionProvider`) | **Low**: Pure ONNX format compiles directly via QNN SDK |
| **Speech** | `Systran/faster-whisper-tiny.en` (INT8, 39 MB) | `Whisper-Base` / `Whisper-Small-Quantized` | Snapdragon X Elite / X Plus | ONNX Runtime (`QnnExecutionProvider`) / Voice AI SDK | **Medium**: Switch from CTranslate2 to ONNX/QNN graph |
| **Embedding** | `BAAI/bge-small-en-v1.5` (384-d, 67 MB) | `Nomic-Embed-Text` | Snapdragon X Elite / X Plus | ONNX Runtime (`QnnExecutionProvider`) | **Low**: Standard BERT-style ONNX graph |
| **LLM** | `qwen2.5:0.5b` (Q4_K_M, 397 MB) | `Qwen2.5-0.5B` / `Llama-3.2-1B` | Snapdragon X Elite / X Plus | Ollama ARM64 / Qualcomm GenieX | **Zero to Low**: Ollama ARM64 runs natively on Snapdragon |

---

## 4. ONNX Runtime & QNN Execution Provider
The **Qualcomm AI Engine Direct (QNN) Execution Provider** connects ONNX Runtime directly to the Hexagon NPU hardware.

### Inspection on Current Host
Executing `onnxruntime.get_available_providers()` on the development machine returns:
```python
['AzureExecutionProvider', 'CPUExecutionProvider']
```
*Honest Technical Finding*: The QNN Execution Provider is not present on standard x86_64 Windows without Qualcomm hardware and the Qualcomm QNN SDK. **FocusFlow AI truthfully reports `qnn_available: false` and `validated: false` during development.**

### Activation on Snapdragon Hardware
On Snapdragon Copilot+ PCs, installing `onnxruntime-qnn` registers the `QNNExecutionProvider`, allowing FocusFlow's vision and embedding pipelines to pass `providers=['QNNExecutionProvider']` seamlessly.

---

## 5. Qualcomm AI Hub & Hosted Device Validation
The **Qualcomm AI Hub** (`aihub.qualcomm.com`) offers cloud-hosted Snapdragon reference devices (e.g., `Snapdragon X Elite CRD`).

When credentials become available, FocusFlow's automated test suite can submit:
1. `qai-hub compile` to generate QNN DLC / ONNX artifacts.
2. `qai-hub profile` to measure NPU cycle count, memory bandwidth, and p50/p95 latency on physical Snapdragon hardware.
3. Actual telemetry is recorded into `docs/benchmarks.md` with the Qualcomm job ID.

---

## 6. Benchmark Methodology & Privacy
- **Host Measurement**: Evaluated using [`backend/benchmark.py`](file:///d:/FocusFlow%20AI/backend/benchmark.py), executing real inference passes on Host CPU.
- **Privacy Guarantees**:
  - Webcam frames processed strictly in RAM; never written to disk or sent to the cloud.
  - Microphone audio converted in memory; zero audio storage.
  - All metrics derived from observable physical signals.

---

## 7. Status Segregation Matrix

### IMPLEMENTED
- FastAPI backend with Section 21 Model Safety envelope.
- Local Qwen 2.5 LLM via Ollama daemon.
- Local PyMuPDF PDF extraction and FastEmbed BGE-small embeddings.
- In-memory faster-whisper INT8 speech recognition (~107ms latency).
- In-memory UltraFace-320 ONNX presence tracking (~19.8ms latency).
- SQLite session persistence, analytics, and JSON export.
- Truthful hardware detection and target reporting in `/api/model/status`.

### TARGET
- `AI_TARGET=snapdragon` runtime configuration switch.
- ONNX Runtime `QnnExecutionProvider` bindings for Hexagon NPU.
- Ollama native Windows on ARM64 deployment.
- Qualcomm AI Hub Whisper-Base and Nomic-Embed model integration.

### VALIDATED
- **Host Platform**: All 4 models validated with real benchmark numbers on Host CPU / x86_64.
- **Snapdragon Platform**: **Not Yet Validated on Physical Hardware** (pending physical Snapdragon PC or AI Hub API access).
