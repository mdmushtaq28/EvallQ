from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class AnalyticsOverviewResponse(BaseModel):
    """
    High-level study analytics aggregated from local SQLite tables.
    """
    total_study_time_seconds: int = Field(..., description="Total study duration in seconds across all focus sessions")
    total_study_time_formatted: str = Field(..., description="Human-readable duration, e.g., '2.5 hrs' or '45 min'")
    overall_focus_score: float = Field(..., description="Weighted average focus score (0-100%)")
    ai_questions_answered: int = Field(..., description="Total AI Tutor & Document Q&A questions asked")
    documents_analyzed: int = Field(..., description="Count of uploaded study documents indexed locally")
    focused_study_time_seconds: int = Field(..., description="Cumulative attentive presence time in seconds")
    focused_study_time_formatted: str = Field(..., description="Human-readable focused duration")
    away_study_time_seconds: int = Field(..., description="Cumulative away / inactive time in seconds")
    away_study_time_formatted: str = Field(..., description="Human-readable away duration")
    quiz_sessions_completed: int = Field(..., description="Count of quizzes generated / practiced")
    total_sessions_count: int = Field(..., description="Total number of completed focus sessions")


class WeeklyStudyDay(BaseModel):
    """
    Aggregated study metrics for a single calendar day.
    """
    day: str = Field(..., description="Day label, e.g., 'Mon', 'Tue'")
    date: str = Field(..., description="ISO Date YYYY-MM-DD")
    totalMinutes: int = Field(..., description="Total study minutes")
    focusedMinutes: int = Field(..., description="Attentive minutes")
    awayMinutes: int = Field(..., description="Away minutes")


class SessionScoreItem(BaseModel):
    """
    Historical focus score for a completed session.
    """
    session: str = Field(..., description="Short session identifier, e.g., 'S-1'")
    session_id: str = Field(..., description="UUID of the focus session")
    score: float = Field(..., description="Session focus score (0-100)")
    date: str = Field(..., description="Session timestamp")


class AnalyticsTrendsResponse(BaseModel):
    """
    Time-series trend data for charting weekly performance and score progression.
    """
    weekly_data: List[WeeklyStudyDay]
    session_scores: List[SessionScoreItem]


class AnalyticsExportData(BaseModel):
    """
    Full on-device study export bundle in JSON format.
    """
    exported_at: str
    version: str
    overview: AnalyticsOverviewResponse
    focus_sessions: List[Dict[str, Any]]
    documents: List[Dict[str, Any]]
    study_interactions: List[Dict[str, Any]]
