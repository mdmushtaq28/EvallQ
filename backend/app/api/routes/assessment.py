import hashlib
import json
import logging
import os
import re
import uuid
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from ...database.connection import get_db
from ...models.assessment import AssessmentSubmission, AssessmentQuestion
from ...models.assignment import Assignment
from ...schemas.assessment import (
    AssessmentUploadResponse,
    OCRPageResult,
    ExtractedQuestionItem,
    OCRVerifyRequest,
    OCRVerifyResponse,
    AssessmentEvaluationResponse,
    QuestionEvaluationResult,
    TopicPerformanceItem,
    LearningGapItem,
    RecommendationItem,
    TeacherReviewRequest,
    AssessmentListItem,
    AssessmentAnalyticsResponse,
)
from ...services.ai.assessment_ocr import AssessmentOCRService, AssessmentOCRError
from ...services.ai.assessment_evaluator import AssessmentEvaluatorService
from ...services.analytics.service import AnalyticsService

logger = logging.getLogger("focusflow.assessment.api")
router = APIRouter(prefix="/assessment", tags=["Assessment Intelligence"])

STORAGE_BASE = Path(os.environ.get("FOCUSFLOW_ASSESSMENT_STORAGE", "data/assessments"))


def get_safe_submission_dir(submission_id: str) -> Path:
    """Validates UUID to prevent path traversal and returns safe storage path."""
    if not re.match(r"^[0-9a-fA-F\-]{32,36}$", submission_id):
        raise HTTPException(status_code=400, detail="Invalid submission ID format.")
    submission_dir = STORAGE_BASE / submission_id
    return submission_dir


@router.post("/upload", response_model=AssessmentUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_assessment(
    file: UploadFile = File(...),
    student_name: Optional[str] = Form("Student"),
    assignment_id: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """
    Receives an authentic student assessment file (PDF, PNG, JPG, WEBP),
    performs real on-device OCR, preserves page previews, extracts questions/answers,
    and initializes a unique submission record.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="Uploaded file missing filename.")

    file_bytes = await file.read()
    if len(file_bytes) == 0:
        raise HTTPException(status_code=400, detail="Uploaded assessment is empty (0 bytes).")
    if len(file_bytes) > 50 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File exceeds 50 MB limit.")

    submission_id = str(uuid.uuid4())
    file_hash = hashlib.sha256(file_bytes).hexdigest()
    submission_dir = get_safe_submission_dir(submission_id)
    submission_dir.mkdir(parents=True, exist_ok=True)

    # Save original file bytes locally
    safe_filename = re.sub(r"[^a-zA-Z0-9_.-]", "_", file.filename)
    file_path = submission_dir / safe_filename
    with open(file_path, "wb") as f:
        f.write(file_bytes)

    # Execute local OCR
    try:
        pages_data, raw_ocr_text, avg_conf = AssessmentOCRService.process_file(
            file_bytes=file_bytes,
            filename=file.filename,
            content_type=file.content_type or "application/octet-stream",
            preview_storage_dir=submission_dir
        )
    except AssessmentOCRError as e:
        logger.error(f"OCR processing failed for {file.filename}: {e}")
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.exception(f"Unexpected error during assessment OCR: {e}")
        raise HTTPException(status_code=500, detail=f"On-device OCR failure: {str(e)}")

    # Extract initial questions and answers deterministically from actual OCR text
    extracted_raw = AssessmentOCRService.extract_questions_and_answers(raw_ocr_text)

    # Persist Submission in database
    submission = AssessmentSubmission(
        id=submission_id,
        original_filename=file.filename,
        file_type=file.content_type or "image/png",
        file_path=str(file_path),
        file_hash=file_hash,
        page_count=len(pages_data),
        ocr_status="completed",
        ocr_engine="RapidOCR-ONNX",
        ocr_confidence=avg_conf,
        raw_ocr_text=json.dumps(pages_data),
        verified_ocr_text=raw_ocr_text,
        extraction_status="completed",
        evaluation_status="pending",
        approval_status="pending",
        assignment_id=assignment_id.strip() if (assignment_id and assignment_id.strip()) else None,
        student_name=student_name.strip() if (student_name and student_name.strip()) else "Student",
    )
    db.add(submission)

    # Persist Questions in database
    extracted_items: List[ExtractedQuestionItem] = []
    for item in extracted_raw:
        q_obj = AssessmentQuestion(
            submission_id=submission_id,
            question_number=item["question_number"],
            page_number=item.get("page_number", 1),
            question_text=item["question_text"],
            student_answer=item["student_answer"],
            maximum_marks=item.get("maximum_marks", 5.0),
            suggested_marks=0.0,
            topic="General",
        )
        db.add(q_obj)
        extracted_items.append(
            ExtractedQuestionItem(
                question_number=q_obj.question_number,
                page_number=q_obj.page_number,
                question_text=q_obj.question_text,
                student_answer=q_obj.student_answer,
                maximum_marks=q_obj.maximum_marks,
            )
        )

    db.commit()
    db.refresh(submission)

    # Log interaction for truthful on-device telemetry
    AnalyticsService.log_interaction(db, "assessment_upload", submission_id)

    ocr_pages = [
        OCRPageResult(
            page_number=p["page_number"],
            raw_text=p["raw_text"],
            normalized_text=p["normalized_text"],
            confidence=p["confidence"],
        )
        for p in pages_data
    ]

    return AssessmentUploadResponse(
        submission_id=submission_id,
        original_filename=file.filename,
        file_type=file.content_type or "image/png",
        page_count=len(pages_data),
        ocr_status="completed",
        ocr_engine="RapidOCR-ONNX",
        ocr_confidence=avg_conf,
        pages=ocr_pages,
        raw_ocr_text=raw_ocr_text,
        extracted_questions=extracted_items,
    )


@router.get("/{submission_id}/preview")
async def get_assessment_preview(
    submission_id: str,
    page: int = Query(1, ge=1)
):
    """
    Serves the rendered preview image of the uploaded assessment page
    for side-by-side verification with OCR text in the frontend.
    """
    submission_dir = get_safe_submission_dir(submission_id)
    preview_file = submission_dir / f"page_{page}.png"

    if not preview_file.exists():
        # Fallback to page 1 if requested page is missing
        preview_file = submission_dir / "page_1.png"
        if not preview_file.exists():
            raise HTTPException(status_code=404, detail="Preview image not found.")

    return FileResponse(preview_file, media_type="image/png")


@router.get("/{submission_id}")
async def get_assessment(
    submission_id: str,
    db: Session = Depends(get_db)
):
    """Retrieves complete submission record, OCR state, and evaluation results."""
    sub = db.query(AssessmentSubmission).filter(AssessmentSubmission.id == submission_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Assessment submission not found.")

    questions = db.query(AssessmentQuestion).filter(AssessmentQuestion.submission_id == submission_id).order_by(AssessmentQuestion.question_number).all()

    return {
        "submission_id": sub.id,
        "student_name": sub.student_name or "Student",
        "assignment_id": sub.assignment_id,
        "teacher_feedback": sub.teacher_feedback or "",
        "original_filename": sub.original_filename,
        "file_type": sub.file_type,
        "page_count": sub.page_count,
        "ocr_status": sub.ocr_status,
        "ocr_engine": sub.ocr_engine,
        "ocr_confidence": sub.ocr_confidence,
        "raw_ocr_pages": sub.get_raw_ocr_pages(),
        "verified_ocr_text": sub.verified_ocr_text or "",
        "extraction_status": sub.extraction_status,
        "evaluation_status": sub.evaluation_status,
        "total_maximum_marks": sub.total_maximum_marks,
        "ai_suggested_score": sub.ai_suggested_score,
        "teacher_score": sub.teacher_score,
        "final_score": sub.final_score,
        "percentage": round(((sub.final_score if sub.final_score is not None else sub.ai_suggested_score) / sub.total_maximum_marks * 100.0), 1) if sub.total_maximum_marks > 0 else 0.0,
        "approval_status": sub.approval_status,
        "topic_performance": sub.get_topic_performance_dict(),
        "learning_gaps": sub.get_learning_gaps_list(),
        "recommendations": sub.get_recommendations_list(),
        "created_at": sub.created_at.isoformat(),
        "questions": [
            {
                "question_number": q.question_number,
                "page_number": q.page_number,
                "question_text": q.question_text,
                "student_answer": q.student_answer,
                "maximum_marks": q.maximum_marks,
                "suggested_marks": q.suggested_marks,
                "teacher_marks": q.teacher_marks,
                "teacher_feedback": q.teacher_feedback,
                "topic": q.topic,
                "rubric_match": q.rubric_match,
                "reasoning": q.reasoning,
                "feedback": q.feedback,
                "strengths": q.strengths if ((q.teacher_marks if q.teacher_marks is not None else q.suggested_marks) > 0 and q.rubric_match != "Incorrect") else "",
                "mistakes": q.mistakes,
                "learning_gap": q.learning_gap,
                "percentage": round(((q.teacher_marks if q.teacher_marks is not None else q.suggested_marks) / q.maximum_marks * 100.0), 1) if q.maximum_marks > 0 else 0.0,
                "confidence": 0.95,
            }
            for q in questions
        ]
    }


@router.post("/{submission_id}/verify-ocr", response_model=OCRVerifyResponse)
async def verify_assessment_ocr(
    submission_id: str,
    req: OCRVerifyRequest,
    db: Session = Depends(get_db)
):
    """
    Human-in-the-loop endpoint allowing teacher/student to correct OCR text
    and update extracted questions prior to AI evaluation.
    """
    sub = db.query(AssessmentSubmission).filter(AssessmentSubmission.id == submission_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Assessment submission not found.")

    sub.verified_ocr_text = req.verified_ocr_text

    # If user provided edited questions explicitly, use them;
    # otherwise re-extract from updated verified text.
    if req.updated_questions and len(req.updated_questions) > 0:
        # Clear existing questions and replace
        db.query(AssessmentQuestion).filter(AssessmentQuestion.submission_id == submission_id).delete()
        new_q_items: List[ExtractedQuestionItem] = []
        for item in req.updated_questions:
            q_obj = AssessmentQuestion(
                submission_id=submission_id,
                question_number=item.question_number,
                page_number=item.page_number,
                question_text=item.question_text,
                student_answer=item.student_answer,
                maximum_marks=item.maximum_marks,
                suggested_marks=0.0,
                topic="General",
            )
            db.add(q_obj)
            new_q_items.append(item)
    else:
        extracted = AssessmentOCRService.extract_questions_and_answers(req.verified_ocr_text)
        db.query(AssessmentQuestion).filter(AssessmentQuestion.submission_id == submission_id).delete()
        new_q_items = []
        for item in extracted:
            q_obj = AssessmentQuestion(
                submission_id=submission_id,
                question_number=item["question_number"],
                page_number=item.get("page_number", 1),
                question_text=item["question_text"],
                student_answer=item["student_answer"],
                maximum_marks=item.get("maximum_marks", 5.0),
                suggested_marks=0.0,
                topic="General",
            )
            db.add(q_obj)
            new_q_items.append(
                ExtractedQuestionItem(
                    question_number=q_obj.question_number,
                    page_number=q_obj.page_number,
                    question_text=q_obj.question_text,
                    student_answer=q_obj.student_answer,
                    maximum_marks=q_obj.maximum_marks,
                )
            )

    db.commit()
    db.refresh(sub)

    return OCRVerifyResponse(
        submission_id=sub.id,
        verified_ocr_text=sub.verified_ocr_text,
        extracted_questions=new_q_items,
    )


@router.post("/{submission_id}/evaluate", response_model=AssessmentEvaluationResponse)
async def evaluate_assessment(
    submission_id: str,
    rubric_guidance: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Evaluates verified questions using the local Qwen LLM on Ollama.
    Produces question marks, total score, topic analytics, learning gaps, and recommendations.
    """
    sub = db.query(AssessmentSubmission).filter(AssessmentSubmission.id == submission_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Assessment submission not found.")

    questions = db.query(AssessmentQuestion).filter(AssessmentQuestion.submission_id == submission_id).order_by(AssessmentQuestion.question_number).all()
    if not questions:
        # If no questions present, try extracting from verified OCR text
        raw_items = AssessmentOCRService.extract_questions_and_answers(sub.verified_ocr_text or "")
        for item in raw_items:
            q_obj = AssessmentQuestion(
                submission_id=submission_id,
                question_number=item["question_number"],
                page_number=item.get("page_number", 1),
                question_text=item["question_text"],
                student_answer=item["student_answer"],
                maximum_marks=item.get("maximum_marks", 5.0),
                suggested_marks=0.0,
            )
            db.add(q_obj)
        db.commit()
        questions = db.query(AssessmentQuestion).filter(AssessmentQuestion.submission_id == submission_id).order_by(AssessmentQuestion.question_number).all()

    q_items = [
        ExtractedQuestionItem(
            question_number=q.question_number,
            page_number=q.page_number,
            question_text=q.question_text,
            student_answer=q.student_answer,
            maximum_marks=q.maximum_marks,
        )
        for q in questions
    ]

    active_rubric = rubric_guidance or ""
    if not active_rubric and sub.assignment_id:
        asgn = db.query(Assignment).filter(Assignment.id == sub.assignment_id).first()
        if asgn and asgn.rubric_guidance:
            active_rubric = asgn.rubric_guidance

    try:
        eval_result = await AssessmentEvaluatorService.evaluate_assessment(
            submission_id=submission_id,
            questions=q_items,
            rubric_guidance=active_rubric,
        )
    except Exception as e:
        logger.exception(f"Error during AI evaluation: {e}")
        raise HTTPException(status_code=500, detail=f"Local AI evaluation failed: {str(e)}")

    # Update database question records with evaluation data
    eval_by_qnum = {eq.question_number: eq for eq in eval_result.questions}
    for q in questions:
        if q.question_number in eval_by_qnum:
            eq = eval_by_qnum[q.question_number]
            q.suggested_marks = eq.suggested_marks
            q.topic = eq.topic
            q.rubric_match = eq.rubric_match
            q.reasoning = eq.reasoning
            q.feedback = eq.feedback
            q.strengths = eq.strengths
            q.mistakes = eq.mistakes
            q.learning_gap = eq.learning_gap

    # Update submission aggregate stats
    sub.total_maximum_marks = eval_result.total_maximum_marks
    sub.ai_suggested_score = eval_result.ai_suggested_score
    sub.evaluation_status = "completed"
    sub.topic_performance = json.dumps([tp.model_dump() for tp in eval_result.topic_performance])
    sub.learning_gaps = json.dumps([lg.model_dump() for lg in eval_result.learning_gaps])
    sub.recommendations = json.dumps([rc.model_dump() for rc in eval_result.recommendations])

    db.commit()
    db.refresh(sub)

    # Log interaction for study analytics
    AnalyticsService.log_interaction(db, "assessment_evaluated", submission_id)

    return eval_result


@router.post("/{submission_id}/review", response_model=AssessmentEvaluationResponse)
async def teacher_review_assessment(
    submission_id: str,
    req: TeacherReviewRequest,
    db: Session = Depends(get_db)
):
    """
    Teacher review and score override endpoint.
    Preserves AI suggested score while recording teacher_score and final_score.
    """
    sub = db.query(AssessmentSubmission).filter(AssessmentSubmission.id == submission_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Assessment submission not found.")

    questions = db.query(AssessmentQuestion).filter(AssessmentQuestion.submission_id == submission_id).order_by(AssessmentQuestion.question_number).all()
    q_map = {q.question_number: q for q in questions}

    total_teacher_marks = 0.0
    for rev in req.question_reviews:
        if rev.question_number in q_map:
            q = q_map[rev.question_number]
            # Enforce score range [0, maximum_marks]
            valid_marks = max(0.0, min(float(q.maximum_marks), float(rev.teacher_marks)))
            q.teacher_marks = valid_marks
            if rev.teacher_feedback:
                q.teacher_feedback = rev.teacher_feedback
            total_teacher_marks += valid_marks

    sub.teacher_score = round(total_teacher_marks, 1)
    sub.final_score = sub.teacher_score if req.approval_status == "modified" else sub.ai_suggested_score
    sub.approval_status = req.approval_status

    db.commit()
    db.refresh(sub)

    # Reconstruct response
    eval_questions: List[QuestionEvaluationResult] = []
    for q in questions:
        effective_marks = q.teacher_marks if q.teacher_marks is not None else q.suggested_marks
        q_is_correct = bool(q.rubric_match != "Incorrect" and effective_marks and effective_marks > 0)
        clean_strengths = (q.strengths or "") if (q_is_correct and effective_marks > 0) else ""

        eval_questions.append(
            QuestionEvaluationResult(
                question_number=q.question_number,
                page_number=q.page_number,
                question_text=q.question_text,
                student_answer=q.student_answer,
                maximum_marks=q.maximum_marks,
                suggested_marks=q.suggested_marks,
                teacher_marks=q.teacher_marks,
                teacher_feedback=q.teacher_feedback,
                topic=q.topic,
                rubric_match=q.rubric_match or "Partial",
                reasoning=q.reasoning or "",
                feedback=q.feedback or "",
                strengths=clean_strengths,
                mistakes=q.mistakes or "",
                learning_gap=q.learning_gap or "",
                is_correct=q_is_correct,
                ideal_answer=""
            )
        )

    t_perf_raw = sub.get_topic_performance_dict()
    topic_perf = [TopicPerformanceItem(**tp) for tp in t_perf_raw] if isinstance(t_perf_raw, list) else []
    learning_gaps = [LearningGapItem(**lg) for lg in sub.get_learning_gaps_list()]
    recommendations = [RecommendationItem(**rc) for rc in sub.get_recommendations_list()]

    active_score = sub.final_score if sub.final_score is not None else sub.ai_suggested_score
    percentage = round((active_score / sub.total_maximum_marks * 100.0), 1) if sub.total_maximum_marks > 0 else 0.0

    return AssessmentEvaluationResponse(
        submission_id=sub.id,
        total_maximum_marks=sub.total_maximum_marks,
        ai_suggested_score=sub.ai_suggested_score,
        teacher_score=sub.teacher_score,
        final_score=sub.final_score,
        percentage=percentage,
        approval_status=sub.approval_status,
        questions=eval_questions,
        topic_performance=topic_perf,
        learning_gaps=learning_gaps,
        recommendations=recommendations,
    )


@router.get("/list/all", response_model=List[AssessmentListItem])
async def list_assessments(
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Returns recent assessment submissions sorted newest first."""
    subs = db.query(AssessmentSubmission).order_by(AssessmentSubmission.created_at.desc()).limit(limit).all()
    results: List[AssessmentListItem] = []
    for s in subs:
        q_count = db.query(AssessmentQuestion).filter(AssessmentQuestion.submission_id == s.id).count()
        results.append(
            AssessmentListItem(
                id=s.id,
                original_filename=s.original_filename,
                file_type=s.file_type,
                created_at=s.created_at,
                ocr_status=s.ocr_status,
                evaluation_status=s.evaluation_status,
                ai_suggested_score=s.ai_suggested_score,
                total_maximum_marks=s.total_maximum_marks,
                final_score=s.final_score,
                approval_status=s.approval_status,
                question_count=q_count,
            )
        )
    return results


@router.get("/analytics/summary", response_model=AssessmentAnalyticsResponse)
async def get_assessment_analytics(db: Session = Depends(get_db)):
    """Computes truthful assessment intelligence analytics from SQLite records."""
    subs = db.query(AssessmentSubmission).all()
    total_assessments = len(subs)

    if total_assessments == 0:
        return AssessmentAnalyticsResponse(
            total_assessments=0,
            average_score_percentage=0.0,
            strongest_topic=None,
            weakest_topic=None,
            total_learning_gaps=0,
            recent_assessments=[],
        )

    evaluated_subs = [s for s in subs if s.evaluation_status == "completed" and s.total_maximum_marks > 0]
    total_pct = sum((s.ai_suggested_score / s.total_maximum_marks * 100.0) for s in evaluated_subs)
    avg_pct = round(total_pct / len(evaluated_subs), 1) if evaluated_subs else 0.0

    # Collect topic performance across all submissions
    topic_totals: Dict[str, Dict[str, float]] = {}
    total_gaps_count = 0
    for s in evaluated_subs:
        t_perf = s.get_topic_performance_dict()
        if isinstance(t_perf, list):
            for t in t_perf:
                t_name = t.get("topic", "General")
                if t_name not in topic_totals:
                    topic_totals[t_name] = {"obtained": 0.0, "maximum": 0.0}
                topic_totals[t_name]["obtained"] += t.get("obtained_marks", 0.0)
                topic_totals[t_name]["maximum"] += t.get("maximum_marks", 0.0)

        gaps = s.get_learning_gaps_list()
        total_gaps_count += len(gaps)

    strongest_topic = None
    weakest_topic = None
    if topic_totals:
        topic_avg_pcts = {
            t: (data["obtained"] / data["maximum"] * 100.0) if data["maximum"] > 0 else 0.0
            for t, data in topic_totals.items()
        }
        sorted_topics = sorted(topic_avg_pcts.items(), key=lambda x: x[1])
        weakest_topic = f"{sorted_topics[0][0]} ({round(sorted_topics[0][1], 1)}%)"
        strongest_topic = f"{sorted_topics[-1][0]} ({round(sorted_topics[-1][1], 1)}%)"

    recent_items: List[AssessmentListItem] = []
    for s in subs[:5]:
        q_count = db.query(AssessmentQuestion).filter(AssessmentQuestion.submission_id == s.id).count()
        recent_items.append(
            AssessmentListItem(
                id=s.id,
                original_filename=s.original_filename,
                file_type=s.file_type,
                created_at=s.created_at,
                ocr_status=s.ocr_status,
                evaluation_status=s.evaluation_status,
                ai_suggested_score=s.ai_suggested_score,
                total_maximum_marks=s.total_maximum_marks,
                final_score=s.final_score,
                approval_status=s.approval_status,
                question_count=q_count,
            )
        )

    return AssessmentAnalyticsResponse(
        total_assessments=total_assessments,
        average_score_percentage=avg_pct,
        strongest_topic=strongest_topic,
        weakest_topic=weakest_topic,
        total_learning_gaps=total_gaps_count,
        recent_assessments=recent_items,
    )
