from typing import List, Optional
from pydantic import BaseModel, Field, field_validator


class ChatMessage(BaseModel):
    role: str = Field(..., description="Role of the message sender: 'user', 'assistant', or 'system'")
    content: str = Field(..., description="Message text content")

    @field_validator("role")
    @classmethod
    def validate_role(cls, v: str) -> str:
        valid_roles = {"user", "assistant", "system"}
        if v.lower() not in valid_roles:
            raise ValueError(f"Invalid role '{v}'. Allowed roles: {valid_roles}")
        return v.lower()


class ChatRequest(BaseModel):
    message: str = Field(
        default="",
        description="The student's question or prompt for the AI tutor (1-2000 chars)"
    )
    conversation: List[ChatMessage] = Field(
        default_factory=list,
        description="Previous conversation turns for contextual multi-turn tutoring"
    )


class ChatResponse(BaseModel):
    reply: str = Field(..., description="Educational response generated locally by the AI tutor")
    model: str = Field(..., description="Model identifier used for inference")
    provider: str = Field(..., description="Inference engine provider (e.g., 'Development (Host CPU)')")
    device: str = Field(..., description="Hardware execution device (e.g., 'Host CPU (x86_64)')")
    latency_ms: int = Field(..., description="Elapsed end-to-end inference latency in milliseconds")
    tokens_per_second: Optional[float] = Field(
        None,
        description="Estimated token generation speed locally"
    )
    offline: bool = Field(
        True,
        description="Confirms the request was processed entirely on-device without cloud connectivity"
    )
