from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_NAME: str = "FocusFlow AI API"
    APP_VERSION: str = "0.1.0"
    HOST: str = "127.0.0.1"
    PORT: int = 8000
    DATABASE_URL: str = "sqlite:///./focusflow.db"
    FRONTEND_URL: str = "http://localhost:5173"

    # CORS Configuration
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

    # Target Hardware and Runtime Metadata
    TARGET_PLATFORM: str = "Snapdragon AI PC"
    DEV_ENVIRONMENT: str = "Host CPU / x86_64"
    AI_TARGET: str = "host"  # "host" (Host CPU / x86_64) or "snapdragon" (Snapdragon X Series NPU)
    SNAPDRAGON_DEVICE: str = "Snapdragon X Series"
    SNAPDRAGON_NPU_RUNTIME: str = "QNN / ONNX Runtime"
    SNAPDRAGON_VALIDATED: bool = False

    # Local LLM Inference Configuration
    LLM_PROVIDER: str = "development"
    LLM_MODEL: str = "qwen2.5:0.5b"
    LLM_BASE_URL: str = "http://127.0.0.1:11434"
    LLM_TIMEOUT_SECONDS: float = 60.0
    LLM_DEV_DEVICE: str = "Host CPU (x86_64)"
    LLM_TARGET_DEVICE: str = "Qualcomm Hexagon NPU (Snapdragon)"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()
