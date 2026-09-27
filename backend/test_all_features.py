import io
import wave
import struct
import time
from PIL import Image
import pymupdf
from fastapi.testclient import TestClient
from app.main import app
from app.database.connection import init_db

init_db()

with TestClient(app) as client:
    print("==================================================")
    print("FOCUSFLOW AI -- COMPREHENSIVE 11-SUBSYSTEM TEST")
    print("==================================================")

    # 1. Model Status & Truthful Reporting
    print("\n[1/11] Subsystem 1: Model Status & Snapdragon Truthful Reporting")
    res = client.get("/api/model/status")
    assert res.status_code == 200, f"Model status failed: {res.text}"
    status_data = res.json()
    assert status_data["runtime"]["environment"] == "host"
    assert status_data["snapdragon"]["device"] == "Snapdragon X Series"
    assert status_data["snapdragon"]["validated"] is False
    assert status_data["snapdragon"]["qnn_available"] is False
    assert status_data["snapdragon"]["optimization_status"] == "TARGET IDENTIFIED"
    assert status_data["embeddings"]["status"] == "ready"
    assert status_data["speech"]["status"] == "ready"
    assert status_data["vision"]["status"] == "ready"
    print("  [PASS] Model status verified truthfully. Target: Snapdragon X Series, Validated: False.")

    # 2. Speech Transcription (Whisper-tiny.en INT8)
    print("\n[2/11] Subsystem 2: Speech Transcription (Whisper-tiny.en INT8)")
    wav_buf = io.BytesIO()
    with wave.open(wav_buf, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(16000)
        wf.writeframes(struct.pack("<" + ("h" * 16000), *([0] * 16000)))
    wav_bytes = wav_buf.getvalue()

    res_speech = client.post(
        "/api/speech/transcribe",
        files={"file": ("test.wav", wav_bytes, "audio/wav")},
        data={"language": "en"}
    )
    assert res_speech.status_code == 200, f"Speech failed: {res_speech.text}"
    speech_data = res_speech.json()
    print(f"  [PASS] Speech transcription succeeded in {speech_data['latency_ms']}ms via {speech_data['model']}.")

    # 3. Focus Mode Vision (UltraFace-320 ONNX)
    print("\n[3/11] Subsystem 3: Focus Mode Vision (UltraFace-320 ONNX)")
    start_res = client.post("/api/focus/start")
    assert start_res.status_code == 200, f"Focus start failed: {start_res.text}"

    # Generate test frame
    img = Image.new("RGB", (320, 240), color=(120, 120, 120))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    frame_bytes = buf.getvalue()

    frame_res = client.post(
        "/api/focus/frame",
        files={"file": ("frame.jpg", frame_bytes, "image/jpeg")}
    )
    assert frame_res.status_code == 200, f"Frame failed: {frame_res.text}"
    frame_data = frame_res.json()
    assert "present" in frame_data
    assert "screen_facing" in frame_data

    stop_res = client.post("/api/focus/stop")
    assert stop_res.status_code == 200, f"Focus stop failed: {stop_res.text}"
    stop_data = stop_res.json()
    print(f"  [PASS] Focus session completed. Score: {stop_data['focus_score']}%. Frame latency: {frame_data['inference_latency_ms']}ms.")

    # 4. Local LLM Chat (Qwen 2.5 0.5B)
    print("\n[4/11] Subsystem 4: Local LLM Chat (Qwen 2.5 0.5B via Ollama)")
    chat_payload = {
        "message": "Explain binary search in one concise sentence.",
        "conversation": []
    }
    chat_res = client.post("/api/chat", json=chat_payload)
    assert chat_res.status_code == 200, f"Chat failed: {chat_res.text}"
    chat_data = chat_res.json()
    print(f"  [PASS] AI Tutor reply received in {chat_data['latency_ms']}ms ({chat_data.get('tokens_per_second')} tok/s).")
    print(f"    Reply: {chat_data['reply'][:80]}...")

    # 5. Document Upload & Ingestion (PyMuPDF + Chunking + FastEmbed)
    print("\n[5/11] Subsystem 5: Document Upload & Ingestion (PyMuPDF + FastEmbed BGE-small)")
    test_pdf_doc = pymupdf.open()
    page1 = test_pdf_doc.new_page()
    page1.insert_text((50, 70), """
    Computer Science: Distributed Systems Principles
    Lecture 1: Consensus and Fault Tolerance

    1. Distributed Consensus
    Consensus is the process of agreeing on a single data value among distributed processes.
    In asynchronous distributed systems with crash-stop failures, the FLP impossibility theorem
    states that no deterministic consensus protocol can guarantee both safety and liveness.

    2. Paxos and Raft Protocols
    Practical distributed systems implement quorum-based protocols like Paxos or Raft.
    Raft decomposes consensus into leader election, log replication, and safety guarantees.
    Leaders append log entries to follower states using heartbeats to maintain cluster quorum.
    """, fontsize=11)

    page2 = test_pdf_doc.new_page()
    page2.insert_text((50, 70), """
    Lecture 2: CAP Theorem and Consistency Models

    1. The CAP Theorem
    Formulated by Eric Brewer, CAP states that any distributed data store can simultaneously
    provide at most two out of the following three guarantees:
    - Consistency: Every read receives the most recent write or an error.
    - Availability: Every request receives a non-error response without guarantee of latest data.
    - Partition Tolerance: The system continues to operate despite arbitrary message drops.

    2. Eventual Consistency
    Modern globally distributed databases like DynamoDB choose AP (Availability and Partition Tolerance),
    relying on monotonic read consistency and vector clocks to resolve concurrent conflicting writes.
    """, fontsize=11)

    pdf_bytes = test_pdf_doc.tobytes()
    test_pdf_doc.close()

    upload_res = client.post(
        "/api/documents/upload",
        files={"file": ("Distributed_Systems_Lecture.pdf", pdf_bytes, "application/pdf")}
    )
    assert upload_res.status_code == 201, f"Document upload failed: {upload_res.text}"
    uploaded_doc = upload_res.json()
    doc_id = uploaded_doc["id"]
    print(f"  [PASS] Document uploaded and indexed: {uploaded_doc['filename']} (ID: {doc_id}). Chunks: {uploaded_doc['chunk_count']}.")

    # 6. RAG Document Q&A
    print("\n[6/11] Subsystem 6: Grounded RAG Document Q&A")
    qa_res = client.post(
        f"/api/documents/{doc_id}/qa",
        json={"question": "What is the CAP theorem?", "top_k": 2}
    )
    assert qa_res.status_code == 200, f"Doc QA failed: {qa_res.text}"
    qa_data = qa_res.json()
    assert len(qa_data.get("sources", [])) > 0, "No citations returned for Q&A"
    print(f"  [PASS] Grounded Q&A answered with {len(qa_data['sources'])} chunk citations in {qa_data['latency_ms']}ms.")
    print(f"    Reply snippet: {qa_data['reply'][:90]}...")

    # 7. Document Executive Summary
    print("\n[7/11] Subsystem 7: Document Executive Summary & Key Takeaways")
    sum_res = client.post(f"/api/documents/{doc_id}/summarize")
    assert sum_res.status_code == 200, f"Summarize failed: {sum_res.text}"
    sum_data = sum_res.json()
    assert len(sum_data.get("summary", "")) > 10, "Summary is empty"
    print(f"  [PASS] Summary generated: {len(sum_data['summary'])} chars, {len(sum_data.get('key_takeaways', []))} takeaways in {sum_data['latency_ms']}ms.")

    # 8. Document Comprehension Quiz
    print("\n[8/11] Subsystem 8: Grounded Comprehension Quiz Synthesis & Anti-Duplication Validation")
    quiz_res = client.post(f"/api/documents/{doc_id}/quiz")
    assert quiz_res.status_code == 200, f"Quiz generation failed: {quiz_res.text}"
    quiz_data = quiz_res.json()
    questions = quiz_data.get("questions", [])
    assert len(questions) >= 3, f"Expected at least 3 quiz questions, got {len(questions)}"
    
    seen_question_texts = set()
    for q_i, q in enumerate(questions):
        q_text = q.get("question", "").strip()
        assert len(q_text) >= 8, f"Question {q_i+1} text too short: '{q_text}'"
        assert q_text.lower() not in seen_question_texts, f"Duplicate question text: '{q_text}'"
        seen_question_texts.add(q_text.lower())

        options = q.get("options", [])
        assert len(options) == 4, f"Question {q_i+1} must have exactly 4 options, got {len(options)}: {options}"
        
        # Strict case-insensitive uniqueness check
        normalized_options = [opt.strip().lower() for opt in options]
        assert len(set(normalized_options)) == 4, f"Question {q_i+1} has duplicate options: {options}"
        
        # Verify no placeholder text
        for opt in options:
            assert len(opt.strip()) > 0, f"Question {q_i+1} contains empty option"
            assert "<choice" not in opt.lower() and "<option" not in opt.lower(), f"Placeholder option: '{opt}'"

        correct_idx = q.get("correctIndex")
        assert isinstance(correct_idx, int) and 0 <= correct_idx < 4, f"Question {q_i+1} invalid correctIndex: {correct_idx}"
        
        if q.get("correct_answer"):
            assert q["options"][correct_idx].strip().lower() == q["correct_answer"].strip().lower(), (
                f"Question {q_i+1} correctIndex points to '{options[correct_idx]}' but correct_answer is '{q['correct_answer']}'"
            )

    print(f"  [PASS] Quiz synthesized with {len(questions)} validated questions in {quiz_data['latency_ms']}ms.")
    print(f"  [PASS] Verified: Exactly 4 options per question, case-insensitive uniqueness, valid correctIndex.")
    print(f"    Sample question: {questions[0]['question']}")

    # 9. Active-Recall Flashcards
    print("\n[9/11] Subsystem 9: Active-Recall Concept Flashcards")
    fc_res = client.post(f"/api/documents/{doc_id}/flashcards")
    assert fc_res.status_code == 200, f"Flashcards failed: {fc_res.text}"
    fc_data = fc_res.json()
    cards = fc_data.get("flashcards", [])
    assert len(cards) > 0, "No flashcards generated"
    print(f"  [PASS] Flashcards synthesized with {len(cards)} study cards in {fc_data['latency_ms']}ms.")
    print(f"    Sample card: Front: '{cards[0]['front']}' -> Back: '{cards[0]['back'][:50]}...'")

    # 10. Analytics & Performance Aggregations
    print("\n[10/11] Subsystem 10: Study Analytics Aggregations")
    ov_res = client.get("/api/analytics/overview")
    assert ov_res.status_code == 200, f"Overview failed: {ov_res.text}"
    ov_data = ov_res.json()
    print(f"  [PASS] Overview: {ov_data['total_sessions_count']} sessions, {ov_data['documents_analyzed']} docs, {ov_data['ai_questions_answered']} questions.")

    trends_res = client.get("/api/analytics/trends")
    assert trends_res.status_code == 200, f"Trends failed: {trends_res.text}"
    trends_data = trends_res.json()
    print(f"  [PASS] Trends: {len(trends_data['weekly_data'])} weekly days, {len(trends_data['session_scores'])} scores.")

    # 11. Local Data Export Download
    print("\n[11/11] Subsystem 11: Local Data Export Download")
    export_res = client.get("/api/analytics/export/download")
    assert export_res.status_code == 200, f"Export failed: {export_res.text}"
    assert "attachment" in export_res.headers.get("content-disposition", "")
    assert len(export_res.content) > 1000
    print(f"  [PASS] Export download succeeded: {len(export_res.content)} bytes of self-contained JSON.")

    print("\n==================================================")
    print("ALL 11 SUBSYSTEM VERIFICATIONS PASSED!")
    print("==================================================")
