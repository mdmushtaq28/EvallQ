# FocusFlow AI: Performance Benchmarks

## 1. Methodology & Environmental Context
All metrics in this document follow the **Critical Accuracy Rule**:
- **Host Measurements**: Derived from empirical benchmarks executed on the physical development host (`Intel Core i5-1035G1 @ 1.00GHz / 1.19GHz, 8 Threads, 7.5 GB RAM envelope, Windows 11 x86_64`) via [`backend/benchmark.py`](file:///d:/FocusFlow%20AI/backend/benchmark.py).
- **Snapdragon Measurements**: Labeled strictly as **Target / Pending Validation**. Values are not fabricated or guessed; actual benchmarks require physical Snapdragon X Elite/Plus hardware or Qualcomm AI Hub workbench execution.

---

## 2. Comprehensive Model Benchmark Table

| Component | Model | Runtime | Device | Latency | Memory | Compute Unit | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Vision** | `UltraFace-320` (`version-RFB-320.onnx`) | ONNX Runtime (`CPUExecutionProvider`) | Host CPU (x86_64) | **19.88 ms** (p50: 16.72ms, p95: 35.32ms) | ~15 MB | Host CPU | **VALIDATED (Host)** |
| **Vision** *(Target)* | `UltraFace-320` / `MediaPipe-Face-Detection` | ONNX Runtime (`QnnExecutionProvider`) | Snapdragon X Elite (Target) | *Pending Validation* | *Pending Validation* | Qualcomm Hexagon NPU | **TARGET IDENTIFIED** |
| **Speech** | `Whisper-tiny.en (INT8)` | `faster-whisper` / CTranslate2 | Host CPU (x86_64) | **107.2 ms** (p50: 95.0ms, RTF: 0.054x) | ~39 MB | Host CPU | **VALIDATED (Host)** |
| **Speech** *(Target)* | `Whisper-Base` / `Whisper-Small-Quantized` | ONNX Runtime (`QnnExecutionProvider`) / Voice AI SDK | Snapdragon X Elite (Target) | *Pending Validation* | *Pending Validation* | Qualcomm Hexagon NPU | **TARGET IDENTIFIED** |
| **Embedding** | `BAAI/bge-small-en-v1.5 (384-d)` | FastEmbed / ONNX Runtime (`CPUExecutionProvider`) | Host CPU (x86_64) | **10.76 ms / chunk** (92.9 chunks/s) | ~67 MB | Host CPU | **VALIDATED (Host)** |
| **Embedding** *(Target)* | `bge-small-en-v1.5` / `Nomic-Embed-Text` | ONNX Runtime (`QnnExecutionProvider`) | Snapdragon X Elite (Target) | *Pending Validation* | *Pending Validation* | Qualcomm Hexagon NPU | **TARGET IDENTIFIED** |
| **LLM** | `qwen2.5:0.5b` (Q4_K_M GGUF) | Ollama daemon | Host CPU (x86_64) | **109.3 tok/s** (generation), 15.1s total | ~397 MB | Host CPU | **VALIDATED (Host)** |
| **LLM** *(Target)* | `qwen2.5:0.5b` / `Llama-3.2-1B` | Ollama (ARM64) / Qualcomm AI Hub GenieX | Snapdragon X Elite (Target) | *Pending Validation* | *Pending Validation* | Qualcomm Hexagon NPU / Adreno GPU / Oryon CPU | **TARGET IDENTIFIED** |

---

## 3. Host Benchmark Telemetry Deep Dive

### 3.1 Vision Subsystem (UltraFace-320 ONNX)
- **Initialization Latency**: 0.00 ms (InferenceSession cached in memory)
- **Mean Single-Frame Latency**: 19.88 ms
- **Median Latency (p50)**: 16.72 ms
- **95th Percentile Latency (p95)**: 35.32 ms
- **Effective Throughput**: 50.3 FPS (exceeds the 5 FPS browser sampling rate by 10x)
- **Host CPU Consumption**: Negligible (<5% CPU during active focus session)

### 3.2 Speech Subsystem (Whisper-tiny.en INT8)
- **Initialization Latency**: 0.07 ms (CTranslate2 model cached)
- **Mean Transcription Latency**: 107.2 ms for 2.0s audio segment
- **Median Latency (p50)**: 95.0 ms
- **Real-Time Factor (RTF)**: **0.054x** (transcription completes in ~5% of real-time speech length)
- **Audio Processing**: 100% in-memory buffer decoding via PyAV; zero disk I/O.

### 3.3 Semantic Embedding Subsystem (BGE-Small-en-v1.5)
- **Initialization Latency**: 1,944.81 ms (ONNX model weights load on first use)
- **Batch Latency (5 chunks)**: 53.81 ms
- **Per-Chunk Latency**: 10.76 ms
- **Embedding Throughput**: 92.9 chunks / second
- **Vector Dimension**: 384 FP32 dimensions

### 3.4 Conversational LLM Subsystem (Qwen2.5-0.5B Instruct)
- **Health-Check Latency**: 663.69 ms
- **Generation Speed**: 109.3 tokens / second on Host CPU
- **Memory Footprint**: ~397 MB Resident Set Size
- **Safety Limits**: Max 512 generation tokens per query turn

---

## 4. Snapdragon Target Expectations & Hardware Projections
On **Snapdragon X Elite (X1E-80-100)**:
- **45 TOPS Hexagon NPU**: Intended for Vision and Embedding offloading via ONNX Runtime `QnnExecutionProvider`. Anticipated vision latency $< 5\text{ ms}$, freeing the 12-core Oryon CPU for background compilation and multitasking.
- **Oryon CPU Acceleration**: Whisper INT8 runs natively on ARM64 NEON with estimated RTF $< 0.02x$ ($< 40\text{ ms}$ transcription).
- **Ollama ARM64 Support**: Officially supported by Qualcomm and Ollama for Snapdragon X Series PCs, eliminating emulation overhead.
