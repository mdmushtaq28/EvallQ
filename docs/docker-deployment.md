# FocusFlow AI — Local Docker Deployment Guide

This guide details the containerized deployment of **FocusFlow AI** as a self-contained local edge appliance using Docker and Docker Compose.

---

## 1. Architectural Overview

FocusFlow AI operates locally inside a private Docker bridge network (`focusflow-network`):

```
┌────────────────────────────────────────────────────────────────────────┐
│                        HOST PC / BROWSER                               │
│                   Access: http://localhost:80                          │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ (Port 80 HTTP)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      DOCKER APPLIANCE BOUNDARY                         │
│                                                                        │
│  ┌───────────────────────┐              ┌───────────────────────────┐  │
│  │ focusflow-frontend    │  /api/*      │ focusflow-backend         │  │
│  │ (Nginx 1.25 Alpine)   ├─────────────►│ (FastAPI / PyTorch/ONNX)  │  │
│  │ Static Vite React SPA │              │ Port 8000 (Internal)      │  │
│  └───────────────────────┘              └─────────────┬─────────────┘  │
│                                                       │                │
│                                                       ▼                │
│  ┌───────────────────────┐              ┌───────────────────────────┐  │
│  │ focusflow-ollama-init │              │ focusflow-ollama          │  │
│  │ One-time idempotent   ├─────────────►│ (Ollama Daemon)           │  │
│  │ pull of qwen2.5:0.5b  │              │ Port 11434 (Internal)     │  │
│  └───────────────────────┘              └─────────────┬─────────────┘  │
│                                                       │                │
│  ┌────────────────────────────────────────────────────┴─────────────┐  │
│  │ PERSISTENT DOCKER VOLUMES                                        │  │
│  │ • focusflow_data        ──► SQLite database (/app/data)          │  │
│  │ • focusflow_ollama_data ──► Local LLM GGUF weights (~397 MB)     │  │
│  │ • focusflow_model_cache ──► HuggingFace & FastEmbed ONNX weights │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Prerequisites

1. **Operating System**: Windows 10/11 (64-bit), macOS (Apple Silicon or Intel), or Linux (x86_64 / ARM64).
2. **Docker Desktop**:
   - Ensure Docker Desktop is installed and the Docker Engine is running.
   - WSL 2 backend recommended for Windows.
   - Allocated Resources (recommended): $\ge 4\text{ GB RAM}$, $2\text{ CPUs}$.
3. **Ports**: Port `80` free on your local machine.

---

## 3. First Startup

From the project root directory, run:

```bash
# Windows
start_focusflow.bat

# Or via Docker Compose CLI directly
docker compose up -d --build
```

### What Happens During First Startup:
1. **Frontend Image Build**: Multi-stage build compiles TypeScript and packages the Vite app into an optimized Nginx web server.
2. **Backend Image Build**: Installs Python 3.12, ONNX Runtime, faster-whisper, and PyMuPDF dependencies.
3. **Ollama Container Initialization**: Starts the Ollama service.
4. **Idempotent Model Pull**: The `ollama-init` service checks whether `qwen2.5:0.5b` is present in `focusflow_ollama_data`. If not found, it downloads the model weights (~397 MB) once.
5. **App Ready**: Once all healthchecks pass, the application becomes accessible at:
   - **Web UI**: [http://localhost](http://localhost)
   - **Backend Health Check**: [http://localhost/api/health](http://localhost/api/health)
   - **Model Telemetry**: [http://localhost/api/model/status](http://localhost/api/model/status)

---

## 4. Subsequent Startups

On subsequent runs:
```bash
docker compose up -d
```
The `ollama-init` container detects that `qwen2.5:0.5b` is already cached in `focusflow_ollama_data` and exits immediately with code `0`. **No models are re-downloaded.**

---

## 5. Stopping the Application

To shut down the containers cleanly:

```bash
# Windows
stop_focusflow.bat

# Or via Docker Compose CLI directly
docker compose down
```

> [!NOTE]
> Running `docker compose down` halts the containers and network, but preserves your SQLite database, uploaded documents, focus sessions, and model weights in the named volumes.

---

## 6. Database Persistence

All application data is persisted inside the Docker named volume `focusflow_data`, mounted at `/app/data/focusflow.db`:
- Indexed course documents and semantic chunks.
- Vector embeddings (BGE-small 384d).
- Interactive Q&A logs and AI Tutor chat histories.
- Focus session logs and weighted presence scores.
- Generated quizzes and flashcards.

The database is never deleted during normal container lifecycles (`down` / `up` / `restart`).

---

## 7. Media Permissions (Webcam & Microphone)

Modern web browsers (Chrome, Edge, Firefox, Safari) enforce strict security boundaries on the `navigator.mediaDevices.getUserMedia` API:
- Camera and microphone access is restricted strictly to **Secure Contexts**.
- Per the W3C Web Security Specification, **`http://localhost` is explicitly treated as a Secure Context** without requiring an SSL certificate.
- When opening `http://localhost`, your browser will prompt for camera and microphone permissions normally.
- **Privacy Architecture Maintained**: Audio and video frames are decoded in memory inside the container and processed via local ONNX Runtime / faster-whisper. Zero raw video or audio is ever written to disk or sent to the cloud.

---

## 8. 100% Offline Operation

FocusFlow AI is designed to operate completely air-gapped:
1. Once initial container images are built and model weights are downloaded into the volume, **no Internet connection is required**.
2. Disconnect your network or enable Airplane Mode.
3. Every feature continues to function offline:
   - AI Tutor conversational chat (`qwen2.5:0.5b`)
   - Voice transcription (`faster-whisper-tiny.en INT8`)
   - Observable focus detection (`UltraFace-320 ONNX`)
   - PDF ingestion, chunking, and vector embedding (`BGE-small ONNX`)
   - Semantic RAG document Q&A
   - Executive summaries, key takeaways, and flashcard generation
   - Validated anti-duplication quizzes
   - Analytics aggregations and local JSON data export

---

## 9. Security & Isolation

- **No Secrets Stored**: No API keys, cloud tokens, or hardcoded passwords exist anywhere in the images or configuration.
- **Port Isolation**: Only port `80` (HTTP) is mapped to the host machine. The backend (port `8000`) and Ollama daemon (port `11434`) remain accessible only via the internal `focusflow-network` bridge.
- **Same-Origin API Architecture**: Nginx proxies `/api/*` directly to the backend container, completely eliminating CORS friction and browser security blocks.

---

## 10. Troubleshooting

| Issue | Cause | Solution |
| :--- | :--- | :--- |
| **Port 80 in use** | Another service (IIS, Apache, Skype) is binding port 80 | Edit `docker-compose.yml` to map `"8080:80"` and access via `http://localhost:8080` |
| **Ollama healthcheck failure** | Insufficient memory allocated to Docker | Increase Docker Desktop memory to $\ge 4\text{ GB}$ in Docker Settings > Resources |
| **Camera not working in browser** | Browser denied permission or non-localhost URL used | Check browser site permissions for `localhost`; ensure accessing via `http://localhost`, not an unencrypted raw LAN IP |
| **Backend 503: Model Not Initialized** | Model download in progress or Ollama not ready | Allow `ollama-init` to complete the initial download; check logs with `docker compose logs -f ollama-init` |

---

## 11. Complete Reset Procedure

To completely remove the containers, networks, and all cached data:

```bash
docker compose down -v
```

> [!WARNING]
> The `-v` flag deletes all persistent Docker volumes, resetting the SQLite database and clearing cached model weights.
