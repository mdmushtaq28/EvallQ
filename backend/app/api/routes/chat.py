from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.orm import Session
from ...database.connection import get_db
from ...schemas.chat import ChatRequest, ChatResponse
from ...services.ai.local_llm import get_active_llm_provider
from ...services.ai.base import ModelNotInitializedError
from ...services.analytics.service import analytics_service
from ...core.config import settings

router = APIRouter()


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest, db: Session = Depends(get_db)):
    """
    On-device AI Tutor chat endpoint.
    Performs real local inference using the active local LLM provider.
    Rejects cloud fallbacks and returns HTTP 503 if the local engine is not ready.
    """
    raw_message = request.message.strip() if request.message else ""
    if not raw_message:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Student question cannot be empty or whitespace."
        )

    if len(raw_message) > 2000:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Question exceeds maximum allowed length of 2000 characters."
        )

    provider = get_active_llm_provider()

    # Convert conversation list to dictionaries
    history = [
        {"role": item.role, "content": item.content}
        for item in request.conversation
    ]
    # Append the current student prompt as the final turn
    history.append({"role": "user", "content": raw_message})

    try:
        result = await provider.generate_chat(messages=history)
        analytics_service.log_interaction(
            db=db,
            interaction_type="chat_query",
            latency_ms=result.get("latency_ms")
        )
        return ChatResponse(
            reply=result["reply"],
            model=result["model"],
            provider=result["provider"],
            device=result["device"],
            latency_ms=result["latency_ms"],
            tokens_per_second=result.get("tokens_per_second"),
            offline=result.get("offline", True),
        )
    except ModelNotInitializedError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "error": "MODEL_NOT_INITIALIZED",
                "message": str(e),
                "model": getattr(provider, "model_name", "unknown"),
                "device": getattr(provider, "device", settings.DEV_ENVIRONMENT),
                "target_platform": settings.TARGET_PLATFORM,
                "offline": True,
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Local inference failure: {str(e)}"
        )
