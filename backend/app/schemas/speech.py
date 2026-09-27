from pydantic import BaseModel, Field


class SpeechTranscribeResponse(BaseModel):
    """
    Response schema for on-device speech transcription.
    Reflects local Whisper INT8 execution metrics.
    """
    text: str = Field(..., description="Transcribed student speech text")
    language: str = Field(default="en", description="Detected or provided language code")
    duration_seconds: float = Field(default=0.0, description="Audio length in seconds")
    latency_ms: int = Field(..., description="Local inference latency in milliseconds")
    model: str = Field(..., description="Active speech model identifier")
    device: str = Field(..., description="Hardware device used for transcription")
    target_platform: str = Field(..., description="Target platform architecture")
    offline: bool = Field(default=True, description="Always True for local on-device inference")
