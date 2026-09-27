from typing import Optional
from pydantic import BaseModel, Field


class RuntimeStatus(BaseModel):
    status: str = "not_initialized"
    provider: str = "local"
    environment: str = "host"
    ai_target: str = "host"


class ComponentStatus(BaseModel):
    status: str = "not_initialized"
    model: Optional[str] = None
    runtime: Optional[str] = None
    target: Optional[str] = "host"


class SnapdragonTargetStatus(BaseModel):
    status: str = Field(default="target", description="Target platform role")
    device: str = Field(default="Snapdragon X Series", description="Target hardware family")
    runtime: str = Field(default="QNN / ONNX Runtime", description="Target execution runtime")
    validated: bool = Field(default=False, description="True only after real Snapdragon execution")
    qnn_available: bool = Field(default=False, description="Whether QNN Execution Provider is locally detected")
    optimization_status: str = Field(default="TARGET IDENTIFIED", description="Stage 9 optimization status")


class TargetStatus(BaseModel):
    platform: str = "Snapdragon AI PC"
    development_environment: str = "Host CPU / x86_64"


class ModelStatusResponse(BaseModel):
    runtime: RuntimeStatus
    llm: ComponentStatus
    speech: ComponentStatus
    vision: ComponentStatus
    embeddings: ComponentStatus
    snapdragon: SnapdragonTargetStatus
    target: TargetStatus


class ErrorResponse(BaseModel):
    error: str
    message: str
