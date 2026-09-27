# FocusFlow AI: Snapdragon Target Validation Plan

## 1. Objective
This plan specifies the precise technical procedure for compiling, profiling, and validating **FocusFlow AI** models for the **Qualcomm Snapdragon X Series (X Elite / X Plus)** platform.

It covers two validation environments:
1. **Qualcomm AI Hub Cloud Workbench**: Hosted remote execution on physical Snapdragon reference hardware.
2. **Local Snapdragon Copilot+ PC**: Physical Windows on ARM64 device execution via ONNX Runtime QNN Execution Provider.

---

## 2. Prerequisites & Environment Setup

### 2.1 Qualcomm AI Hub CLI Setup
```bash
# 1. Install Qualcomm AI Hub SDK and Model Library
pip install qai-hub qai-hub-models

# 2. Authenticate with your Qualcomm Developer Token (obtain from https://aihub.qualcomm.com)
qai-hub configure --api_token <YOUR_QUALCOMM_AI_HUB_API_TOKEN>

# 3. Verify connection and list available Snapdragon reference hardware
qai-hub list-devices
# Expected target: "Snapdragon X Elite CRD" or "Snapdragon X Plus CRD"
```

---

## 3. Step-by-Step Model Validation

### 3.1 Vision Model: UltraFace-320 ONNX Validation
`UltraFace-320` is a 1.21 MB ONNX model designed for real-time presence tracking at 5 FPS in memory.

#### Step 1: Submit Model for NPU Compilation
```bash
qai-hub compile \
  --model "backend/app/services/ai/weights/version-RFB-320.onnx" \
  --device "Snapdragon X Elite CRD" \
  --input_specs '{"input": [1, 3, 240, 320]}' \
  --output_names "scores" "boxes" \
  --options "--target_runtime qnn_lib" \
  --name "FocusFlow_UltraFace320_QNN"
```

#### Step 2: Profile on Hosted Snapdragon X Elite Hardware
```bash
qai-hub profile \
  --model "<COMPILED_MODEL_JOB_ID>" \
  --device "Snapdragon X Elite CRD" \
  --name "FocusFlow_UltraFace320_Profile"
```

#### Step 3: Record Profile Results
- Extract: Inference latency (p50, p95), NPU utilization, memory bandwidth.
- Target expectation: $< 4\text{ ms}$ on 45 TOPS Hexagon NPU.
- Update [`docs/benchmarks.md`](file:///d:/FocusFlow%20AI/docs/benchmarks.md) with actual job ID and measured numbers.

---

### 3.2 Speech Model: Whisper-tiny / Whisper-Base Validation
To transition from CTranslate2 Host CPU inference to native Snapdragon Hexagon NPU execution:

#### Step 1: Profile Pre-Optimized AI Hub Whisper Model
```bash
# Test Whisper-Base optimized for Snapdragon X Elite
python -m qai_hub_models.models.whisper_base.export \
  --device "Snapdragon X Elite CRD" \
  --components encoder decoder \
  --target-runtime qnn_lib
```

#### Step 2: Measure Real-Time Factor (RTF)
- Record latency for 3-second audio chunk.
- Target expectation: RTF $< 0.02x$ ($< 50\text{ ms}$ latency).

---

### 3.3 Semantic Embedding Model: BGE-small / Nomic-Embed Validation
To accelerate text embedding on the Hexagon NPU:

#### Step 1: Compile Embedding ONNX for QNN
```bash
# Locate cached FastEmbed bge-small ONNX model
# Windows Temp cache: %TEMP%\fastembed_cache\fast-bge-small-en-v1.5\model.onnx

qai-hub compile \
  --model "$env:TEMP\fastembed_cache\fast-bge-small-en-v1.5\model.onnx" \
  --device "Snapdragon X Elite CRD" \
  --input_specs '{"input_ids": [1, 128], "attention_mask": [1, 128], "token_type_ids": [1, 128]}' \
  --options "--target_runtime qnn_lib" \
  --name "FocusFlow_BGESmall_QNN"
```

#### Step 2: Profile on Snapdragon Hardware
```bash
qai-hub profile \
  --model "<COMPILED_EMBEDDING_JOB_ID>" \
  --device "Snapdragon X Elite CRD"
```

---

### 3.4 Large Language Model: Qwen 2.5 on Snapdragon
Snapdragon X Series PCs support ARM-native execution through two certified pathways:
1. **Ollama for Windows on ARM64** (Recommended for local zero-code-change deployment):
   - Install official Windows on ARM build of Ollama.
   - Run: `ollama run qwen2.5:0.5b`.
   - FocusFlow AI automatically connects via `http://127.0.0.1:11434` with zero frontend or backend alterations.
2. **Qualcomm AI Hub GenieX**:
   - Deploy Qwen2.5 / Llama-3.2 using Qualcomm GenieX NPU runtime for maximum energy efficiency.

---

## 4. Physical Snapdragon Copilot+ PC Deployment

When deploying to a physical Snapdragon laptop (e.g., Surface Pro 11, Lenovo Yoga Slim 7x, Dell XPS 13 Snapdragon):

```powershell
# 1. Clone repository on Windows on ARM64
git clone <repo-url> "C:\FocusFlow AI"
cd "C:\FocusFlow AI\backend"

# 2. Set up Python 3.11/3.12 ARM64 Virtual Environment
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# 3. Install onnxruntime-qnn
pip install onnxruntime-qnn

# 4. Configure Snapdragon Target Environment Variable in .env
Set-Content -Path .env -Value "AI_TARGET=snapdragon"

# 5. Launch FastAPI Backend
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

### Verification Check
Query `http://127.0.0.1:8000/api/model/status`:
- `qnn_available` will flip to `true`.
- `runtime.environment` will report `"snapdragon"`.
- Frontend badge will report `"Snapdragon NPU Active"`.
