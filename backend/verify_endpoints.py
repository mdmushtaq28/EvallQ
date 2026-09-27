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
    print("FOCUSFLOW AI -- API ENDPOINT VERIFICATION MATRIX")
    print("==================================================")

    endpoints = []

    def check(method, path, status_expected, **kwargs):
        t0 = time.time()
        func = getattr(client, method.lower())
        res = func(path, **kwargs)
        duration_ms = round((time.time() - t0) * 1000, 2)
        passed = (res.status_code == status_expected)
        endpoints.append({
            "method": method,
            "path": path,
            "status_code": res.status_code,
            "expected": status_expected,
            "duration_ms": duration_ms,
            "passed": passed
        })
        status_str = "[PASS]" if passed else "[FAIL]"
        print(f"{status_str} {method:5} {path:<40} -> HTTP {res.status_code} ({duration_ms} ms)")
        return res

    # 1. Health
    check("GET", "/api/health", 200)

    # 2. Model Status
    check("GET", "/api/model/status", 200)

    # 3. Chat / LLM
    check("POST", "/api/chat", 200, json={
        "message": "Hello, explain atomic operations briefly.",
        "conversation": []
    })

    # 4. Speech Transcribe
    wav_buf = io.BytesIO()
    with wave.open(wav_buf, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(16000)
        wf.writeframes(struct.pack("<" + ("h" * 16000), *([0] * 16000)))
    check("POST", "/api/speech/transcribe", 200,
          files={"file": ("test.wav", wav_buf.getvalue(), "audio/wav")},
          data={"language": "en"})

    # 5. Focus Start
    check("POST", "/api/focus/start", 200)

    # 6. Focus Frame
    img = Image.new("RGB", (320, 240), color=(100, 100, 100))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    check("POST", "/api/focus/frame", 200,
          files={"file": ("frame.jpg", buf.getvalue(), "image/jpeg")})

    # 7. Focus Stop
    check("POST", "/api/focus/stop", 200)

    # 8. Document Upload
    doc_pdf = pymupdf.open()
    p = doc_pdf.new_page()
    p.insert_text((50, 70), "Memory Hierarchy and Cache Coherence in Multicore Architectures.", fontsize=11)
    p.insert_text((50, 100), "MESI protocol maintains cache coherence with Modified, Exclusive, Shared, Invalid states.", fontsize=11)
    pdf_bytes = doc_pdf.tobytes()
    doc_pdf.close()

    upload_res = check("POST", "/api/documents/upload", 201,
                       files={"file": ("Cache_Coherence.pdf", pdf_bytes, "application/pdf")})
    doc_id = upload_res.json()["id"]

    # 9. List Documents
    check("GET", "/api/documents", 200)

    # 10. Get Document
    check("GET", f"/api/documents/{doc_id}", 200)

    # 11. Document Q&A
    check("POST", f"/api/documents/{doc_id}/qa", 200, json={
        "question": "What is MESI protocol?",
        "top_k": 2
    })

    # 12. Document Summarize
    check("POST", f"/api/documents/{doc_id}/summarize", 200)

    # 13. Document Quiz
    check("POST", f"/api/documents/{doc_id}/quiz", 200)

    # 14. Document Flashcards
    check("POST", f"/api/documents/{doc_id}/flashcards", 200)

    # 15. Analytics Overview
    check("GET", "/api/analytics/overview", 200)

    # 16. Analytics Trends
    check("GET", "/api/analytics/trends", 200)

    # 17. Analytics Export Download
    check("GET", "/api/analytics/export/download", 200)

    print("\n==================================================")
    total_passed = sum(1 for e in endpoints if e["passed"])
    print(f"VERIFICATION SUMMARY: {total_passed}/{len(endpoints)} ENDPOINTS PASSED.")
    print("==================================================")
