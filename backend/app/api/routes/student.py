import json as _json
import logging
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ...database.connection import get_db
from ...models.user import User
from ...models.assignment import Assignment, AssignmentQuestionItem, AssignmentStudent
from ...models.assessment import AssessmentSubmission, AssessmentQuestion
from ...schemas.assignment import (
    StudentAssignmentListItem,
    StudentAssignmentDetailResponse,
    StudentTypedSubmissionRequest,
    StudentResultListItem,
)
from ...schemas.assessment import (
    AssessmentEvaluationResponse,
    QuestionEvaluationResult,
    TopicPerformanceItem,
    LearningGapItem,
    RecommendationItem,
    ExtractedQuestionItem,
)
from ...core.auth import get_current_student
from ...services.ai.assessment_evaluator import AssessmentEvaluatorService

logger = logging.getLogger("evallq.student.api")
router = APIRouter(prefix="/student", tags=["Student Assignments"])


@router.get("/assignments", response_model=List[StudentAssignmentListItem])
async def list_student_assignments(
    current_student: User = Depends(get_current_student),
    db: Session = Depends(get_db)
):
    """
    Returns ONLY published assignments assigned directly to the authenticated student.
    Never returns draft assignments, assignments for other students, or unassigned assignments.
    """
    assigned_records = (
        db.query(AssignmentStudent)
        .join(Assignment, AssignmentStudent.assignment_id == Assignment.id)
        .filter(
            AssignmentStudent.student_id == current_student.id,
            Assignment.status.in_(["published", "active"])
        )
        .order_by(Assignment.created_at.desc())
        .all()
    )

    results: List[StudentAssignmentListItem] = []
    for rec in assigned_records:
        asgn = rec.assignment
        sub = rec.submission
        if not sub:
            sub = (
                db.query(AssessmentSubmission)
                .filter(
                    AssessmentSubmission.assignment_id == asgn.id,
                    AssessmentSubmission.student_id == current_student.id
                )
                .order_by(AssessmentSubmission.created_at.desc())
                .first()
            )
            if sub and not rec.submission_id:
                rec.submission_id = sub.id
                db.commit()

        # Compute accurate display status
        display_status = rec.status
        final_score = None
        teacher_feedback = None

        if sub:
            if sub.approval_status == "approved":
                display_status = "APPROVED"
                final_score = sub.final_score if sub.final_score is not None else sub.teacher_score
                teacher_feedback = sub.teacher_feedback
            elif sub.evaluation_status == "completed":
                display_status = "UNDER_REVIEW"
                final_score = sub.ai_suggested_score
            else:
                display_status = "SUBMITTED"

        results.append(
            StudentAssignmentListItem(
                id=asgn.id,
                title=asgn.title,
                subject=asgn.subject,
                teacher_name=asgn.teacher_name or "Teacher",
                due_date=asgn.due_date,
                total_maximum_marks=asgn.total_maximum_marks,
                status=display_status,
                score=final_score,
                final_score=final_score,
                teacher_feedback=teacher_feedback,
                submission_id=sub.id if sub else None,
                assigned_at=rec.assigned_at
            )
        )

    return results


@router.get("/assignments/{assignment_id}", response_model=StudentAssignmentDetailResponse)
async def get_student_assignment_detail(
    assignment_id: str,
    current_student: User = Depends(get_current_student),
    db: Session = Depends(get_db)
):
    """
    Fetches the exact assignment and teacher-created questions for the authenticated student.
    Enforces authorization: Rejects if unassigned, draft, or belonging to another class.
    """
    assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found."
        )

    # Security: Draft assignments are teacher-only
    if assignment.status not in ["published", "active"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This assignment is currently in draft mode and has not been published by the instructor."
        )

    # Security: Verify assignment is assigned directly to this student
    assignment_student = (
        db.query(AssignmentStudent)
        .filter(
            AssignmentStudent.assignment_id == assignment_id,
            AssignmentStudent.student_id == current_student.id
        )
        .first()
    )
    if not assignment_student:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: This assignment has not been assigned to your student account."
        )

    # Check if student already has a submission for this assignment
    sub = assignment_student.submission
    if not sub:
        sub = (
            db.query(AssessmentSubmission)
            .filter(
                AssessmentSubmission.assignment_id == assignment.id,
                AssessmentSubmission.student_id == current_student.id
            )
            .order_by(AssessmentSubmission.created_at.desc())
            .first()
        )
        if sub and not assignment_student.submission_id:
            assignment_student.submission_id = sub.id
            db.commit()

    is_submitted = sub is not None and (
        assignment_student.status in ["SUBMITTED", "UNDER_REVIEW", "APPROVED", "EVALUATED"] or
        sub.evaluation_status in ["completed", "pending"]
    )

    submitted_answers_dict = {}
    if sub and sub.questions:
        for q in sub.questions:
            submitted_answers_dict[str(q.question_number)] = q.student_answer

    # Get exact teacher questions
    questions = assignment.get_questions_list()

    return StudentAssignmentDetailResponse(
        id=assignment.id,
        title=assignment.title,
        subject=assignment.subject,
        teacher_name=assignment.teacher_name or "Teacher",
        instructions=assignment.instructions,
        due_date=assignment.due_date,
        total_maximum_marks=assignment.total_maximum_marks,
        questions=questions,
        status=assignment_student.status,
        submission_id=sub.id if sub else None,
        is_submitted=is_submitted,
        submitted_answers=submitted_answers_dict,
    )


@router.get("/results", response_model=List[StudentResultListItem])
async def list_student_results(
    current_student: User = Depends(get_current_student),
    db: Session = Depends(get_db)
):
    """
    Returns all evaluated and submitted coursework results for the authenticated student.
    Enforces authorization: Only returns submissions belonging to current_student.id.
    """
    submissions = (
        db.query(AssessmentSubmission)
        .filter(
            (AssessmentSubmission.student_id == current_student.id) |
            (AssessmentSubmission.student_name.ilike(current_student.name))
        )
        .order_by(AssessmentSubmission.created_at.desc())
        .all()
    )

    results: List[StudentResultListItem] = []
    for sub in submissions:
        # Determine human-in-the-loop status
        is_approved = sub.approval_status == "approved"
        status_label = "APPROVED" if is_approved else "UNDER_REVIEW"

        # Final score is strictly the approved teacher/final score, NEVER fake premature score
        final_score = (
            sub.final_score if sub.final_score is not None
            else sub.teacher_score if sub.teacher_score is not None
            else sub.ai_suggested_score
        ) if is_approved else None

        percentage = (
            round((final_score / sub.total_maximum_marks * 100.0), 1)
            if (is_approved and sub.total_maximum_marks and sub.total_maximum_marks > 0 and final_score is not None)
            else None
        )

        asgn = sub.assignment
        title = asgn.title if asgn else (
            sub.original_filename.replace(".typed", "").replace(".png", "").replace(".pdf", "")
        )
        subject = asgn.subject if asgn else "Academic Coursework"
        teacher_name = asgn.teacher_name if (asgn and asgn.teacher_name) else "Instructor"

        results.append(
            StudentResultListItem(
                submission_id=sub.id,
                assignment_id=sub.assignment_id,
                assignment_title=title,
                subject=subject,
                teacher_name=teacher_name,
                status=status_label,
                total_maximum_marks=sub.total_maximum_marks or 0.0,
                final_score=final_score,
                ai_suggested_score=sub.ai_suggested_score,
                teacher_score=sub.teacher_score,
                percentage=percentage,
                teacher_feedback=sub.teacher_feedback if is_approved else None,
                question_count=len(sub.questions),
                submitted_at=sub.created_at,
                evaluated_at=sub.updated_at if is_approved else None,
            )
        )

    return results


@router.post("/assignments/{assignment_id}/submit", response_model=AssessmentEvaluationResponse)
async def submit_student_typed_assignment(
    assignment_id: str,
    req: StudentTypedSubmissionRequest,
    current_student: User = Depends(get_current_student),
    db: Session = Depends(get_db)
):
    """
    Accepts typed student answers for teacher-created questions.
    Security: Student identity is taken strictly from auth token, never trusting client student_id.
    Executes AI evaluation immediately and places the submission into the Teacher Review Queue.
    """
    assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found."
        )

    if assignment.status not in ["published", "active"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot submit to an unpublished draft assignment."
        )

    # Security check: assignment must be assigned to this student
    assignment_student = (
        db.query(AssignmentStudent)
        .filter(
            AssignmentStudent.assignment_id == assignment_id,
            AssignmentStudent.student_id == current_student.id
        )
        .first()
    )
    if not assignment_student:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: You are not assigned to this assignment."
        )

    # Prevent double submissions if already submitted/approved
    if assignment_student.status in ["SUBMITTED", "UNDER_REVIEW", "APPROVED"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already submitted this assignment. Resubmission is closed."
        )

    # Map answers by question_number
    answers_by_num = {a.question_number: a.answer_text.strip() for a in req.answers}

    # Fetch teacher's questions
    teacher_questions = assignment.get_questions_list()
    if not teacher_questions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This assignment has no questions configured."
        )

    submission_id = str(uuid.uuid4())
    total_max = assignment.total_maximum_marks or sum(
        q.get("maximum_marks", 10.0) for q in teacher_questions
    )

    # Create AssessmentSubmission record
    submission = AssessmentSubmission(
        id=submission_id,
        original_filename=f"{assignment.title} - {current_student.name}.typed",
        file_type="typed",
        file_path="typed_submission",
        page_count=1,
        ocr_status="completed",
        extraction_status="completed",
        evaluation_status="pending",
        total_maximum_marks=total_max,
        ai_suggested_score=0.0,
        approval_status="pending",
        assignment_id=assignment.id,
        student_id=current_student.id,
        student_name=current_student.name,
        submission_type="typed"
    )
    db.add(submission)
    db.flush()

    # Create AssessmentQuestion records with student's typed answers
    question_records: List[AssessmentQuestion] = []
    for q in teacher_questions:
        q_num = q.get("question_number", 1)
        student_ans = answers_by_num.get(q_num, "")

        qr = AssessmentQuestion(
            id=str(uuid.uuid4()),
            submission_id=submission_id,
            question_number=q_num,
            page_number=1,
            question_text=q.get("question_text", f"Question {q_num}"),
            student_answer=student_ans if student_ans else "[No answer submitted]",
            maximum_marks=float(q.get("maximum_marks", 10.0)),
            suggested_marks=0.0,
            topic=q.get("topic", "General"),
            model_answer=q.get("model_answer") or q.get("expected_answer") or "",
            key_concepts=_json.dumps(q.get("key_concepts")) if isinstance(q.get("key_concepts"), list) else (q.get("key_concepts") or ""),
            rubric=q.get("rubric", ""),
            strictness=q.get("strictness", "balanced")
        )
        db.add(qr)
        question_records.append(qr)

    db.commit()
    db.refresh(submission)

    # Build ExtractedQuestionItem list for the evaluator
    extracted_items = [
        ExtractedQuestionItem(
            question_number=qr.question_number,
            page_number=qr.page_number,
            question_text=qr.question_text,
            student_answer=qr.student_answer,
            maximum_marks=qr.maximum_marks,
            topic=qr.topic,
            model_answer=qr.model_answer,
            key_concepts=qr.get_key_concepts_list(),
            rubric=qr.rubric,
            strictness=qr.strictness or "balanced"
        )
        for qr in question_records
    ]

    # Execute AI evaluation using the teacher-controlled rubric evaluator
    logger.info(
        f"Executing AI rubric evaluation for typed submission {submission_id} "
        f"(Student: {current_student.name}, Questions: {len(extracted_items)})..."
    )
    eval_response = await AssessmentEvaluatorService.evaluate_assessment(submission_id, extracted_items)

    # Persist AI evaluation results back to AssessmentQuestion records
    q_results_by_num = {qe.question_number: qe for qe in eval_response.questions}
    for qr in question_records:
        qe = q_results_by_num.get(qr.question_number)
        if qe:
            qr.suggested_marks = qe.suggested_marks
            qr.topic = qe.topic
            qr.rubric_match = qe.rubric_match
            qr.reasoning = qe.reasoning
            qr.feedback = qe.feedback
            qr.strengths = qe.strengths
            qr.mistakes = qe.mistakes
            qr.learning_gap = qe.learning_gap
            qr.criterion_scores = _json.dumps([cs.model_dump() for cs in qe.criterion_scores]) if qe.criterion_scores else None
            qr.supported_points = _json.dumps(qe.supported_points) if qe.supported_points else None
            qr.missing_points = _json.dumps(qe.missing_points) if qe.missing_points else None
            qr.confidence = qe.confidence
            qr.teacher_review_required = qe.teacher_review_required

    # Persist aggregated scores and analytics back to the submission record
    submission.ai_suggested_score = eval_response.ai_suggested_score
    submission.evaluation_status = "completed"

    topic_perf_dict = {
        tp.topic: {
            "obtained": tp.obtained_marks,
            "maximum": tp.maximum_marks,
            "percentage": tp.percentage
        }
        for tp in eval_response.topic_performance
    }
    submission.topic_performance = _json.dumps(topic_perf_dict)

    gaps_list = [
        {
            "topic": g.topic,
            "concept": g.learning_gap,
            "severity": g.severity,
            "description": g.recommended_action,
        }
        for g in eval_response.learning_gaps
    ]
    submission.learning_gaps = _json.dumps(gaps_list)

    recs_list = [
        {
            "topic": r.topic,
            "recommendation": r.recommendation,
            "suggested_practice": r.rationale,
        }
        for r in eval_response.recommendations
    ]
    submission.recommendations = _json.dumps(recs_list)

    # Update AssignmentStudent mapping status
    assignment_student.status = "UNDER_REVIEW"
    assignment_student.submission_id = submission_id
    db.commit()

    logger.info(
        f"Typed submission {submission_id} evaluated successfully: "
        f"Score {eval_response.ai_suggested_score}/{eval_response.total_maximum_marks}"
    )
    return eval_response


@router.get("/submissions/{submission_id}", response_model=AssessmentEvaluationResponse)
async def get_student_submission_result(
    submission_id: str,
    current_student: User = Depends(get_current_student),
    db: Session = Depends(get_db)
):
    """
    Returns the student's evaluated assignment result, score, and teacher feedback.
    Enforces authorization: Rejects if the submission belongs to another student.
    """
    submission = db.query(AssessmentSubmission).filter(AssessmentSubmission.id == submission_id).first()
    if not submission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Submission not found."
        )

    # Security check: Student can only view their own submission
    if submission.student_id:
        if submission.student_id != current_student.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You cannot view results belonging to another student."
            )
    elif submission.student_name and submission.student_name.lower() != current_student.name.lower():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: You cannot view results belonging to another student."
        )

    # Build question evaluation results
    question_results: List[QuestionEvaluationResult] = []
    for q in submission.questions:
        effective_marks = q.teacher_marks if q.teacher_marks is not None else q.suggested_marks
        q_is_correct = bool(q.rubric_match == "Complete" or (effective_marks is not None and effective_marks >= 0.85 * q.maximum_marks))
        # Requirement 9: If score is 0, never provide strengths
        clean_strengths = (q.strengths or "") if (effective_marks and effective_marks > 0 and q.rubric_match != "Incorrect") else ""
        q_pct = round((effective_marks / q.maximum_marks * 100.0), 1) if (effective_marks is not None and q.maximum_marks > 0) else 0.0

        question_results.append(
            QuestionEvaluationResult(
                question_number=q.question_number,
                page_number=q.page_number,
                question_text=q.question_text,
                student_answer=q.student_answer,
                maximum_marks=q.maximum_marks,
                suggested_marks=q.suggested_marks,
                ai_score=q.suggested_marks,
                teacher_marks=q.teacher_marks,
                teacher_final_score=q.teacher_marks,
                override_reason=q.teacher_feedback,
                teacher_feedback=q.teacher_feedback,
                topic=q.topic,
                model_answer=q.model_answer or "",
                rubric=q.rubric or "",
                strictness=q.strictness or "balanced",
                rubric_match=q.rubric_match or "Partial",
                reasoning=q.reasoning or "",
                feedback=q.feedback or "",
                strengths=clean_strengths,
                mistakes=q.mistakes or "",
                learning_gap=q.learning_gap or "",
                is_correct=q_is_correct,
                ideal_answer=q.model_answer or "",
                confidence=q.confidence if q.confidence is not None else 0.95,
                percentage=q_pct,
                criterion_scores=q.get_criterion_scores_list(),
                supported_points=q.get_supported_points_list(),
                missing_points=q.get_missing_points_list(),
                teacher_review_required=q.teacher_review_required if q.teacher_review_required is not None else False
            )
        )

    # Build topic performance
    topic_perf_data = submission.get_topic_performance_dict()
    topic_items = [
        TopicPerformanceItem(
            topic=k,
            obtained_marks=v.get("obtained", 0.0),
            maximum_marks=v.get("maximum", 0.0),
            percentage=v.get("percentage", 0.0)
        )
        for k, v in topic_perf_data.items()
    ]

    # Build learning gaps
    gaps_data = submission.get_learning_gaps_list()
    gap_items = []
    for g in gaps_data:
        if isinstance(g, dict):
            gap_items.append(LearningGapItem(
                topic=g.get("topic", "General"),
                learning_gap=g.get("concept", g.get("learning_gap", "")),
                question_numbers=g.get("question_numbers", []),
                severity=g.get("severity", "medium"),
                recommended_action=g.get("description", g.get("recommended_action", ""))
            ))
        else:
            gap_items.append(LearningGapItem(
                topic="General",
                learning_gap=str(g),
                question_numbers=[],
                severity="medium",
                recommended_action=str(g)
            ))

    # Build recommendations
    recs_data = submission.get_recommendations_list()
    rec_items = []
    for r in recs_data:
        if isinstance(r, dict):
            rec_items.append(RecommendationItem(
                topic=r.get("topic", "General"),
                recommendation=r.get("recommendation", ""),
                rationale=r.get("suggested_practice", r.get("rationale", ""))
            ))
        else:
            rec_items.append(RecommendationItem(
                topic="General",
                recommendation=str(r),
                rationale=""
            ))

    # Official score to display: teacher_score if reviewed/approved, otherwise ai_suggested_score
    official_score = (
        submission.final_score if submission.final_score is not None
        else submission.teacher_score if submission.teacher_score is not None
        else submission.ai_suggested_score
    )

    total_max = submission.total_maximum_marks or 0.0
    pct = round((official_score / total_max * 100.0), 1) if total_max > 0 else 0.0

    return AssessmentEvaluationResponse(
        submission_id=submission.id,
        total_maximum_marks=total_max,
        maximum_marks=total_max,
        ai_suggested_score=submission.ai_suggested_score or 0.0,
        ai_score=submission.ai_suggested_score or 0.0,
        suggested_score=official_score,
        teacher_score=submission.teacher_score,
        teacher_final_score=submission.teacher_score,
        final_score=submission.final_score,
        teacher_feedback=submission.teacher_feedback,
        override_reason=submission.teacher_feedback,
        percentage=pct,
        approval_status=submission.approval_status,
        questions=question_results,
        topic_performance=topic_items,
        learning_gaps=gap_items,
        recommendations=rec_items
    )
