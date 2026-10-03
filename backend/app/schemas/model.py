from typing import Optional
from pydantic import BaseModel, Field


class RuntimeStatus(BaseModel):
    status: str = "ready"
    provider: str = "local"
    environment: str = "local"
    ai_target: str = "local"


class ComponentStatus(BaseModel):
    status: str = "ready"
    model: Optional[str] = None
    runtime: Optional[str] = None
    target: Optional[str] = "local"


class OnDeviceEngineStatus(BaseModel):
    status: str = Field(default="ready", description="Engine status")
    device: str = Field(default="On-Device Neural Engine", description="Active hardware")
    runtime: str = Field(default="ONNX Runtime / Local Ollama", description="Target execution runtime")
    validated: bool = Field(default=True, description="True when local execution is verified")
    acceleration_available: bool = Field(default=True, description="Whether local acceleration is active")
    optimization_status: str = Field(default="ON-DEVICE ACTIVE", description="Engine optimization status")


class TargetStatus(BaseModel):
    platform: str = "EvallQ AI"
    development_environment: str = "Local Engine"


class ModelStatusResponse(BaseModel):
    runtime: RuntimeStatus
    llm: ComponentStatus
    speech: ComponentStatus
    vision: ComponentStatus
    embeddings: ComponentStatus
    engine: Optional[OnDeviceEngineStatus] = None
    target: TargetStatus


class ErrorResponse(BaseModel):
    error: str
    message: str
