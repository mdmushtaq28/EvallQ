from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class DocumentChunkOut(BaseModel):
    id: str
    document_id: str
    chunk_index: int
    page_number: int
    content: str


class DocumentResponse(BaseModel):
    id: str
    filename: str
    file_size: int
    page_count: int
    chunk_count: int
    summary: Optional[str] = None
    key_takeaways: List[str] = Field(default_factory=list)
    created_at: datetime


class DocumentListResponse(BaseModel):
    documents: List[DocumentResponse]
    total: int


class DocumentSearchRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=500)
    top_k: int = Field(default=3, ge=1, le=10)


class DocumentSearchResult(BaseModel):
    chunk_id: str
    page_number: int
    content: str
    score: float


class DocumentSearchResponse(BaseModel):
    query: str
    results: List[DocumentSearchResult]
    device: str
    latency_ms: float


class DocumentQARequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=1000)
    top_k: int = Field(default=3, ge=1, le=10)


class DocumentQAResponse(BaseModel):
    reply: str
    sources: List[DocumentSearchResult]
    latency_ms: float
    tokens_per_second: float
    device: str
    offline: bool = True


class DocumentSummaryResponse(BaseModel):
    document_id: str
    summary: str
    key_takeaways: List[str]
    latency_ms: float
    cached: bool = False


class QuizQuestionItem(BaseModel):
    id: str
    question: str
    options: List[str]
    correctIndex: int
    explanation: str
    correct_answer: Optional[str] = None


class QuizResponse(BaseModel):
    document_id: str
    questions: List[QuizQuestionItem]
    latency_ms: float


class FlashcardItem(BaseModel):
    id: str
    front: str
    back: str
    category: str


class FlashcardsResponse(BaseModel):
    document_id: str
    flashcards: List[FlashcardItem]
    latency_ms: float
