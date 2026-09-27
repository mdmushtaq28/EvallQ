import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime
from ..database.connection import Base


class StudyInteraction(Base):
    """
    SQLAlchemy ORM model for recording lightweight study activity events.
    Enables accurate on-device performance analytics (questions answered, quizzes taken, etc.)
    without storing intrusive logs or transmitting data outside the host machine.
    """
    __tablename__ = "study_interactions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    interaction_type = Column(String(50), nullable=False, index=True)
    document_id = Column(String(36), nullable=True, index=True)
    latency_ms = Column(Integer, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
