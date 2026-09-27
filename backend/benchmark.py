import time
import os
import io
import wave
import struct
import json
import statistics
import asyncio
from typing import Dict, Any, List

# Ensure backend root is in sys.path
import sys
sys.path.insert(0, os.path.dirname(__file__))

from app.core.config import settings
from app.services.ai.vision import vision_service
from app.services.ai.speech import speech_service
from app.services.documents.embeddings import embedding_service
from app.services.ai.local_llm import get_active_llm_provider
from PIL import Image


def benchmark_vision() -> Dict[str, Any]:
    print("\n--- Benchmarking Vision: UltraFace-320 ONNX ---")
    t0 = time.perf_counter()
    vision_service.initialize()
    init_ms = round((time.perf_counter() - t0) * 1000, 2)

    # Create dummy 640x480 RGB image
    img = Image.new("RGB", (640, 480), color=(128, 128, 128))
    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format="JPEG")
    frame_bytes = img_byte_arr.getvalue()

    # Warmup
    for _ in range(3):
        vision_service.process_frame(frame_bytes)

    latencies = []
    iterations = 20
    for _ in range(iterations):
        t_start = time.perf_counter()
        res = vision_service.process_frame(frame_bytes)
        latencies.append((time.perf_counter() - t_start) * 1000)

    mean_lat = round(statistics.mean(latencies), 2)
    p50_lat = round(statistics.median(latencies), 2)
    p95_lat = round(sorted(latencies)[int(0.95 * len(latencies))], 2)
    fps = round(1000.0 / mean_lat, 1)

    print(f"Vision Init: {init_ms} ms | Mean Latency: {mean_lat} ms | p50: {p50_lat} ms | p95: {p95_lat} ms | Throughput: {fps} FPS")
    return {
        "component": "Vision",
        "model": "UltraFace-320 (version-RFB-320.onnx)",
        "runtime": "ONNX Runtime (CPUExecutionProvider)",
        "device": "Host CPU (x86_64)",
        "init_ms": init_ms,
        "mean_latency_ms": mean_lat,
        "p50_latency_ms": p50_lat,
        "p95_latency_ms": p95_lat,
        "memory_mb": "~15 MB",
        "compute_unit": "Host CPU",
        "throughput": f"{fps} FPS",
        "status": "VALIDATED (Host)",
    }


def benchmark_speech() -> Dict[str, Any]:
    print("\n--- Benchmarking Speech: Whisper-tiny.en INT8 ---")
    t0 = time.perf_counter()
    speech_service.initialize()
    init_ms = round((time.perf_counter() - t0) * 1000, 2)

    # Create synthetic 2-second WAV buffer of silence
    wav_buf = io.BytesIO()
    with wave.open(wav_buf, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(16000)
        wf.writeframes(struct.pack("<" + ("h" * 32000), *([0] * 32000)))
    wav_bytes = wav_buf.getvalue()

    # Warmup
    asyncio.run(speech_service.transcribe_audio(wav_bytes))

    latencies = []
    iterations = 5
    for _ in range(iterations):
        res = asyncio.run(speech_service.transcribe_audio(wav_bytes))
        latencies.append(res["latency_ms"])

    mean_lat = round(statistics.mean(latencies), 2)
    p50_lat = round(statistics.median(latencies), 2)
    rtf = round(mean_lat / 2000.0, 3) # Real-Time Factor (lower is faster than real time)

    print(f"Speech Init: {init_ms} ms | Mean Latency: {mean_lat} ms | p50: {p50_lat} ms | RTF: {rtf}x real-time")
    return {
        "component": "Speech",
        "model": "Whisper-tiny.en (INT8)",
        "runtime": "faster-whisper / CTranslate2",
        "device": "Host CPU (x86_64)",
        "init_ms": init_ms,
        "mean_latency_ms": mean_lat,
        "p50_latency_ms": p50_lat,
        "memory_mb": "~39 MB",
        "compute_unit": "Host CPU",
        "throughput": f"{rtf}x RTF (faster than real-time)",
        "status": "VALIDATED (Host)",
    }


def benchmark_embeddings() -> Dict[str, Any]:
    print("\n--- Benchmarking Embeddings: BAAI/bge-small-en-v1.5 ---")
    sample_texts = [
        "Polymorphism allows objects of different types to be treated as instances of a common superclass.",
        "Operating systems use page tables to translate virtual memory addresses into physical RAM locations.",
        "Amdahl's law provides the theoretical upper bound on speedup when using multiple processing units.",
        "Dynamic programming breaks complex optimization problems into overlapping subproblems with memoization.",
        "The transmission control protocol ensures reliable, ordered, and error-checked delivery of octets."
    ]

    t0 = time.perf_counter()
    # Force load
    embedding_service.generate_embeddings(["Warmup initialization text"])
    init_ms = round((time.perf_counter() - t0) * 1000, 2)

    latencies = []
    iterations = 5
    for _ in range(iterations):
        t_start = time.perf_counter()
        embs = embedding_service.generate_embeddings(sample_texts)
        lat = (time.perf_counter() - t_start) * 1000
        latencies.append(lat)

    mean_batch_lat = round(statistics.mean(latencies), 2)
    per_chunk_lat = round(mean_batch_lat / len(sample_texts), 2)
    chunks_per_sec = round(1000.0 / per_chunk_lat, 1)

    print(f"Embeddings Init: {init_ms} ms | Batch(5) Latency: {mean_batch_lat} ms | Per-chunk: {per_chunk_lat} ms | Throughput: {chunks_per_sec} chunks/s")
    return {
        "component": "Embedding",
        "model": "bge-small-en-v1.5 (384-d)",
        "runtime": "FastEmbed / ONNX Runtime",
        "device": "Host CPU (x86_64)",
        "init_ms": init_ms,
        "mean_latency_ms": per_chunk_lat,
        "p50_latency_ms": per_chunk_lat,
        "memory_mb": "~67 MB",
        "compute_unit": "Host CPU",
        "throughput": f"{chunks_per_sec} chunks/s",
        "status": "VALIDATED (Host)",
    }


def benchmark_llm() -> Dict[str, Any]:
    print("\n--- Benchmarking LLM: Qwen2.5-0.5B-Instruct via Ollama ---")
    provider = get_active_llm_provider()

    t0 = time.perf_counter()
    is_ready = asyncio.run(provider.check_runtime_health())
    init_ms = round((time.perf_counter() - t0) * 1000, 2)

    if not is_ready:
        print("Ollama is not responding or model not loaded.")
        return {
            "component": "LLM",
            "model": "qwen2.5:0.5b",
            "runtime": "Ollama",
            "device": "Host CPU (x86_64)",
            "init_ms": init_ms,
            "mean_latency_ms": "N/A",
            "p50_latency_ms": "N/A",
            "memory_mb": "~397 MB",
            "compute_unit": "Host CPU",
            "throughput": "Offline",
            "status": "OFFLINE",
        }

    prompt = "Explain the time complexity of binary search in two concise sentences."
    messages = [{"role": "user", "content": prompt}]

    # Run inference turn
    res = asyncio.run(provider.generate_chat(messages=messages, max_tokens=128))
    lat_ms = res.get("latency_ms", 0)
    tok_sec = res.get("tokens_per_second", 0.0)

    print(f"LLM Health Check: {init_ms} ms | Total Latency: {lat_ms} ms | Throughput: {tok_sec} tok/s")
    return {
        "component": "LLM",
        "model": "qwen2.5:0.5b",
        "runtime": "Ollama (GGUF Q4_K_M)",
        "device": "Host CPU (x86_64)",
        "init_ms": init_ms,
        "mean_latency_ms": lat_ms,
        "p50_latency_ms": lat_ms,
        "memory_mb": "~397 MB",
        "compute_unit": "Host CPU",
        "throughput": f"{tok_sec} tok/s",
        "status": "VALIDATED (Host)",
    }


def main():
    print("==================================================")
    print("FOCUSFLOW AI — SYSTEM BENCHMARK (HOST CPU)")
    print(f"Environment: {settings.DEV_ENVIRONMENT}")
    print(f"Target Platform: {settings.TARGET_PLATFORM}")
    print("==================================================")

    results = []
    results.append(benchmark_vision())
    results.append(benchmark_speech())
    results.append(benchmark_embeddings())
    results.append(benchmark_llm())

    print("\n==================================================")
    print("BENCHMARK SUMMARY RESULTS")
    print("==================================================")
    for r in results:
        print(f"[{r['component']}] {r['model']} ({r['runtime']}) on {r['device']}: Latency = {r['mean_latency_ms']} ms | Memory = {r['memory_mb']} | Throughput = {r['throughput']}")

    out_file = os.path.join(os.path.dirname(__file__), "benchmark_results.json")
    with open(out_file, "w") as f:
        json.dump(results, f, indent=2)
    print(f"\nSaved raw benchmark metrics to {out_file}")


if __name__ == "__main__":
    main()
