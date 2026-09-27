from abc import ABC, abstractmethod
from typing import AsyncGenerator, Optional, Dict, Any


class ModelNotInitializedError(Exception):
    """
    Raised when an AI service operation is requested prior to local model loading.
    Controlled exception that produces an HTTP 503 rather than fake fallback responses.
    """
    def __init__(self, message: str = "The local AI model has not been initialized."):
        self.message = message
        super().__init__(self.message)


class AIProvider(ABC):
    """
    Base abstract provider for on-device AI runtimes.
    Designed for pluggable local execution (Host CPU, DirectML GPU, Snapdragon NPU via QNN).
    """

    @abstractmethod
    def is_initialized(self) -> bool:
        """Returns True if local model weights and execution runtime are active."""
        pass

    @abstractmethod
    def get_status(self) -> Dict[str, Any]:
        """Returns runtime and component telemetry."""
        pass


class LocalLLMProvider(AIProvider):
    """
    Abstract interface for local language models (e.g., Llama-3.2, Phi-3.5, Mistral).
    """

    @abstractmethod
    async def generate(self, prompt: str, system_prompt: Optional[str] = None, max_tokens: int = 512) -> str:
        """Generates a complete response for the given prompt."""
        pass

    @abstractmethod
    async def generate_chat(
        self,
        messages: list,
        system_prompt: Optional[str] = None,
        max_tokens: int = 512,
        **kwargs: Any
    ) -> Dict[str, Any]:
        """Generates a chat completion given conversation history on-device."""
        pass

    @abstractmethod
    async def stream(self, prompt: str, system_prompt: Optional[str] = None) -> AsyncGenerator[str, None]:
        """Streams response tokens as they are decoded locally."""
        pass


class SpeechProvider(AIProvider):
    """
    Abstract interface for local automatic speech recognition (e.g., Whisper-Base/Tiny).
    """

    @abstractmethod
    async def transcribe(self, audio_bytes: bytes, language: Optional[str] = "en") -> str:
        """Transcribes PCM audio buffer into text on-device."""
        pass


class VisionProvider(AIProvider):
    """
    Abstract interface for local observable attention and presence detection.
    """

    @abstractmethod
    async def detect_attention(self, frame_bytes: bytes) -> Dict[str, Any]:
        """
        Analyzes a single camera frame in memory for observable presence.
        Returns presence state ('FOCUSED', 'AWAY', 'NOT_DETECTED') and orientation signals.
        """
        pass
