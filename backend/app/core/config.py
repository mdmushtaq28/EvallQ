from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_NAME: str = "EvallQ API"
    APP_VERSION: str = "0.1.0"
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DATABASE_URL: str = "sqlite:///./focusflow.db"
    FRONTEND_URL: str = "http://localhost:5173"
    SECRET_KEY: str = "evallq-secure-on-device-auth-key-2026-xyz"

    # CORS Configuration
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

    # Target Hardware and Runtime Metadata
    TARGET_PLATFORM: str = "EvallQ On-Device AI"
    DEV_ENVIRONMENT: str = "Local Engine"
    AI_TARGET: str = "local"
    ON_DEVICE_DEVICE: str = "Local AI Engine"
    ON_DEVICE_RUNTIME: str = "ONNX Runtime / Local Ollama"
    ON_DEVICE_VALIDATED: bool = True



    # Local LLM Inference Configuration
    LLM_PROVIDER: str = "local"
    LLM_MODEL: str = "qwen2.5:0.5b"
    LLM_BASE_URL: str = "http://127.0.0.1:11434"
    LLM_TIMEOUT_SECONDS: float = 60.0
    LLM_DEV_DEVICE: str = "Local Engine"
    LLM_TARGET_DEVICE: str = "Local AI Engine"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()
