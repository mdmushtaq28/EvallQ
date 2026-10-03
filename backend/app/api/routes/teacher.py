import json
import logging
from typing import List, Optional, Dict, Any
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from ...database.connection import get_db
from ...models.assignment import Assignment
from ...models.assessment import AssessmentSubmission, AssessmentQuestion
from ...schemas.assignment import (
    AssignmentCreateRequest,
    AssignmentResponse,
    TeacherReviewItem,
    TeacherScoreUpdateRequest,
    TeacherDashboardStats,
    StudentSupportItem,
    TopicPerformanceStat,
)

logger = logging.getLogger("focusflow.teacher.api")
router = APIRouter(prefix="/teacher", tags=["Teacher Intelligence"])


@router.post("/assignments", response_model=AssignmentResponse, status_code=status.HTTP_201_CREATED)
async def create_assignment(
    req: AssignmentCreateRequest,
    db: Session = Depends(get_db)
):
    """
    Creates a new teacher assignment with defined rubric guidance and question schemas.
    """
    questions_json = json.dumps([q.model_dump() for q in req.questions]) if req.questions else None
    concepts_json = json.dumps(req.expected_concepts) if req.expected_concepts else None

    # Calculate total maximum marks from questions if not explicitly specified
    total_marks = req.total_maximum_marks
    if req.questions and len(req.questions) > 0:
        sum_marks = sum(q.maximum_marks for q in req.questions)
        if sum_marks > 0:
            total_marks = sum_marks

    assignment = Assignment(
        title=req.title,
        subject=req.subject,
        instructions=req.instructions,
        total_maximum_marks=total_marks,
        rubric_guidance=req.rubric_guidance,
        expected_concepts=concepts_json,
        questions=questions_json,
        status="active"
    )
    db.add(assignment)
    db.commit()
    db.refresh(assignment)

    return AssignmentResponse(
        id=assignment.id,
        title=assignment.title,
        subject=assignment.subject,
        instructions=assignment.instructions,
        total_maximum_marks=assignment.total_maximum_marks,
        rubric_guidance=assignment.rubric_guidance,
        expected_concepts=assignment.get_expected_concepts_list(),
        questions=assignment.get_questions_list(),
        status=assignment.status,
        created_at=assignment.created_at,
        submission_count=0,
        pending_review_count=0,
        average_score=None
    )


@router.get("/assignments", response_model=List[AssignmentResponse])
async def list_assignments(
    db: Session = Depends(get_db)
):
    """
    Lists all assignments with live submission metrics: total submissions, pending reviews, average score.
    """
    assignments = db.query(Assignment).order_by(Assignment.created_at.desc()).all()
    results: List[AssignmentResponse] = []

    for a in assignments:
        submissions = db.query(AssessmentSubmission).filter(AssessmentSubmission.assignment_id == a.id).all()
        sub_count = len(submissions)
        pending_count = sum(1 for s in submissions if s.approval_status != "approved")

        scores = [
            (s.final_score if s.final_score is not None else s.ai_suggested_score)
            for s in submissions if s.total_maximum_marks > 0
        ]
        avg_score = round(sum(scores) / len(scores), 1) if scores else None

        results.append(
            AssignmentResponse(
                id=a.id,
                title=a.title,
                subject=a.subject,
                instructions=a.instructions,
                total_maximum_marks=a.total_maximum_marks,
                rubric_guidance=a.rubric_guidance,
                expected_concepts=a.get_expected_concepts_list(),
                questions=a.get_questions_list(),
                status=a.status,
                created_at=a.created_at,
                submission_count=sub_count,
                pending_review_count=pending_count,
                average_score=avg_score
            )
        )
    return results


@router.get("/assignments/{assignment_id}", response_model=AssignmentResponse)
async def get_assignment(
    assignment_id: str,
    db: Session = Depends(get_db)
):
    assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found.")

    submissions = db.query(AssessmentSubmission).filter(AssessmentSubmission.assignment_id == assignment.id).all()
    sub_count = len(submissions)
    pending_count = sum(1 for s in submissions if s.approval_status != "approved")
    scores = [
        (s.final_score if s.final_score is not None else s.ai_suggested_score)
        for s in submissions if s.total_maximum_marks > 0
    ]
    avg_score = round(sum(scores) / len(scores), 1) if scores else None

    return AssignmentResponse(
        id=assignment.id,
        title=assignment.title,
        subject=assignment.subject,
        instructions=assignment.instructions,
        total_maximum_marks=assignment.total_maximum_marks,
        rubric_guidance=assignment.rubric_guidance,
        expected_concepts=assignment.get_expected_concepts_list(),
        questions=assignment.get_questions_list(),
        status=assignment.status,
        created_at=assignment.created_at,
        submission_count=sub_count,
        pending_review_count=pending_count,
        average_score=avg_score
    )


@router.get("/review-queue", response_model=List[TeacherReviewItem])
async def get_review_queue(
    include_approved: bool = False,
    db: Session = Depends(get_db)
):
    """
    Returns submissions waiting for teacher review (pending or modified), newest first.
    """
    query = db.query(AssessmentSubmission)
    if not include_approved:
        query = query.filter(AssessmentSubmission.approval_status != "approved")
    submissions = query.order_by(AssessmentSubmission.created_at.desc()).all()

    results: List[TeacherReviewItem] = []
    for sub in submissions:
        # Determine assignment title
        assignment_title = "Open Assessment"
        if sub.assignment_id:
            asgn = db.query(Assignment).filter(Assignment.id == sub.assignment_id).first()
            if asgn:
                assignment_title = asgn.title
        elif sub.original_filename:
            assignment_title = f"Assessment: {sub.original_filename}"

        results.append(
            TeacherReviewItem(
                id=sub.id,
                student_name=sub.student_name or "Student",
                assignment_id=sub.assignment_id,
                assignment_title=assignment_title,
                ai_suggested_score=sub.ai_suggested_score,
                teacher_score=sub.teacher_score,
                final_score=sub.final_score,
                total_maximum_marks=sub.total_maximum_marks,
                approval_status=sub.approval_status,
                submitted_at=sub.created_at,
                page_count=sub.page_count,
                file_type=sub.file_type,
                original_filename=sub.original_filename
            )
        )
    return results


@router.get("/review/{submission_id}")
async def get_submission_for_review(
    submission_id: str,
    db: Session = Depends(get_db)
):
    """
    Returns full submission data needed for the teacher review side-by-side view.
    """
    sub = db.query(AssessmentSubmission).filter(AssessmentSubmission.id == submission_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found.")

    assignment_title = "Open Assessment"
    if sub.assignment_id:
        asgn = db.query(Assignment).filter(Assignment.id == sub.assignment_id).first()
        if asgn:
            assignment_title = asgn.title

    questions = (
        db.query(AssessmentQuestion)
        .filter(AssessmentQuestion.submission_id == submission_id)
        .order_by(AssessmentQuestion.question_number)
        .all()
    )

    q_data = [
        {
            "id": q.id,
            "question_number": q.question_number,
            "page_number": q.page_number,
            "question_text": q.question_text,
            "student_answer": q.student_answer,
            "maximum_marks": q.maximum_marks,
            "suggested_marks": q.suggested_marks,
            "teacher_marks": q.teacher_marks,
            "teacher_feedback": q.teacher_feedback,
            "topic": q.topic,
            "rubric_match": q.rubric_match or "Partial",
            "reasoning": q.reasoning or "",
            "feedback": q.feedback or "",
            "strengths": q.strengths or "",
            "mistakes": q.mistakes or "",
            "learning_gap": q.learning_gap or "",
        }
        for q in questions
    ]

    return {
        "submission_id": sub.id,
        "student_name": sub.student_name or "Student",
        "assignment_id": sub.assignment_id,
        "assignment_title": assignment_title,
        "original_filename": sub.original_filename,
        "file_type": sub.file_type,
        "page_count": sub.page_count,
        "ocr_status": sub.ocr_status,
        "ocr_confidence": sub.ocr_confidence,
        "raw_ocr_pages": sub.get_raw_ocr_pages(),
        "verified_ocr_text": sub.verified_ocr_text,
        "ai_suggested_score": sub.ai_suggested_score,
        "teacher_score": sub.teacher_score,
        "final_score": sub.final_score,
        "total_maximum_marks": sub.total_maximum_marks,
        "approval_status": sub.approval_status,
        "teacher_feedback": sub.teacher_feedback,
        "topic_performance": sub.get_topic_performance_dict(),
        "learning_gaps": sub.get_learning_gaps_list(),
        "recommendations": sub.get_recommendations_list(),
        "created_at": sub.created_at.isoformat(),
        "questions": q_data,
    }


@router.post("/review/{submission_id}/score")
async def save_teacher_score(
    submission_id: str,
    req: TeacherScoreUpdateRequest,
    db: Session = Depends(get_db)
):
    """
    Teacher overrides or saves grades for an assessment.
    Updates question-level marks and comments, recalculates total teacher score,
    and updates approval status.
    """
    sub = db.query(AssessmentSubmission).filter(AssessmentSubmission.id == submission_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found.")

    questions = db.query(AssessmentQuestion).filter(AssessmentQuestion.submission_id == submission_id).all()
    q_map = {q.id: q for q in questions}

    total_teacher_marks = 0.0
    if req.question_updates:
        for qu in req.question_updates:
            if qu.question_id in q_map:
                q = q_map[qu.question_id]
                q.teacher_marks = max(0.0, min(float(qu.teacher_marks), q.maximum_marks))
                if qu.teacher_feedback is not None:
                    q.teacher_feedback = qu.teacher_feedback
        
        # Recalculate total teacher marks from questions unless explicitly specified
        question_sum = sum(
            q.teacher_marks if q.teacher_marks is not None else q.suggested_marks
            for q in questions
        )
        total_teacher_marks = float(req.teacher_score) if req.teacher_score is not None else question_sum
    elif req.teacher_score is not None:
        total_teacher_marks = float(req.teacher_score)
    else:
        total_teacher_marks = sub.ai_suggested_score

    sub.teacher_score = round(total_teacher_marks, 1)
    if req.teacher_feedback is not None:
        sub.teacher_feedback = req.teacher_feedback

    if req.approve:
        sub.approval_status = "approved"
        sub.final_score = sub.teacher_score
    else:
        sub.approval_status = "modified"
        sub.final_score = sub.teacher_score

    db.commit()
    db.refresh(sub)

    return {
        "success": True,
        "submission_id": sub.id,
        "teacher_score": sub.teacher_score,
        "final_score": sub.final_score,
        "approval_status": sub.approval_status,
        "teacher_feedback": sub.teacher_feedback,
    }


@router.post("/review/{submission_id}/approve")
async def approve_submission(
    submission_id: str,
    db: Session = Depends(get_db)
):
    """
    Teacher approves the evaluation as final authority.
    Final score is locked to teacher_score (if modified) or ai_suggested_score.
    """
    sub = db.query(AssessmentSubmission).filter(AssessmentSubmission.id == submission_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found.")

    sub.approval_status = "approved"
    sub.final_score = sub.teacher_score if sub.teacher_score is not None else sub.ai_suggested_score

    db.commit()
    db.refresh(sub)

    return {
        "success": True,
        "submission_id": sub.id,
        "final_score": sub.final_score,
        "approval_status": sub.approval_status,
        "message": "Submission approved successfully by Teacher."
    }


@router.get("/dashboard-stats", response_model=TeacherDashboardStats)
async def get_teacher_dashboard_stats(
    db: Session = Depends(get_db)
):
    """
    Aggregates authentic class metrics across all assignments and submissions.
    Never returns fabricated demo statistics.
    """
    total_assignments = db.query(Assignment).count()
    submissions = db.query(AssessmentSubmission).all()

    pending_reviews = sum(1 for s in submissions if s.approval_status in ["pending", "modified"])
    completed_reviews = sum(1 for s in submissions if s.approval_status == "approved")

    # Calculate average class score percentage
    evaluated_subs = [s for s in submissions if s.total_maximum_marks > 0 and (s.final_score is not None or s.ai_suggested_score > 0)]
    class_percentages: List[float] = []
    for s in evaluated_subs:
        score = s.final_score if s.final_score is not None else s.ai_suggested_score
        pct = (score / s.total_maximum_marks) * 100.0
        class_percentages.append(pct)

    avg_class_score = round(sum(class_percentages) / len(class_percentages), 1) if class_percentages else 0.0

    # Students requiring attention: score < 60%
    students_needing_support: List[StudentSupportItem] = []
    attention_count = 0

    for s in evaluated_subs:
        score = s.final_score if s.final_score is not None else s.ai_suggested_score
        pct = round((score / s.total_maximum_marks) * 100.0, 1)

        # Primary weakness from learning gaps
        weakness = "General Review Needed"
        gaps = s.get_learning_gaps_list()
        if gaps and len(gaps) > 0:
            first_gap = gaps[0]
            weakness = first_gap.get("topic") or first_gap.get("gap") or str(first_gap)

        if pct < 65.0:
            attention_count += 1
            asgn_title = "Assessment"
            if s.assignment_id:
                asgn = db.query(Assignment).filter(Assignment.id == s.assignment_id).first()
                if asgn:
                    asgn_title = asgn.title
            students_needing_support.append(
                StudentSupportItem(
                    submission_id=s.id,
                    student_name=s.student_name or "Student",
                    assignment_title=asgn_title,
                    score=round(score, 1),
                    maximum_marks=s.total_maximum_marks,
                    percentage=pct,
                    primary_weakness=weakness
                )
            )

    # Topic performance aggregation
    topic_scores: Dict[str, List[float]] = {}
    topic_counts: Dict[str, int] = {}

    all_questions = db.query(AssessmentQuestion).all()
    for q in all_questions:
        if q.topic and q.maximum_marks > 0:
            score = q.teacher_marks if q.teacher_marks is not None else q.suggested_marks
            pct = (score / q.maximum_marks) * 100.0
            topic_scores.setdefault(q.topic, []).append(pct)
            topic_counts[q.topic] = topic_counts.get(q.topic, 0) + 1

    topic_analytics: List[TopicPerformanceStat] = []
    strongest_topic = None
    weakest_topic = None

    if topic_scores:
        avg_by_topic = {t: round(sum(scores) / len(scores), 1) for t, scores in topic_scores.items()}
        sorted_topics = sorted(avg_by_topic.items(), key=lambda x: x[1], reverse=True)
        strongest_topic = f"{sorted_topics[0][0]} ({sorted_topics[0][1]}%)"
        weakest_topic = f"{sorted_topics[-1][0]} ({sorted_topics[-1][1]}%)"

        for t, avg in sorted_topics:
            topic_analytics.append(
                TopicPerformanceStat(
                    topic=t,
                    average_percentage=avg,
                    question_count=topic_counts.get(t, 0)
                )
            )

    return TeacherDashboardStats(
        total_assignments=total_assignments,
        pending_reviews=pending_reviews,
        completed_reviews=completed_reviews,
        average_class_score=avg_class_score,
        students_requiring_attention=attention_count,
        strongest_topic=strongest_topic,
        weakest_topic=weakest_topic,
        topic_analytics=topic_analytics,
        students_needing_support=students_needing_support
    )
