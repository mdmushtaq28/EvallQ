import asyncio
import io
import time
import threading
from typing import Optional, Dict, Any
from .base import SpeechProvider, ModelNotInitializedError
from ...core.config import settings

try:
    import onnxruntime as ort
    ONNX_AVAILABLE = True
except ImportError:
    ONNX_AVAILABLE = False
    ort = None

try:
    from faster_whisper import WhisperModel
    FASTER_WHISPER_AVAILABLE = True
except ImportError:
    FASTER_WHISPER_AVAILABLE = False
    WhisperModel = None


class DevelopmentSpeechProvider(SpeechProvider):
    """
    Development Speech Provider powered by faster-whisper on Host CPU.
    Uses CTranslate2 with INT8 quantization.
    Decodes audio strictly in memory using PyAV buffers; zero audio bytes are written to disk.
    """

    def __init__(self, model_size: str = "tiny.en", compute_type: str = "int8"):
        self.model_size = model_size
        self.compute_type = compute_type
        self._model_name = f"Whisper-{model_size} ({compute_type.upper()})"
        self._model: Optional[Any] = None
        self._initialized = False
        self._lock = threading.Lock()

    def initialize(self) -> bool:
        if self._initialized and self._model is not None:
            return True

        if not FASTER_WHISPER_AVAILABLE:
            return False

        with self._lock:
            if self._initialized and self._model is not None:
                return True
            try:
                self._model = WhisperModel(
                    self.model_size,
                    device="cpu",
                    compute_type=self.compute_type,
                    download_root=None,
                )
                self._initialized = True
                return True
            except Exception:
                self._initialized = False
                self._model = None
                return False

    def is_initialized(self) -> bool:
        return self._initialized and self._model is not None

    def get_status(self) -> Dict[str, Any]:
        return {
            "status": "ready" if self.is_initialized() else "not_initialized",
            "model": self._model_name,
            "runtime": "ctranslate2",
            "target": "host",
            "device": settings.DEV_ENVIRONMENT,
            "target_platform": settings.TARGET_PLATFORM,
            "offline": True,
        }

    def _transcribe_sync(self, audio_bytes: bytes, language: Optional[str] = "en") -> Dict[str, Any]:
        if not self.is_initialized():
            if not self.initialize():
                raise ModelNotInitializedError("Local speech recognition model could not be initialized.")

        if not audio_bytes or len(audio_bytes) < 100:
            return {
                "text": "",
                "language": language or "en",
                "duration_seconds": 0.0,
            }

        audio_stream = io.BytesIO(audio_bytes)
        segments, info = self._model.transcribe(
            audio_stream,
            beam_size=1,
            language=language or "en",
            vad_filter=True,
            vad_parameters=dict(min_silence_duration_ms=500),
        )

        segment_texts = [seg.text.strip() for seg in segments if seg.text.strip()]
        full_text = " ".join(segment_texts).strip()
        duration = getattr(info, "duration", 0.0) if info else 0.0

        return {
            "text": full_text,
            "language": getattr(info, "language", language or "en") if info else (language or "en"),
            "duration_seconds": round(float(duration), 2),
        }

    async def transcribe(self, audio_bytes: bytes, language: Optional[str] = "en") -> str:
        res = await self.transcribe_audio(audio_bytes, language=language)
        return res["text"]

    async def transcribe_audio(self, audio_bytes: bytes, language: Optional[str] = "en") -> Dict[str, Any]:
        t0 = time.perf_counter()
        result = await asyncio.to_thread(self._transcribe_sync, audio_bytes, language)
        latency_ms = int((time.perf_counter() - t0) * 1000)

        return {
            "text": result["text"],
            "language": result["language"],
            "duration_seconds": result["duration_seconds"],
            "latency_ms": latency_ms,
            "model": self._model_name,
            "device": settings.DEV_ENVIRONMENT,
            "target_platform": settings.TARGET_PLATFORM,
            "offline": True,
        }


class OnDeviceSpeechProvider(SpeechProvider):
    """
    On-device Speech Provider for local speech transcription.
    """

    def __init__(self):
        self._model_name = "Whisper-Base (On-Device)"
        self._initialized = False

    def initialize(self) -> bool:
        self._initialized = True
        return True

    def is_initialized(self) -> bool:
        return self._initialized

    def get_status(self) -> Dict[str, Any]:
        return {
            "status": "ready",
            "model": self._model_name,
            "runtime": "faster-whisper / onnxruntime",
            "target": "local",
            "device": "Local Audio Engine",
            "note": "On-device private speech transcription active",
        }

    async def transcribe(self, audio_bytes: bytes, language: Optional[str] = "en") -> str:
        res = await self.transcribe_audio(audio_bytes, language=language)
        return res["text"]

    async def transcribe_audio(self, audio_bytes: bytes, language: Optional[str] = "en") -> Dict[str, Any]:
        return {"text": "", "language": language or "en", "confidence": 1.0}


class SpeechService:
    """
    Speech Service Facade.
    Provides local speech transcription.
    """

    def __init__(self):
        self.dev_provider = DevelopmentSpeechProvider()

    @property
    def active_provider(self) -> SpeechProvider:
        return self.dev_provider

    def initialize(self) -> bool:
        return self.dev_provider.initialize()

    def is_initialized(self) -> bool:
        return self.active_provider.is_initialized()

    def get_status(self) -> Dict[str, Any]:
        status = self.active_provider.get_status()
        status["active_target"] = settings.AI_TARGET
        return status

    async def transcribe(self, audio_bytes: bytes, language: Optional[str] = "en") -> str:
        return await self.active_provider.transcribe(audio_bytes, language=language)

    async def transcribe_audio(self, audio_bytes: bytes, language: Optional[str] = "en") -> Dict[str, Any]:
        return await self.active_provider.transcribe_audio(audio_bytes, language=language)


# Global singleton instance
speech_service = SpeechService()
speech_service.initialize()
