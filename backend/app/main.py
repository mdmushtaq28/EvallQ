from contextlib import asynccontextmanager
from typing import AsyncGenerator
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.database.connection import init_db
from app.api.routes.health import router as health_router
from app.api.routes.model import router as model_router
from app.api.routes.chat import router as chat_router
from app.api.routes.documents import router as documents_router
from app.api.routes.focus import router as focus_router
from app.api.routes.speech import router as speech_router
from app.api.routes.analytics import router as analytics_router
from app.services.ai.base import ModelNotInitializedError


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    Lifespan events for startup and shutdown.
    Initializes SQLite database connection.
    """
    init_db()
    yield


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Private On-Device AI Study Companion Backend engineered for Snapdragon-powered PCs.",
    lifespan=lifespan,
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(ModelNotInitializedError)
async def model_not_initialized_handler(request: Request, exc: ModelNotInitializedError) -> JSONResponse:
    """
    Controlled handler for uninitialized local models.
    Returns HTTP 503 instead of exposing internal Python stack traces or fake fallback data.
    """
    return JSONResponse(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        content={
            "error": "MODEL_NOT_INITIALIZED",
            "message": exc.message,
        },
    )


# Root endpoint
@app.get("/", summary="Root Status Endpoint")
async def root() -> dict:
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
    }


# Include Routers under /api
app.include_router(health_router, prefix="/api")
app.include_router(model_router, prefix="/api")
app.include_router(chat_router, prefix="/api")
app.include_router(documents_router, prefix="/api")
app.include_router(focus_router, prefix="/api")
app.include_router(speech_router, prefix="/api")
app.include_router(analytics_router, prefix="/api")

