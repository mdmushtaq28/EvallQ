from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


class FocusSessionStatus(BaseModel):
    session_id: Optional[str] = None
    state: str = Field(..., description="FOCUSED, NOT_DETECTED, PAUSED, NOT_STARTED, COMPLETED")
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    elapsed_seconds: int = 0
    present_seconds: int = 0
    not_detected_seconds: int = 0
    screen_facing_seconds: int = 0
    paused_seconds: int = 0
    focus_score: float = 100.0


class FocusSessionHistoryItem(BaseModel):
    id: str
    started_at: datetime
    ended_at: Optional[datetime] = None
    duration_seconds: int
    present_seconds: int
    not_detected_seconds: int
    screen_facing_seconds: int
    focus_score: float
    created_at: datetime


class FocusSessionHistoryResponse(BaseModel):
    sessions: List[FocusSessionHistoryItem]
    total: int


class FocusFrameResponse(BaseModel):
    session_id: Optional[str] = None
    state: str
    present: bool
    screen_facing: bool
    confidence: float
    box: Optional[List[float]] = None
    elapsed_seconds: int
    present_seconds: int
    not_detected_seconds: int
    focus_score: float
    inference_latency_ms: float
    device: str = "Host CPU (x86_64)"
