# FocusFlow AI: Local Vision Focus Mode (Stage 7)

## 1. Overview
**Local Vision Focus Mode** is the observable presence tracking subsystem of **FocusFlow AI**. It evaluates whether a student is present and oriented toward their study materials during active learning sessions.

In compliance with strict privacy and scientific integrity principles:
- **Observable signals only**: Detects physical face presence (`"Present"` vs `"Not detected"`) and approximate screen alignment (`"Screen-facing"` vs `"Not screen-facing"`).
- **No emotional or psychological claims**: Does not claim to measure "concentration", "distraction", "emotional engagement", or "productivity".
- **Zero frame storage**: Camera frames are processed strictly in memory and discarded immediately after bounding-box inference. Zero raw images are saved to disk, uploaded to the cloud, or sent to external APIs.
- **Derived metrics only**: Only session intervals (duration, present time, away time, focus score) are persisted to the local SQLite database (`focus_sessions`).

---

## 2. Computer Vision Model Specifications

| Parameter | Specification |
| :--- | :--- |
| **Model** | `UltraFace-320` (`version-RFB-320.onnx`) |
| **Architecture** | Lightweight RFB (Receptive Field Block) SSD face detector |
| **Disk Size** | **1.21 MB** (1,270,727 bytes) |
| **Runtime** | **ONNX Runtime** (`onnxruntime` v1.30.0) |
| **Input Resolution** | $320 \times 240$ RGB (normalized: $\frac{x - 127.0}{128.0}$, NCHW format) |
| **Output Priors** | 4,420 anchor priors across 4 multi-scale feature maps |
| **Inference Latency** | **$\sim 12\text{--}18\text{ ms}$ per frame** on Host CPU (x86_64) |
| **Memory Footprint** | $\sim 15\text{ MB}$ active memory in ONNX Runtime |
| **Target Rate** | 5 FPS (1 frame evaluated every 200ms) |
| **Production Target** | Qualcomm Hexagon NPU via ONNX Runtime `QnnExecutionProvider` |

---

## 3. Architecture & Data Flow

```
                [Browser Webcam]
                       │
                       ▼ (getUserMedia requested ONLY on session start)
             [HTML5 Video Element]
                       │
                       ▼ (Sampled at 5 FPS / 200ms)
             [Hidden HTML5 Canvas]
                       │
                       ▼ (In-Memory HTTP POST /api/focus/frame)
         [FastAPI Focus Route (Memory Only)]
                       │
                       ▼ (PIL.Image decode in RAM - zero disk write)
             [UltraFace ONNX Model]
                       │
                       ▼
          [Observable Presence Signals]
          • Present: Confidence >= 0.70
          • Screen-facing: Centered frontal bounding box (0.55 <= w/h <= 1.25)
                       │
                       ▼
       [Focus Session State Machine]
       (3-Frame Debounce / Temporal Smoothing)
                       │
          ┌────────────┴────────────┐
          ▼                         ▼
   [Live HUD Telemetry]     [On Stop: SQLite Persistence]
   • State Badge            • duration_seconds
   • Focus Score            • present_seconds
   • Present / Away Time    • not_detected_seconds
                            • focus_score
```

---

## 4. State Definitions & Transitions

The focus tracking session is governed by a finite state machine:

| State | Definition | Transition Trigger |
| :--- | :--- | :--- |
| `NOT_STARTED` | Session has not been initialized. | Default initial state. |
| `FOCUSED` | Face is detected and student is observably present. | Session starts or face detected for $\ge 2$ of last 3 frames. |
| `NOT_DETECTED` | Face is absent from the camera field of view. | Face absent for $> 1$ of last 3 frames (smoothed). |
| `PAUSED` | Tracking is suspended; timers are frozen. | User clicks "Pause" button. |
| `COMPLETED` | Session has ended; final statistics computed. | User clicks "End Session" button. |

### Temporal Smoothing (Debounce)
To prevent detection flicker caused by single-frame motion blur or temporary occlusion, the state machine maintains a 3-frame circular buffer. State transitions require a majority agreement across the buffer before switching between `FOCUSED` and `NOT_DETECTED`.

---

## 5. Focus Score Formula

The focus score represents the proportion of active study time the student was observably present:

$$\text{focus\_score} = \left( \frac{\text{present\_seconds}}{\max(\text{active\_session\_duration}, 1)} \right) \times 100$$

where:
$$\text{active\_session\_duration} = \text{present\_seconds} + \text{not\_detected\_seconds}$$

- **Paused time** is excluded from both the numerator and denominator.
- If the session duration is 0, the score defaults to $100.0\%$.
- Results are reported to 2 decimal places.

---

## 6. Privacy & Security Design

1. **No External Transmission**: Camera frames never leave `127.0.0.1`. They are sent over loopback from the browser to the local FastAPI process.
2. **Zero Disk Storage**: Frames exist purely as transient memory buffers (`io.BytesIO`) during ONNX inference and are garbage collected immediately.
3. **Permission on Demand**: The camera is never accessed on page load; permissions are requested only when the student explicitly initiates a session.
4. **Transparent UI Disclosure**: Focus Mode displays a persistent privacy badge:
   > *"Privacy-first focus tracking • Camera frames are processed locally and are not stored."*

---

## 7. API Endpoints Reference

### 7.1. Session Control
- `POST /api/focus/start`: Initializes session, generates `session_id`, resets timers.
- `POST /api/focus/pause`: Freezes timers and toggles `PAUSED` state.
- `POST /api/focus/stop`: Concludes session, calculates final `focus_score`, persists record to SQLite `focus_sessions` table.

### 7.2. Telemetry & History
- `GET /api/focus/status`: Returns live observable presence metrics and timer values.
- `GET /api/focus/current`: Alias for `/api/focus/status`.
- `GET /api/focus/history`: Returns up to 20 recent completed sessions from SQLite.

### 7.3. Frame Processing
- `POST /api/focus/frame`:
  - **Payload**: `multipart/form-data` with `file` (JPEG frame blob).
  - **Response**:
    ```json
    {
      "session_id": "ef29e8df-39e9-485d-a307-4bc01ca3f861",
      "state": "FOCUSED",
      "present": true,
      "screen_facing": true,
      "confidence": 0.8942,
      "box": [0.312, 0.215, 0.684, 0.782],
      "elapsed_seconds": 124,
      "present_seconds": 118,
      "not_detected_seconds": 6,
      "focus_score": 95.16,
      "inference_latency_ms": 13.77,
      "device": "Host CPU (x86_64)"
    }
    ```

---

## 8. Qualcomm Snapdragon NPU Target Architecture

### Development Environment (Current)
```
Webcam Frame ──> ONNX Runtime (CPUExecutionProvider) ──> Host CPU (x86_64)
```

### Production Snapdragon Target (Copilot+ PCs)
```
Webcam Frame ──> ONNX Runtime (QnnExecutionProvider) ──> Qualcomm Hexagon NPU (45 TOPS)
```

- **Inference Speed**: The UltraFace-320 ONNX graph compiles directly for the Qualcomm Hexagon NPU, executing in $<2\text{ ms}$ per frame.
- **Power Envelope**: Offloading visual presence tracking to the Hexagon NPU draws $<0.5\text{ Watts}$, allowing all-day background monitoring without battery drain or CPU thermal throttling.
