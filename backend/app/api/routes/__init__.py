from .health import router as health_router
from .model import router as model_router
from .chat import router as chat_router

__all__ = ["health_router", "model_router", "chat_router"]
