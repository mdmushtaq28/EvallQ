from fastapi import APIRouter, UploadFile, File, Form, HTTPException, status
from typing import Optional
from ...schemas.speech import SpeechTranscribeResponse
from ...services.ai.speech import speech_service
from ...services.ai.base import ModelNotInitializedError

router = APIRouter(prefix="/speech", tags=["Speech"])


@router.post("/transcribe", response_model=SpeechTranscribeResponse, summary="Transcribe speech audio locally")
async def transcribe_audio(
    file: UploadFile = File(...),
    language: Optional[str] = Form(default="en"),
) -> SpeechTranscribeResponse:
    """
    On-device speech-to-text transcription powered by faster-whisper (tiny.en INT8).
    Processes audio completely in memory. Zero audio bytes are saved to disk or transmitted to the cloud.
    """
    if not speech_service.is_initialized():
        initialized = speech_service.initialize()
        if not initialized:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Local speech recognition model is not initialized."
            )

    try:
        audio_bytes = await file.read()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to read audio payload: {str(e)}"
        )

    if not audio_bytes or len(audio_bytes) < 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Audio payload is too short or empty."
        )

    try:
        result = await speech_service.transcribe_audio(audio_bytes, language=language)
        return SpeechTranscribeResponse(**result)
    except ModelNotInitializedError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Speech transcription failed: {str(e)}"
        )
