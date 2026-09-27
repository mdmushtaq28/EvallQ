import time
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, status
from sqlalchemy.orm import Session

from ...database.connection import get_db
from ...models.document import Document, DocumentChunk
from ...schemas.document import (
    DocumentResponse,
    DocumentListResponse,
    DocumentSearchRequest,
    DocumentSearchResponse,
    DocumentSearchResult,
    DocumentQARequest,
    DocumentQAResponse,
    DocumentSummaryResponse,
    QuizResponse,
    QuizQuestionItem,
    FlashcardsResponse,
    FlashcardItem,
)
from ...services.documents.parser import PDFParser, DocumentParseError
from ...services.documents.chunker import TextChunker
from ...services.documents.embeddings import embedding_service
from ...services.documents.study_suite import study_suite_service
from ...services.analytics.service import analytics_service
from ...services.ai.base import ModelNotInitializedError

router = APIRouter(prefix="/documents", tags=["Documents & RAG"])
chunker = TextChunker(chunk_size=600, chunk_overlap=100)


def _to_document_response(doc: Document) -> DocumentResponse:
    return DocumentResponse(
        id=doc.id,
        filename=doc.filename,
        file_size=doc.file_size,
        page_count=doc.page_count,
        chunk_count=doc.chunk_count,
        summary=doc.summary,
        key_takeaways=doc.get_takeaways_list(),
        created_at=doc.created_at,
    )


@router.post("/upload", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Uploads and indexes a student course PDF locally.
    Extracts text using PyMuPDF, chunks semantically, and computes on-device embeddings.
    """
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF documents are supported for local course ingestion."
        )

    file_bytes = await file.read()
    file_size = len(file_bytes)

    # Step 1: Parse PDF
    try:
        pages, metadata = PDFParser.parse_pdf_bytes(file_bytes, file.filename)
    except DocumentParseError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while parsing the document: {str(e)}"
        )

    # Step 2: Semantic text chunking
    chunks_data = chunker.chunk_pages(pages)
    if not chunks_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not extract sufficient text chunks from this document."
        )

    # Step 3: Compute on-device embeddings via FastEmbed ONNX
    try:
        chunk_texts = [c["content"] for c in chunks_data]
        embeddings = embedding_service.generate_embeddings(chunk_texts)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"On-device embedding generation failed: {str(e)}"
        )

    # Step 4: Persist in SQLite
    doc_record = Document(
        filename=file.filename,
        file_size=file_size,
        page_count=metadata.get("page_count", 1),
        chunk_count=len(chunks_data),
    )
    db.add(doc_record)
    db.flush()  # Generates doc_record.id

    for idx, c in enumerate(chunks_data):
        chunk_rec = DocumentChunk(
            document_id=doc_record.id,
            chunk_index=c["chunk_index"],
            page_number=c["page_number"],
            content=c["content"],
        )
        if idx < len(embeddings):
            chunk_rec.set_embedding_vector(embeddings[idx])
        db.add(chunk_rec)

    db.commit()
    db.refresh(doc_record)

    return _to_document_response(doc_record)


@router.get("", response_model=DocumentListResponse)
def list_documents(db: Session = Depends(get_db)):
    """
    Lists all indexed documents.
    """
    docs = db.query(Document).order_by(Document.created_at.desc()).all()
    return DocumentListResponse(
        documents=[_to_document_response(d) for d in docs],
        total=len(docs)
    )


@router.get("/{doc_id}", response_model=DocumentResponse)
def get_document(doc_id: str, db: Session = Depends(get_db)):
    """
    Retrieves a single indexed document by ID.
    """
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")
    return _to_document_response(doc)


@router.delete("/{doc_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(doc_id: str, db: Session = Depends(get_db)):
    """
    Deletes an indexed document and its vector embeddings.
    """
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")
    db.delete(doc)
    db.commit()
    return None


@router.post("/{doc_id}/qa", response_model=DocumentQAResponse)
async def ask_document_question(
    doc_id: str,
    payload: DocumentQARequest,
    db: Session = Depends(get_db)
):
    """
    Answers a question grounded strictly in the document chunks using local RAG.
    """
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")

    chunks = db.query(DocumentChunk).filter(DocumentChunk.document_id == doc_id).all()
    if not chunks:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Document contains no indexed chunks.")

    chunks_data = [
        {
            "id": c.id,
            "page_number": c.page_number,
            "content": c.content,
            "embedding": c.get_embedding_vector(),
        }
        for c in chunks
    ]

    try:
        result = await study_suite_service.answer_question(
            question=payload.question,
            chunks=chunks_data,
            top_k=payload.top_k
        )
        analytics_service.log_interaction(
            db=db,
            interaction_type="document_qa",
            document_id=doc_id,
            latency_ms=result.get("latency_ms")
        )
        return DocumentQAResponse(**result)
    except ModelNotInitializedError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=e.message)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/{doc_id}/summarize", response_model=DocumentSummaryResponse)
async def summarize_document(
    doc_id: str,
    refresh: bool = Query(default=False),
    db: Session = Depends(get_db)
):
    """
    Generates or retrieves executive summary and key takeaways for a document.
    """
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")

    # Return cached if already available and refresh not requested
    if doc.summary and not refresh:
        return DocumentSummaryResponse(
            document_id=doc.id,
            summary=doc.summary,
            key_takeaways=doc.get_takeaways_list(),
            latency_ms=0.0,
            cached=True
        )

    chunks = db.query(DocumentChunk).filter(DocumentChunk.document_id == doc_id).all()
    if not chunks:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Document contains no indexed chunks.")

    chunks_data = [
        {"id": c.id, "page_number": c.page_number, "content": c.content}
        for c in chunks
    ]

    try:
        summary, takeaways, latency_ms = await study_suite_service.generate_summary(chunks_data)
        doc.summary = summary
        doc.set_takeaways_list(takeaways)
        db.commit()

        return DocumentSummaryResponse(
            document_id=doc.id,
            summary=summary,
            key_takeaways=takeaways,
            latency_ms=latency_ms,
            cached=False
        )
    except ModelNotInitializedError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=e.message)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/{doc_id}/quiz", response_model=QuizResponse)
async def generate_document_quiz(
    doc_id: str,
    db: Session = Depends(get_db)
):
    """
    Synthesizes multiple-choice questions from document chunks using local LLM.
    """
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")

    chunks = db.query(DocumentChunk).filter(DocumentChunk.document_id == doc_id).all()
    if not chunks:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Document contains no indexed chunks.")

    chunks_data = [
        {"id": c.id, "page_number": c.page_number, "content": c.content}
        for c in chunks
    ]

    try:
        questions_raw, latency_ms = await study_suite_service.generate_quiz(chunks_data)
        items = [QuizQuestionItem(**q) for q in questions_raw]
        analytics_service.log_interaction(
            db=db,
            interaction_type="quiz_generated",
            document_id=doc_id,
            latency_ms=int(latency_ms)
        )
        return QuizResponse(
            document_id=doc.id,
            questions=items,
            latency_ms=latency_ms
        )
    except ModelNotInitializedError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=e.message)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/{doc_id}/flashcards", response_model=FlashcardsResponse)
async def generate_document_flashcards(
    doc_id: str,
    db: Session = Depends(get_db)
):
    """
    Synthesizes concept flashcards from document chunks using local LLM.
    """
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")

    chunks = db.query(DocumentChunk).filter(DocumentChunk.document_id == doc_id).all()
    if not chunks:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Document contains no indexed chunks.")

    chunks_data = [
        {"id": c.id, "page_number": c.page_number, "content": c.content}
        for c in chunks
    ]

    try:
        cards_raw, latency_ms = await study_suite_service.generate_flashcards(chunks_data)
        items = [FlashcardItem(**c) for c in cards_raw]
        analytics_service.log_interaction(
            db=db,
            interaction_type="flashcard_generated",
            document_id=doc_id,
            latency_ms=int(latency_ms)
        )
        return FlashcardsResponse(
            document_id=doc.id,
            flashcards=items,
            latency_ms=latency_ms
        )
    except ModelNotInitializedError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=e.message)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
