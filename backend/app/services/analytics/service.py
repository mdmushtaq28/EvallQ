from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func

from ...models.focus_session import FocusSession
from ...models.document import Document
from ...models.study_interaction import StudyInteraction
from ...schemas.analytics import (
    AnalyticsOverviewResponse,
    WeeklyStudyDay,
    SessionScoreItem,
    AnalyticsTrendsResponse,
    AnalyticsExportData,
)


def format_duration(seconds: int) -> str:
    """Formats raw seconds into human-friendly study duration string."""
    if seconds <= 0:
        return "0 min"
    if seconds < 60:
        return f"{seconds}s"
    minutes = round(seconds / 60, 1)
    if minutes < 60:
        # Display as e.g. 25 min or 12.5 min
        return f"{int(minutes) if minutes.is_integer() else minutes} min"
    hours = round(seconds / 3600, 1)
    return f"{int(hours) if hours.is_integer() else hours} hrs"


class AnalyticsService:
    """
    Computes truthful on-device analytics by aggregating data from SQLite.
    Never generates synthetic stats in production mode.
    """

    @staticmethod
    def log_interaction(
        db: Session,
        interaction_type: str,
        document_id: Optional[str] = None,
        latency_ms: Optional[int] = None,
    ) -> StudyInteraction:
        """
        Records an interaction event (e.g., chat turn, document Q&A, quiz synthesis) in SQLite.
        """
        interaction = StudyInteraction(
            interaction_type=interaction_type,
            document_id=document_id,
            latency_ms=latency_ms,
            created_at=datetime.utcnow(),
        )
        db.add(interaction)
        try:
            db.commit()
            db.refresh(interaction)
        except Exception:
            db.rollback()
        return interaction

    @staticmethod
    def get_overview(db: Session) -> AnalyticsOverviewResponse:
        """
        Aggregates overall study telemetry from local database tables.
        """
        # Focus sessions aggregation
        sessions_query = db.query(
            func.count(FocusSession.id).label("total_count"),
            func.coalesce(func.sum(FocusSession.duration_seconds), 0).label("total_duration"),
            func.coalesce(func.sum(FocusSession.present_seconds), 0).label("total_present"),
            func.coalesce(func.sum(FocusSession.not_detected_seconds), 0).label("total_away"),
            func.coalesce(func.avg(FocusSession.focus_score), 0.0).label("avg_score"),
        ).first()

        total_sessions = sessions_query.total_count if sessions_query else 0
        total_duration = int(sessions_query.total_duration if sessions_query else 0)
        total_present = int(sessions_query.total_present if sessions_query else 0)
        total_away = int(sessions_query.total_away if sessions_query else 0)

        # Truthful weighted focus score
        if total_duration > 0:
            weighted_score = round((total_present / total_duration) * 100.0, 1)
        else:
            weighted_score = 0.0

        # Document count
        doc_count = db.query(func.count(Document.id)).scalar() or 0

        # AI Questions Answered (chat_query + document_qa)
        questions_count = db.query(func.count(StudyInteraction.id)).filter(
            StudyInteraction.interaction_type.in_(["chat_query", "document_qa"])
        ).scalar() or 0

        # Quiz completions / generation events
        quizzes_count = db.query(func.count(StudyInteraction.id)).filter(
            StudyInteraction.interaction_type == "quiz_generated"
        ).scalar() or 0

        return AnalyticsOverviewResponse(
            total_study_time_seconds=total_duration,
            total_study_time_formatted=format_duration(total_duration),
            overall_focus_score=weighted_score,
            ai_questions_answered=questions_count,
            documents_analyzed=doc_count,
            focused_study_time_seconds=total_present,
            focused_study_time_formatted=format_duration(total_present),
            away_study_time_seconds=total_away,
            away_study_time_formatted=format_duration(total_away),
            quiz_sessions_completed=quizzes_count,
            total_sessions_count=total_sessions,
        )

    @staticmethod
    def get_trends(db: Session) -> AnalyticsTrendsResponse:
        """
        Computes weekly daily study breakdown and historical session score progression.
        """
        now = datetime.utcnow()
        today = now.date()

        # Build 7-day chronological window ending today
        days_list: List[WeeklyStudyDay] = []
        for i in range(6, -1, -1):
            target_date = today - timedelta(days=i)
            start_dt = datetime.combine(target_date, datetime.min.time())
            end_dt = datetime.combine(target_date, datetime.max.time())

            day_stats = db.query(
                func.coalesce(func.sum(FocusSession.duration_seconds), 0).label("tot"),
                func.coalesce(func.sum(FocusSession.present_seconds), 0).label("pres"),
                func.coalesce(func.sum(FocusSession.not_detected_seconds), 0).label("away"),
            ).filter(
                FocusSession.started_at >= start_dt,
                FocusSession.started_at <= end_dt
            ).first()

            tot_secs = int(day_stats.tot) if day_stats else 0
            pres_secs = int(day_stats.pres) if day_stats else 0
            away_secs = int(day_stats.away) if day_stats else 0

            days_list.append(WeeklyStudyDay(
                day=target_date.strftime("%a"),
                date=target_date.isoformat(),
                totalMinutes=int(round(tot_secs / 60)),
                focusedMinutes=int(round(pres_secs / 60)),
                awayMinutes=int(round(away_secs / 60)),
            ))

        # Recent 10 completed focus sessions in chronological order
        recent_sessions = db.query(FocusSession).order_by(
            FocusSession.started_at.desc()
        ).limit(10).all()

        # Reverse to chronological order (oldest to newest among the 10)
        recent_sessions = list(reversed(recent_sessions))
        session_scores: List[SessionScoreItem] = [
            SessionScoreItem(
                session=f"S-{idx + 1}",
                session_id=s.id,
                score=round(s.focus_score, 1),
                date=s.started_at.strftime("%b %d, %H:%M") if s.started_at else "",
            )
            for idx, s in enumerate(recent_sessions)
        ]

        return AnalyticsTrendsResponse(
            weekly_data=days_list,
            session_scores=session_scores,
        )

    @staticmethod
    def export_data(db: Session) -> AnalyticsExportData:
        """
        Creates an exportable bundle of all student study records.
        """
        overview = AnalyticsService.get_overview(db)

        # Focus sessions
        sessions = db.query(FocusSession).order_by(FocusSession.started_at.desc()).all()
        sessions_data = [
            {
                "id": s.id,
                "started_at": s.started_at.isoformat() if s.started_at else None,
                "ended_at": s.ended_at.isoformat() if s.ended_at else None,
                "duration_seconds": s.duration_seconds,
                "present_seconds": s.present_seconds,
                "not_detected_seconds": s.not_detected_seconds,
                "screen_facing_seconds": s.screen_facing_seconds,
                "focus_score": round(s.focus_score, 1),
                "created_at": s.created_at.isoformat() if s.created_at else None,
            }
            for s in sessions
        ]

        # Documents metadata (clean summary, no internal chunk embeddings)
        docs = db.query(Document).order_by(Document.created_at.desc()).all()
        docs_data = [
            {
                "id": d.id,
                "filename": d.filename,
                "file_size": d.file_size,
                "page_count": d.page_count,
                "chunk_count": d.chunk_count,
                "summary": d.summary,
                "key_takeaways": d.get_takeaways_list(),
                "created_at": d.created_at.isoformat() if d.created_at else None,
            }
            for d in docs
        ]

        # Interactions
        interactions = db.query(StudyInteraction).order_by(StudyInteraction.created_at.desc()).all()
        interactions_data = [
            {
                "id": it.id,
                "interaction_type": it.interaction_type,
                "document_id": it.document_id,
                "latency_ms": it.latency_ms,
                "created_at": it.created_at.isoformat() if it.created_at else None,
            }
            for it in interactions
        ]

        return AnalyticsExportData(
            exported_at=datetime.utcnow().isoformat(),
            version="1.0.0",
            overview=overview,
            focus_sessions=sessions_data,
            documents=docs_data,
            study_interactions=interactions_data,
        )


analytics_service = AnalyticsService()
