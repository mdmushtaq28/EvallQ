import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, DateTime
from ..database.connection import Base


class FocusSession(Base):
    """
    SQLAlchemy ORM model for completed Focus Mode sessions.
    Stores only derived session telemetry and statistics.
    Never stores camera images or raw video frames.
    """
    __tablename__ = "focus_sessions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    started_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    ended_at = Column(DateTime, nullable=True)
    duration_seconds = Column(Integer, nullable=False, default=0)
    present_seconds = Column(Integer, nullable=False, default=0)
    not_detected_seconds = Column(Integer, nullable=False, default=0)
    screen_facing_seconds = Column(Integer, nullable=False, default=0)
    focus_score = Column(Float, nullable=False, default=100.0)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
