# FocusFlow AI: 3–5 Minute Competition Demo Script

## Snapdragon AI Lab Build & Present Challenge

### Demo Overview
- **Product**: FocusFlow AI — Private On-Device Academic Study Companion
- **Target Platform**: Qualcomm Snapdragon X Series (X Elite & X Plus Copilot+ PCs)
- **Current Development Environment**: Host CPU (x86_64) with direct ONNX/QNN migration path
- **Target Audience**: Challenge Judges & Technical Evaluators
- **Target Demo Duration**: 3 to 4.5 minutes

---

## Demo Sequence Walkthrough

```
[Step 1: Dashboard] ──► [Step 2: Study Materials] ──► [Step 3: AI Tutor & Voice]
     (45 sec)                    (60 sec)                       (60 sec)
                                                                   │
                                                                   ▼
[Step 5: Analytics & Export] ◄─────────────────────── [Step 4: Focus Mode]
         (30 sec)                                              (45 sec)
```

---

### Step 1: Dashboard Overview & Architecture Positioning (0:00 – 0:45)
**Screen to Show**: [Dashboard Overview](http://localhost:5173/)

**What to Demonstrate**:
1. Point to the top banner: *"Built for Snapdragon AI PCs • ON-DEVICE AI"*.
2. Show the **On-Device AI Engine** card on the right:
   - LLM: `Ready (qwen2.5:0.5b)`
   - Speech: `Ready (Whisper-tiny.en (INT8))`
   - Vision: `Ready (UltraFace-320)`
   - Embeddings: `Ready (bge-small-en-v1.5)`
3. Highlight the **Snapdragon AI Optimization & Migration Architecture** section:
   - Current Dev: `Host CPU (x86_64)`
   - Snapdragon Target: `Qualcomm Snapdragon X Elite / Plus`
   - Validation Status: `Target / Not Yet Validated` (emphasize scientific honesty).

**Spoken Script**:
> *"Welcome to FocusFlow AI, an on-device academic study companion engineered for the next generation of Qualcomm Snapdragon Copilot+ PCs.
> Students today deal with strict academic privacy requirements: they cannot and should not upload confidential lecture slides, exam drafts, or webcam video to cloud servers.
> FocusFlow AI runs four distinct AI models entirely on-device: a local conversational LLM, local vector embeddings, in-memory speech recognition, and observable computer vision focus tracking.
> As you can see on our architecture card, all four models are actively executing locally on our host machine, with a clean migration path to the 45 TOPS Qualcomm Hexagon NPU."*

---

### Step 2: Study Materials & Document-Grounded RAG (0:45 – 1:45)
**Screen to Show**: [Study Materials Page](http://localhost:5173/)

**What to Demonstrate**:
1. Click the `Study Materials` tab on the sidebar.
2. Select the indexed document `Operating_Systems_Concurrency.pdf` (or drop a new PDF to demonstrate fast local PyMuPDF extraction and FastEmbed semantic chunking).
3. Switch to the **Executive Summary** sub-tab: show the synthesized summary and 4 key takeaways.
4. Switch to the **Document Q&A** sub-tab:
   - Enter question: *"What are the Coffman conditions for deadlock?"*
   - Click Send.
   - Show the grounded answer and point out the **exact page citation badges** (e.g., `Page 3 • Score 0.84`).
   - Mention the latency badge (`~10ms embedding retrieval, Host CPU`).

**Spoken Script**:
> *"Next is our Smart Study Materials engine. When a student uploads a textbook chapter or lecture PDF, PyMuPDF extracts text in local RAM and our BGE-small ONNX model computes 384-dimensional vector embeddings in just 10.7 milliseconds per chunk.
> Notice how when I ask about deadlock conditions, our local RAG pipeline grounds the response strictly in the document text and provides direct page citations. No cloud vector database, zero document upload to external APIs."*

---

### Step 3: AI Tutor & Local Voice Transcription (1:45 – 2:45)
**Screen to Show**: [AI Tutor Page](http://localhost:5173/)

**What to Demonstrate**:
1. Click the `AI Tutor` tab.
2. Point out the top status strip: `LLM: Qwen 2.5 (0.5B Instruct)` and `Speech: Whisper-tiny.en (INT8)`.
3. Click the **Microphone button**:
   - Speak: *"Explain the difference between mutex and semaphore in one sentence."*
   - Click the mic again to stop.
4. Show the live transcribing indicator: speech transcribed in `~107ms` via `faster-whisper INT8` in memory.
5. Click Send: show Qwen 2.5 generating the technical explanation at `~110 tokens/second` on Host CPU.

**Spoken Script**:
> *"For multi-turn problem solving, we have the Private AI Tutor. Notice the microphone input: when I speak, the audio is captured as an in-memory buffer, decoded via PyAV, and transcribed by faster-whisper INT8 in approximately 100 milliseconds without ever touching the disk.
> The prompt feeds directly into our on-device Qwen 2.5 model, delivering rapid, structured tutoring turns with complete zero-cloud confidentiality."*

---

### Step 4: Local Vision Focus Mode (2:45 – 3:30)
**Screen to Show**: [Focus Mode Page](http://localhost:5173/)

**What to Demonstrate**:
1. Click the `Focus Mode` tab.
2. Click **Start Focus Session**:
   - Browser requests camera permission only on session start.
   - Live video stream appears with the HUD overlay.
   - Show the state badge: `● FOCUSED`.
   - Point out the bounding box and inference latency (`~19.8ms / 50 FPS`).
3. Briefly turn your head away from the screen or cover the camera:
   - Show the 3-frame debounce transition to `○ NOT DETECTED`.
   - Turn back: state immediately returns to `● FOCUSED`.
4. Click **End Session**:
   - Display the completed session summary: Total Duration, Present Time, Away Time, and Focus Score.

**Spoken Script**:
> *"One of our flagship capabilities is Local Vision Focus Mode. Using UltraFace-320—a 1.21 megabyte ONNX model—we track observable presence at 5 frames per second.
> Notice our scientific honesty: we detect strictly physical presence and screen alignment. We make zero fake claims about 'mind reading' or emotional states.
> Most importantly, video frames are decoded in RAM and discarded after each 19-millisecond inference pass. Zero camera images are stored or uploaded."*

---

### Step 5: Study Analytics & Data Portability (3:30 – 4:00)
**Screen to Show**: [Analytics Page](http://localhost:5173/)

**What to Demonstrate**:
1. Click the `Analytics` tab.
2. Show the real-time aggregations from SQLite: Total Study Time, Weighted Focus Score, AI Questions Answered, and Documents Analyzed.
3. Show the **Weekly Study Duration** bar chart and the **Focus Score Trend** line chart.
4. Click **Export Local Data (JSON)**:
   - Browser immediately downloads `focusflow_study_export_YYYY-MM-DD.json`.
   - Briefly open or show the clean, structured JSON file.

**Spoken Script**:
> *"Finally, all study activity aggregates into our on-device SQLite database. Students see truthful weekly velocity charts, session focus trajectories, and have complete data ownership via our one-click JSON export.
> FocusFlow AI proves that an all-in-one, multi-modal educational companion can be private, lightweight, and ready for Snapdragon Copilot+ PCs today."*

---

## Contingency & Backup Plan (If Live Demo Environment Glitches)

| Failure Scenario | Immediate Backup Action | What to Explain to Judges |
| :--- | :--- | :--- |
| **Webcam Permission Denied / Camera Unavailable** | Click the **"Demo Mode"** toggle in the top-right header | *"In environments without webcam hardware, FocusFlow includes a high-fidelity simulation mode to evaluate the state machine and HUD overlay."* |
| **Microphone Muted / Audio Driver Error** | Type the prompt directly into the input dock or click one of the 4 suggested questions | *"Audio capture can fall back to typed query input while maintaining the exact same local LLM inference pipeline."* |
| **Ollama Daemon Port Conflict** | Show the truthful error banner or switch to Demo Mode | Point out that FocusFlow's Section 21 Model Safety envelope gracefully catches uninitialized runtimes with HTTP 503 rather than crashing. |
| **Slow Projector Display** | Use Chrome zoom (`Ctrl + -` or `Ctrl + +`) | The layout is fully responsive and adjusts fluidly between compact and wide screens. |
