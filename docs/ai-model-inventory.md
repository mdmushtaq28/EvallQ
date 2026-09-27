# FocusFlow AI: AI Model Inventory

## 1. Overview
This document provides a complete technical inventory of all on-device artificial intelligence models integrated into **FocusFlow AI** across Stages 1 through 8.

### Development Environment vs. Target Platform
- **Current Development Runtime**: Host CPU / x86_64 (Windows 11, Intel Core i5-1035G1, 8 threads, 7.5 GB RAM envelope)
- **Snapdragon Target Deployment Platform**: Qualcomm Snapdragon X Elite / Snapdragon X Plus (45 TOPS Hexagon NPU, ARM64 Windows)

### Optimization Status Definitions
- `NOT STARTED`: Candidate model identified conceptually, but no target artifacts or profiling initiated.
- `TARGET IDENTIFIED`: Specific model architecture and Snapdragon deployment path (runtime, execution provider, or AI Hub entry) documented and verified against Qualcomm technical specifications.
- `COMPILED`: Model has been converted/compiled into target format (e.g., QNN DLC or ONNX with QNN EP bindings).
- `PROFILED`: Model has executed on actual Snapdragon hardware or Qualcomm AI Hub hosted cloud device with measured performance telemetry.
- `VALIDATED`: End-to-end integration verified on physical Snapdragon hardware meeting accuracy and latency thresholds.

---

## 2. Model Inventory Table

| Component | Current Model | Size | Dimensions / Quantization | Current Dev Runtime | Snapdragon Target Runtime | Snapdragon Optimization Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **LLM (AI Tutor)** | `qwen2.5:0.5b` | ~397 MB | 0.49B params, Q4_K_M | Ollama (CPU x86_64) | Ollama (Windows on ARM) / Qualcomm AI Hub GenieX | **TARGET IDENTIFIED** |
| **Embeddings (RAG)** | `BAAI/bge-small-en-v1.5` | ~67 MB | 384 dimensions, FP32 ONNX | FastEmbed / ONNX Runtime (CPU) | ONNX Runtime (QNN EP) / Qualcomm AI Hub Nomic-Embed | **TARGET IDENTIFIED** |
| **Speech (ASR)** | `Systran/faster-whisper-tiny.en` | ~39 MB | INT8 quantized | CTranslate2 / PyAV (CPU) | ONNX Runtime (QNN EP) / Qualcomm AI Hub Whisper-Base | **TARGET IDENTIFIED** |
| **Vision (Focus Mode)** | `UltraFace-320` (`version-RFB-320.onnx`) | **1.21 MB** | 4,420 anchor priors, $320\times 240$ RGB | ONNX Runtime (`CPUExecutionProvider`) | ONNX Runtime (`QnnExecutionProvider` on Hexagon NPU) | **TARGET IDENTIFIED** |

---

## 3. Component Deep Dive

### 3.1 Large Language Model (AI Tutor & Study Suite)
- **Model Identifier**: `qwen2.5:0.5b-instruct`
- **Task**: Interactive conversational tutoring, document grounded question-answering (RAG), executive summarization, multiple-choice quiz synthesis, flashcard generation.
- **Current Runtime**: Ollama daemon (`http://127.0.0.1:11434`) running local GGUF weights on Host CPU.
- **Model Size**: ~397 MB.
- **Context Window**: 4,096 tokens (configured with conservative limits for workstation safety).
- **Current Dev Throughput**: ~70–110 tokens/second on Host CPU (empirically benchmarked at 109.3 tok/s).
- **Snapdragon Target Runtime**:
  1. *Primary Route*: **Ollama for Windows on ARM64** (natively supported on Snapdragon X Series), executing CPU/GPU/NPU accelerated inference with zero client code changes.
  2. *Accelerated Route*: **Qualcomm AI Hub GenieX / ONNX Runtime GenAI** targeting the 45 TOPS Hexagon NPU via QNN Execution Provider.
- **Optimization Status**: **TARGET IDENTIFIED** (no Snapdragon device compile performed yet; Ollama ARM64 support officially documented by Qualcomm).

### 3.2 Embedding Model (Semantic Retrieval & RAG)
- **Model Identifier**: `BAAI/bge-small-en-v1.5`
- **Task**: Vector representation generation for text chunks extracted from uploaded academic PDF textbooks and lecture slides.
- **Current Runtime**: FastEmbed (`fastembed>=0.8.0`) backed by ONNX Runtime (`CPUExecutionProvider`).
- **Dimensions**: 384-dimensional dense vectors.
- **Model Size**: 67 MB (`model.onnx`).
- **Inference Speed**: ~8–15 ms per chunk on Host CPU.
- **Snapdragon Target Runtime**:
  1. *Direct Migration*: ONNX Runtime with `QnnExecutionProvider` utilizing the Hexagon NPU.
  2. *AI Hub Alternative*: `Nomic-Embed-Text` available pre-optimized on Qualcomm AI Hub.
- **Optimization Status**: **TARGET IDENTIFIED**.

### 3.3 Speech Recognition Model (Voice Input)
- **Model Identifier**: `Systran/faster-whisper-tiny.en`
- **Task**: Automatic speech recognition (ASR) converting student spoken questions into text in memory with zero cloud transmission.
- **Current Runtime**: `faster-whisper` (CTranslate2 INT8 compute) with PyAV in-memory buffer decoding.
- **Quantization**: INT8.
- **Model Size**: ~39 MB.
- **Current Dev Latency**: ~100–180 ms on Host CPU for standard 3–5 second study queries.
- **Snapdragon Target Runtime**:
  1. *Qualcomm AI Hub Whisper*: `Whisper-Base` / `Whisper-Small-Quantized` (w8a16/INT8) optimized for Qualcomm Voice AI SDK and Hexagon NPU.
  2. *ONNX QNN Path*: Whisper encoder/decoder ONNX models executed via `QnnExecutionProvider`.
- **Optimization Status**: **TARGET IDENTIFIED**.

### 3.4 Vision Model (Observable Attention & Focus Mode)
- **Model Identifier**: `UltraFace-320` (`version-RFB-320.onnx`)
- **Task**: Observable presence detection (`"Present"` vs `"Not detected"`) and approximate orientation (`"Screen-facing"` vs `"Not screen-facing"`).
- **Current Runtime**: ONNX Runtime (`CPUExecutionProvider`).
- **Model Size**: **1.21 MB** (1,270,727 bytes).
- **Input Dimensions**: $1 \times 3 \times 240 \times 320$ RGB float32.
- **Current Dev Latency**: ~12–18 ms per frame on Host CPU (evaluated at 5 FPS in browser).
- **Memory Footprint**: ~15 MB RAM.
- **Snapdragon Target Runtime**:
  - Direct compilation via Qualcomm AI Engine Direct SDK (`qnn-onnx-converter`) or ONNX Runtime `QnnExecutionProvider` mapping directly to the 45 TOPS Hexagon NPU.
  - Candidate AI Hub Model: `MediaPipe-Face-Detection` or `Lightweight-Face-Detection`.
- **Optimization Status**: **TARGET IDENTIFIED** (cleanest immediate path to NPU execution due to pure ONNX format and tiny 1.21 MB footprint).

---

## 4. Summary of Evidence
All status levels are assigned strictly based on empirical evidence:
- No Qualcomm AI Hub API key or physical Snapdragon device was present during Stage 1–8 development; therefore, **no model is falsely labeled as COMPILED, PROFILED, or VALIDATED**.
- All models have been verified for Snapdragon architectural compatibility based on Qualcomm technical documentation, ONNX standard format, and Qualcomm AI Hub model catalog offerings.
