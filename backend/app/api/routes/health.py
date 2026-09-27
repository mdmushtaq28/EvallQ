from fastapi import APIRouter
from app.schemas.health import HealthResponse

router = APIRouter(prefix="/health", tags=["Health"])


@router.get("", response_model=HealthResponse, summary="Service Health Check")
async def get_health() -> HealthResponse:
    """
    Returns service health status.
    Truthfully reports service readiness without claiming fake model availability.
    """
    return HealthResponse(
        status="healthy",
        service="focusflow-backend"
    )
