import uuid
from datetime import datetime
from typing import List, Optional
import json
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from ..database.connection import Base


class Document(Base):
    __tablename__ = "documents"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    filename = Column(String(255), nullable=False)
    file_size = Column(Integer, nullable=False, default=0)
    page_count = Column(Integer, nullable=False, default=1)
    chunk_count = Column(Integer, nullable=False, default=0)
    summary = Column(Text, nullable=True)
    key_takeaways = Column(Text, nullable=True)  # JSON-encoded array of strings
    created_at = Column(DateTime, default=datetime.utcnow)

    chunks = relationship(
        "DocumentChunk",
        back_populates="document",
        cascade="all, delete-orphan",
        order_by="DocumentChunk.chunk_index"
    )

    def get_takeaways_list(self) -> List[str]:
        if not self.key_takeaways:
            return []
        try:
            return json.loads(self.key_takeaways)
        except Exception:
            return []

    def set_takeaways_list(self, takeaways: List[str]) -> None:
        self.key_takeaways = json.dumps(takeaways)


class DocumentChunk(Base):
    __tablename__ = "document_chunks"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    document_id = Column(String(36), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True)
    chunk_index = Column(Integer, nullable=False)
    page_number = Column(Integer, nullable=False, default=1)
    content = Column(Text, nullable=False)
    embedding = Column(Text, nullable=True)  # JSON-encoded list of floats

    document = relationship("Document", back_populates="chunks")

    def get_embedding_vector(self) -> List[float]:
        if not self.embedding:
            return []
        try:
            return json.loads(self.embedding)
        except Exception:
            return []

    def set_embedding_vector(self, vec: List[float]) -> None:
        self.embedding = json.dumps(vec)
