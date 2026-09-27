from fastapi import APIRouter
from app.schemas.model import (
    ModelStatusResponse,
    RuntimeStatus,
    ComponentStatus,
    SnapdragonTargetStatus,
    TargetStatus,
)
from app.services.ai.local_llm import get_active_llm_provider
from app.services.ai.speech import speech_service
from app.services.ai.vision import vision_service
from app.services.documents.embeddings import embedding_service
from app.core.config import settings

try:
    import onnxruntime as ort
    QNN_AVAILABLE = "QNNExecutionProvider" in ort.get_available_providers()
except Exception:
    QNN_AVAILABLE = False

router = APIRouter(prefix="/model", tags=["Model"])


@router.get("/status", response_model=ModelStatusResponse, summary="Get Local Model Runtime Status")
async def get_model_status() -> ModelStatusResponse:
    """
    Returns truthful status of on-device AI runtimes, host models, and Snapdragon target architecture.
    Accurately distinguishes between Current Development (Host CPU / x86_64) and Snapdragon Target.
    Never reports NPU active or Snapdragon validated unless actual execution on hardware occurred.
    """
    llm_provider = get_active_llm_provider()
    if hasattr(llm_provider, "check_runtime_health"):
        await llm_provider.check_runtime_health()

    llm_status = llm_provider.get_status()
    speech_status = speech_service.get_status()
    vision_status = vision_service.get_status()
    embedding_status = embedding_service.get_status()

    is_any_initialized = (
        llm_provider.is_initialized()
        or speech_service.is_initialized()
        or vision_service.is_initialized()
    )

    return ModelStatusResponse(
        runtime=RuntimeStatus(
            status="ready" if is_any_initialized else "not_initialized",
            provider="ollama" if llm_provider.is_initialized() else "local",
            environment="host",
            ai_target=settings.AI_TARGET,
        ),
        llm=ComponentStatus(
            status=llm_status["status"],
            model=llm_status["model"],
            runtime="ollama",
            target="host",
        ),
        speech=ComponentStatus(
            status=speech_status["status"],
            model=speech_status["model"],
            runtime=speech_status.get("runtime"),
            target=speech_status.get("target", "host"),
        ),
        vision=ComponentStatus(
            status=vision_status["status"],
            model=vision_status["model"],
            runtime=vision_status.get("runtime"),
            target="host",
        ),
        embeddings=ComponentStatus(
            status=embedding_status["status"],
            model=embedding_status["model"],
            runtime=embedding_status.get("runtime"),
            target="host",
        ),
        snapdragon=SnapdragonTargetStatus(
            status="target",
            device=settings.SNAPDRAGON_DEVICE,
            runtime=settings.SNAPDRAGON_NPU_RUNTIME,
            validated=settings.SNAPDRAGON_VALIDATED,
            qnn_available=QNN_AVAILABLE,
            optimization_status="TARGET IDENTIFIED",
        ),
        target=TargetStatus(
            platform=settings.TARGET_PLATFORM,
            development_environment=settings.DEV_ENVIRONMENT,
        ),
    )
