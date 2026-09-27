# FocusFlow AI: Local Speech Engine & Study Analytics (Stage 8)

## 1. Overview
Stage 8 brings two critical capabilities to **FocusFlow AI**:
1. **Local Speech Engine**: Completely private, on-device automatic speech recognition (ASR) allowing students to ask study questions to the AI Tutor verbally.
2. **Study Analytics & Persistence Engine**: Real-time aggregation of study telemetry, focus scores, document index volumes, and AI interactions from local SQLite tables (`focus_sessions`, `documents`, `study_interactions`), with one-click full database export.

In adherence to strict academic privacy principles:
- **Zero Cloud APIs**: No audio bytes or telemetry are ever uploaded or transmitted outside the host machine.
- **In-Memory Audio Processing**: Voice inputs captured by the browser microphone are streamed directly into memory buffers, decoded in RAM via PyAV, transcribed by `faster-whisper` in INT8 quantization, and discarded immediately.
- **Scientific Integrity**: Focus statistics and study metrics are calculated strictly from observable events recorded in SQLite; zero synthetic data is manufactured in production mode.

---

## 2. Local Speech Engine Specifications

| Parameter | Specification |
| :--- | :--- |
| **Model** | `Systran/faster-whisper-tiny.en` |
| **Quantization** | **INT8** |
| **Model Size** | **39 MB** |
| **Inference Engine** | **CTranslate2** (v4.8.2) + `faster-whisper` (v1.2.1) |
| **Audio Decoding** | **PyAV** (`av` v18.1.0) streaming directly from `io.BytesIO` |
| **Memory Footprint** | $\sim 40\text{ MB}$ RAM |
| **Inference Latency** | **$100\text{--}250\text{ ms}$** on Host CPU (x86_64) |
| **Supported Formats** | WebM (Opus), WAV, MP3, OGG, FLAC (all decoded in memory) |
| **Target Architecture** | Host CPU (development) $\to$ Qualcomm Hexagon NPU via ONNX/QNN Execution Provider (Snapdragon Copilot+ PC) |

---

## 3. Audio Processing & Data Flow

```
   [Student Speaks into Mic]
              │
              ▼ (HTML5 MediaRecorder)
   [In-Memory Audio Blob (WebM / Opus)]
              │
              ▼ (HTTP POST /api/speech/transcribe)
   [FastAPI Speech Route]
              │
              ▼ (io.BytesIO memory buffer - ZERO disk writes)
   [PyAV Audio Frame Stream]
              │
              ▼
   [faster-whisper tiny.en INT8]
   (CTranslate2 CPU Inference / VAD Silence Filtering)
              │
              ▼
   [Transcribed Text + Latency Telemetry]
              │
              ▼
   [AI Tutor Prompt Input Box]
   (Student reviews or sends immediately to local LLM)
```

---

## 4. Study Analytics & Persistence Engine Specifications

### Database Schema
Telemetry is persisted in the local SQLite database (`backend/focusflow.db`):
- **`focus_sessions`**:
  - `duration_seconds`: Total active session duration.
  - `present_seconds`: Attentive presence detected by UltraFace-320.
  - `not_detected_seconds`: Absence duration.
  - `screen_facing_seconds`: Frontal alignment duration.
  - `focus_score`: Derived percentage: $\frac{\text{present\_seconds}}{\max(\text{duration\_seconds}, 1)} \times 100$.
- **`documents`**:
  - `filename`, `file_size`, `page_count`, `chunk_count`, `summary`, `key_takeaways`.
- **`study_interactions`**:
  - `id`: UUID.
  - `interaction_type`: `'chat_query'`, `'document_qa'`, `'quiz_generated'`, `'flashcard_generated'`.
  - `document_id`: Optional foreign link.
  - `latency_ms`: Local model response time.
  - `created_at`: UTC timestamp.

### Aggregations Computed
1. **Total Study Time**: Cumulative sum of `duration_seconds` across all completed focus sessions.
2. **Overall Focus Score**: Weighted presence percentage:
   $$\text{Weighted Focus Score} = \left( \frac{\sum \text{present\_seconds}}{\sum \text{duration\_seconds}} \right) \times 100$$
3. **AI Questions Answered**: Real count of student questions posed to the AI Tutor and Document Q&A.
4. **Documents Analyzed**: Count of documents parsed and embedded locally with FastEmbed.
5. **Weekly Trends**: Day-by-day study and focus minutes for the rolling 7-day window.
6. **Session Progression**: Chronological focus score trajectory across the last 10 completed focus sessions.

---

## 5. Local JSON Data Export
Students maintain absolute ownership of their learning data. The endpoint `GET /api/analytics/export/download` generates a self-contained JSON attachment:
```json
{
  "exported_at": "2026-09-24T06:27:04.991204",
  "version": "1.0.0",
  "overview": {
    "total_study_time_seconds": 1800,
    "total_study_time_formatted": "30.0 min",
    "overall_focus_score": 87.5,
    "ai_questions_answered": 14,
    "documents_analyzed": 2,
    "focused_study_time_seconds": 1575,
    "focused_study_time_formatted": "26.3 min",
    "away_study_time_seconds": 225,
    "away_study_time_formatted": "3.8 min",
    "quiz_sessions_completed": 3,
    "total_sessions_count": 2
  },
  "focus_sessions": [...],
  "documents": [...],
  "study_interactions": [...]
}
```

---

## 6. Snapdragon Copilot+ PC Target Architecture
On Qualcomm Snapdragon X Elite and Snapdragon X Plus Copilot+ PCs:
- **Speech Engine**: Whisper INT8 weights can be executed via the Qualcomm AI Engine Direct SDK (QNN) targeting the 45 TOPS Hexagon NPU, reducing voice transcription latency to under 50ms while drawing negligible battery power.
- **SQLite Engine**: Standard local SQLite runs at zero network overhead on Windows on ARM, ensuring student privacy is guaranteed by hardware-isolated local execution.
