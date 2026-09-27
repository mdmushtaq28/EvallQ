from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session
import json

from ...database.connection import get_db
from ...schemas.analytics import (
    AnalyticsOverviewResponse,
    AnalyticsTrendsResponse,
    AnalyticsExportData,
)
from ...services.analytics.service import analytics_service

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/overview", response_model=AnalyticsOverviewResponse, summary="Get overall study performance metrics")
async def get_overview(db: Session = Depends(get_db)) -> AnalyticsOverviewResponse:
    """
    Returns aggregated metrics (study time, focus score, questions, documents) computed
    truthfully from local SQLite tables.
    """
    return analytics_service.get_overview(db)


@router.get("/trends", response_model=AnalyticsTrendsResponse, summary="Get weekly study breakdown and session trends")
async def get_trends(db: Session = Depends(get_db)) -> AnalyticsTrendsResponse:
    """
    Returns daily study/focused duration for the past 7 days and recent session scores.
    """
    return analytics_service.get_trends(db)


@router.get("/export", response_model=AnalyticsExportData, summary="Export all student study telemetry as JSON")
async def export_data(db: Session = Depends(get_db)) -> AnalyticsExportData:
    """
    Exports all local focus sessions, indexed document metadata, and study interaction logs.
    """
    return analytics_service.export_data(db)


@router.get("/export/download", summary="Download local study telemetry as a JSON file")
async def download_export(db: Session = Depends(get_db)):
    """
    Generates and returns an application/json attachment download of the local study database.
    """
    export_payload = analytics_service.export_data(db)
    json_bytes = export_payload.model_dump_json(indent=2).encode("utf-8")
    return Response(
        content=json_bytes,
        media_type="application/json",
        headers={
            "Content-Disposition": "attachment; filename=focusflow_study_export.json"
        }
    )
