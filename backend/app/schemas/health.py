from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str = "healthy"
    service: str = "evallq-backend"
