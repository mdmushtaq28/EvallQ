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
from app.api.routes.assessment import router as assessment_router
from app.api.routes.teacher import router as teacher_router
from app.api.routes.auth import router as auth_router
from app.api.routes.student import router as student_router
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
    description="Private On-Device AI Academic Evaluation & Teaching Engine for EvallQ.",
    lifespan=lifespan,
)

# CORS Configuration - support both local dev and production Railway domains
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_origin_regex=r"https?://.*",
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


# Include Routers under /api
app.include_router(health_router, prefix="/api")
app.include_router(model_router, prefix="/api")
app.include_router(chat_router, prefix="/api")
app.include_router(documents_router, prefix="/api")
app.include_router(focus_router, prefix="/api")
app.include_router(speech_router, prefix="/api")
app.include_router(analytics_router, prefix="/api")
app.include_router(assessment_router, prefix="/api")
app.include_router(teacher_router, prefix="/api")
app.include_router(auth_router, prefix="/api")
app.include_router(student_router, prefix="/api")


# Production Static Files & SPA Serving for Railway / Unified Containers
import os
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

candidates = [
    os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist")),
    os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "frontend", "dist")),
    os.path.abspath("frontend/dist"),
    os.path.abspath("/app/frontend/dist"),
    os.path.abspath("dist"),
]
frontend_dist_dir = None
for c in candidates:
    if os.path.exists(c) and os.path.isdir(c) and os.path.exists(os.path.join(c, "index.html")):
        frontend_dist_dir = c
        break

if frontend_dist_dir:
    assets_dir = os.path.join(frontend_dist_dir, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="static_assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str):
        target = os.path.join(frontend_dist_dir, full_path)
        if full_path and os.path.exists(target) and os.path.isfile(target):
            return FileResponse(target)
        return FileResponse(os.path.join(frontend_dist_dir, "index.html"))
else:
    @app.get("/", summary="Root Status Endpoint")
    async def root() -> dict:
        return {
            "name": settings.APP_NAME,
            "version": settings.APP_VERSION,
            "status": "running",
        }

