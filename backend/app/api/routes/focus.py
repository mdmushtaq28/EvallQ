from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session

from ...database.connection import get_db
from ...models.focus_session import FocusSession
from ...schemas.focus import (
    FocusSessionStatus,
    FocusSessionHistoryItem,
    FocusSessionHistoryResponse,
    FocusFrameResponse,
)
from ...services.ai.vision import vision_service
from ...services.focus.session_manager import session_manager
from ...services.ai.base import ModelNotInitializedError

router = APIRouter(prefix="/focus", tags=["Focus Mode"])


@router.post("/start", response_model=FocusSessionStatus, summary="Start a Focus Mode Session")
def start_focus_session():
    """
    Initializes a new observable presence focus session.
    """
    status_data = session_manager.start_session()
    return FocusSessionStatus(**status_data)


@router.post("/pause", response_model=FocusSessionStatus, summary="Pause/Resume the Focus Session")
def pause_focus_session():
    """
    Toggles the paused state of the active focus session.
    """
    status_data = session_manager.pause_session()
    return FocusSessionStatus(**status_data)


@router.post("/stop", response_model=FocusSessionStatus, summary="Stop and Persist Focus Session")
def stop_focus_session(db: Session = Depends(get_db)):
    """
    Concludes the focus tracking session and persists derived session metrics to SQLite.
    Never stores or persists camera video frames.
    """
    status_data = session_manager.stop_session()

    # Save to SQLite if a valid session was active
    if status_data.get("session_id"):
        duration = status_data.get("elapsed_seconds", 0)
        session_rec = FocusSession(
            id=status_data["session_id"],
            started_at=datetime.fromisoformat(status_data["started_at"]) if status_data.get("started_at") else datetime.utcnow(),
            ended_at=datetime.fromisoformat(status_data["ended_at"]) if status_data.get("ended_at") else datetime.utcnow(),
            duration_seconds=duration,
            present_seconds=status_data.get("present_seconds", 0),
            not_detected_seconds=status_data.get("not_detected_seconds", 0),
            screen_facing_seconds=status_data.get("screen_facing_seconds", 0),
            focus_score=status_data.get("focus_score", 100.0),
        )
        db.add(session_rec)
        db.commit()

    return FocusSessionStatus(**status_data)


@router.get("/status", response_model=FocusSessionStatus, summary="Get Live Focus Session Status")
def get_focus_status():
    """
    Returns live observable presence statistics for the active focus session.
    """
    status_data = session_manager.get_status()
    return FocusSessionStatus(**status_data)


@router.get("/current", response_model=FocusSessionStatus, summary="Get Live Focus Session Status (Alias)")
def get_current_focus():
    """
    Alias for /api/focus/status.
    """
    status_data = session_manager.get_status()
    return FocusSessionStatus(**status_data)


@router.get("/history", response_model=FocusSessionHistoryResponse, summary="Get Historical Focus Sessions")
def get_focus_history(db: Session = Depends(get_db)):
    """
    Retrieves historically completed focus sessions from SQLite.
    """
    records = db.query(FocusSession).order_by(FocusSession.created_at.desc()).limit(20).all()
    items = [
        FocusSessionHistoryItem(
            id=r.id,
            started_at=r.started_at,
            ended_at=r.ended_at,
            duration_seconds=r.duration_seconds,
            present_seconds=r.present_seconds,
            not_detected_seconds=r.not_detected_seconds,
            screen_facing_seconds=r.screen_facing_seconds,
            focus_score=r.focus_score,
            created_at=r.created_at,
        )
        for r in records
    ]
    return FocusSessionHistoryResponse(sessions=items, total=len(items))


@router.post("/frame", response_model=FocusFrameResponse, summary="Process Webcam Frame In-Memory")
async def process_focus_frame(file: UploadFile = File(...)):
    """
    Processes a single camera frame entirely in memory using UltraFace ONNX on CPU.
    Derives presence and screen-facing signals, updates temporal state machine, and returns metrics.
    Zero image bytes are written to disk or stored.
    """
    try:
        frame_bytes = await file.read()
        if not frame_bytes:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Empty frame received.")

        # In-memory vision detection
        vision_result = vision_service.process_frame(frame_bytes)

        # Update session state machine
        is_present = vision_result.get("present", False)
        is_screen_facing = vision_result.get("screen_facing", False)
        session_status = session_manager.record_frame(is_present, is_screen_facing)

        return FocusFrameResponse(
            session_id=session_status.get("session_id"),
            state=session_status.get("state", "FOCUSED"),
            present=is_present,
            screen_facing=is_screen_facing,
            confidence=vision_result.get("confidence", 0.0),
            box=vision_result.get("box"),
            elapsed_seconds=session_status.get("elapsed_seconds", 0),
            present_seconds=session_status.get("present_seconds", 0),
            not_detected_seconds=session_status.get("not_detected_seconds", 0),
            focus_score=session_status.get("focus_score", 100.0),
            inference_latency_ms=vision_result.get("latency_ms", 0.0),
            device=vision_result.get("device", "Host CPU (x86_64)"),
        )
    except ModelNotInitializedError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=e.message)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Frame processing error: {str(e)}")
