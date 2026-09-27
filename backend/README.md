# FocusFlow AI — Backend Foundation

The **FocusFlow AI Backend** is a high-performance, modular Python FastAPI service designed to power an on-device, private AI study companion.

Targeted for **Snapdragon-powered HP PCs** (Snapdragon X Elite / X Plus / Snapdragon X2) in the Qualcomm Snapdragon AI Lab Build & Present Challenge, the architecture abstracts on-device AI model runtimes (LLM, Speech, Vision, and RAG embeddings) away from the client application.

---

## 1. Prerequisites

- **Python**: Python `3.10` - `3.12` (Tested on Python `3.12.10`)
- **Operating System**: Windows (Host x86_64 for development; Windows on ARM for Snapdragon deployment)

---

## 2. Setup & Installation

### Step 1: Create Virtual Environment
```powershell
cd backend
python -m venv .venv
```

### Step 2: Activate Environment
```powershell
# Windows PowerShell
.venv\Scripts\activate
```

### Step 3: Install Dependencies
```powershell
pip install -r requirements.txt
```

---

## 3. Configuration

Copy `.env.example` to `.env` if custom overrides are needed:
```powershell
cp .env.example .env
```

Default variables:
```env
APP_NAME=FocusFlow AI API
APP_VERSION=0.1.0
HOST=127.0.0.1
PORT=8000
DATABASE_URL=sqlite:///./focusflow.db
FRONTEND_URL=http://localhost:5173
```

---

## 4. Starting the Server

Run the server with Uvicorn:
```powershell
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Interactive OpenAPI documentation is available at:
- Swagger UI: `http://127.0.0.1:8000/docs`
- ReDoc: `http://127.0.0.1:8000/redoc`

---

## 5. Endpoints Overview

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/` | Root service heartbeat (`name`, `version`, `status`) |
| `GET` | `/api/health` | Service health status check |
| `GET` | `/api/model/status` | Current on-device AI runtime readiness & target platform |

---

## 6. On-Device AI Architecture & Snapdragon Target

```
FocusFlow Frontend (React + Vite)
             │
             ▼ (HTTP / WebSockets)
FastAPI Backend (app.main)
             │
   ┌─────────┼─────────┬─────────┐
   ▼         ▼         ▼         ▼
LocalLLM   Speech   Vision     RAG
Provider  Provider Provider  Provider
   │         │         │         │
   └─────────┼─────────┴─────────┘
             ▼
      AIProvider Base
             │
   ┌─────────┴─────────┐
   ▼                   ▼
Current Dev:        Deployment Target:
Host CPU / x86_64   Snapdragon X NPU (Qualcomm QNN / Hexagon)
```

- **Stage 2 Status**: Models report truthful `not_initialized` state without fake simulated text.
- **Next Stages**: Real local models (Llama-3.2, Whisper-Base, UltraFace) will be integrated in modular providers.
