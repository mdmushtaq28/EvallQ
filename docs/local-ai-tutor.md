# FocusFlow AI: Local AI Tutor (Stage 4)

## 1. Overview
The **Local AI Tutor** is the core interactive pedagogical companion in **FocusFlow AI**. It provides real, private, on-device academic tutoring without cloud dependency, zero external API keys, and zero data leakage.

Designed for the **Qualcomm Snapdragon AI Lab Challenge**, the application employs a dual-tier provider abstraction that executes efficiently on **Host CPU (x86_64)** during development while providing a direct migration path to the **45 TOPS Qualcomm Hexagon NPU** on Snapdragon Copilot+ PCs.

---

## 2. On-Device Model Specifications

Following the Section 21 Model Safety Check on the development workstation (7.5 GB total physical RAM), the tutor is powered by a high-efficiency instruction-tuned language model:

| Parameter | Specification |
| :--- | :--- |
| **Model** | `Qwen2.5-0.5B-Instruct` |
| **Parameter Count** | 494.03 Million |
| **Quantization** | Q4_K_M (GGUF V3) |
| **Disk Footprint** | 397 MB |
| **Working Memory (RAM)** | ~460 MB active memory footprint |
| **Observed CPU Speed** | **~31.9 – 33.2 tokens/second** on host CPU |
| **Context Length** | 4,096 tokens (configured for student tutoring) |
| **Host Runtime** | Ollama local inference engine on `127.0.0.1:11434` |
| **Execution Device** | Host CPU / x86_64 (`OLLAMA_LLM_LIBRARY=cpu`) |

---

## 3. Architecture & Provider Abstraction

FocusFlow AI separates development simulation from production Snapdragon NPU deployment using a clean object-oriented abstraction in `backend/app/services/ai/`:

```
                 ┌────────────────────────────────┐
                 │       LocalLLMProvider         │
                 │          (Abstract)            │
                 └──────────────┬─────────────────┘
                                │
        ┌───────────────────────┴────────────────────────┐
        ▼                                                ▼
┌──────────────────────────────┐        ┌──────────────────────────────┐
│    DevelopmentLLMProvider    │        │    SnapdragonLLMProvider     │
│   (Host CPU / x86_64)        │        │   (Qualcomm Hexagon NPU)     │
├──────────────────────────────┤        ├──────────────────────────────┤
│ • Runtime: Ollama (Local)    │        │ • Runtime: QNN / ONNX EP     │
│ • Model: Qwen 2.5 (0.5B)     │        │ • Model: Llama-3.2-3B INT4   │
│ • Active in Dev Environment  │        │ • Standby Target for AI PCs  │
└──────────────────────────────┘        └──────────────────────────────┘
```

### Truthful Hardware Reporting
- **Development Machine**: Truthfully identifies hardware as `Host CPU (x86_64)`. It does **not** falsely claim NPU acceleration.
- **Snapdragon Target**: Standby provider documents the Snapdragon Copilot+ PC deployment targeting the Qualcomm Hexagon NPU.

---

## 4. API Endpoints

### 4.1. Tutor Chat (`POST /api/chat`)
Accepts user questions and contextual multi-turn conversation history.

#### Request Schema
```json
{
  "message": "Explain binary search in 2 simple sentences.",
  "conversation": [
    {
      "role": "user",
      "content": "What is searching?"
    },
    {
      "role": "assistant",
      "content": "Searching is the algorithmic process of locating a specific target item..."
    }
  ]
}
```

#### Response Schema
```json
{
  "reply": "Binary search is a method for finding a specific element within a sorted array by repeatedly dividing the search interval in half. This technique is especially useful for searching for an element in a sorted array, which allows for efficient searching in logarithmic time.",
  "model": "qwen2.5:0.5b",
  "provider": "Development (Host CPU)",
  "device": "Host CPU (x86_64)",
  "latency_ms": 2744,
  "tokens_per_second": 31.9,
  "offline": true
}
```

#### Status & Error Codes
- `200 OK`: Successful local inference.
- `400 Bad Request`: Empty question, whitespace-only question, or input exceeding 2,000 characters.
- `503 Service Unavailable`: Local LLM runner is offline or model weights have not been downloaded. Includes clear setup guidance.

### 4.2. Runtime Telemetry (`GET /api/model/status`)
Probes the active local runtime and returns current component states:
- `llm`: `"ready"`, model: `"qwen2.5:0.5b"`
- `speech`: `"not_initialized"` (Stage 7 Whisper local engine)
- `vision`: `"not_initialized"` (Stage 8 attention tracking)
- `target`: `{"platform": "Snapdragon AI PC", "development_environment": "Host CPU / x86_64"}`

---

## 5. Snapdragon NPU Production Upgrade Path

When deploying FocusFlow AI on commercial Snapdragon-powered HP PCs (Snapdragon X Elite / Snapdragon X Plus):

1. **Model Weights**: Compiled via **Qualcomm AI Hub** as `Llama-3.2-3B-Instruct` INT4/W4A16 or `Qwen2.5-1.5B`.
2. **Execution Provider**: Executed via **ONNX Runtime** with the **QNN Execution Provider** (`QnnExecutionProvider`).
3. **Hardware Acceleration**: Computation runs entirely on the **45 TOPS Hexagon NPU**, achieving:
   - Inference throughput of 30–50 tokens/second for 3B parameter models.
   - Ultra-low power consumption (<5 Watts), allowing all-day battery life during study sessions.
   - Zero CPU thermal throttling, leaving CPU and GPU cores completely free for student multitasking.

---

## 6. Verification & Validation Summary

| Test Case | Method | Expected | Actual | Result |
| :--- | :--- | :--- | :--- | :--- |
| **Model Load** | `ollama list` | `qwen2.5:0.5b` (397 MB) | Present, 397 MB | **PASS** |
| **Service Status** | `GET /api/model/status` | `llm.status: "ready"` | `ready`, model `qwen2.5:0.5b` | **PASS** |
| **Single-Turn Chat** | `POST /api/chat` | Educational answer + latency | 2744ms, 31.9 tok/s | **PASS** |
| **Multi-Turn Context** | `POST /api/chat` with history | Contextual resolution | Resolved time complexity | **PASS** |
| **Validation: Empty** | `POST /api/chat` (empty string) | HTTP 400 Bad Request | HTTP 400 | **PASS** |
| **Validation: >2000 chars**| `POST /api/chat` (2001 chars) | HTTP 400 Bad Request | HTTP 400 | **PASS** |
| **Frontend Production Build**| `npm run build` | 0 TypeScript errors | 0 errors, 4.14s build | **PASS** |
