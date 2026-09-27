import collections
import time
import uuid
from datetime import datetime
from typing import Optional, Dict, Any, List


class FocusSessionManager:
    """
    Manages the lifecycle and state machine of the active Focus Mode session.
    Tracks strictly observable visual presence using temporal smoothing (3-frame debounce).
    """

    def __init__(self):
        self.session_id: Optional[str] = None
        self.state: str = "NOT_STARTED"  # NOT_STARTED, FOCUSED, NOT_DETECTED, PAUSED, COMPLETED
        self.started_at: Optional[datetime] = None
        self.ended_at: Optional[datetime] = None
        self._last_tick: Optional[float] = None
        self._pre_pause_state: str = "FOCUSED"

        # Accumulated durations (in float seconds)
        self.present_seconds: float = 0.0
        self.not_detected_seconds: float = 0.0
        self.screen_facing_seconds: float = 0.0
        self.paused_seconds: float = 0.0

        # Temporal smoothing / debounce buffer (last 3 observations)
        self._debounce_buffer: collections.deque = collections.deque(maxlen=3)

    def start_session(self) -> Dict[str, Any]:
        """
        Starts a new focus tracking session.
        """
        now_dt = datetime.utcnow()
        now_ts = time.time()

        self.session_id = str(uuid.uuid4())
        self.state = "FOCUSED"
        self.started_at = now_dt
        self.ended_at = None
        self._last_tick = now_ts
        self._pre_pause_state = "FOCUSED"

        self.present_seconds = 0.0
        self.not_detected_seconds = 0.0
        self.screen_facing_seconds = 0.0
        self.paused_seconds = 0.0
        self._debounce_buffer.clear()
        # Seed buffer with True
        self._debounce_buffer.append(True)

        return self.get_status()

    def record_frame(self, present: bool, screen_facing: bool) -> Dict[str, Any]:
        """
        Integrates a single webcam observation frame into the state machine.
        Uses 3-frame temporal smoothing to eliminate single-frame detection flickers.
        """
        now = time.time()
        if self.state in {"NOT_STARTED", "COMPLETED"}:
            return self.get_status()

        if self._last_tick is None:
            self._last_tick = now

        delta = min(now - self._last_tick, 5.0)  # Cap delta at 5s in case of suspended tabs
        self._last_tick = now

        if self.state == "PAUSED":
            self.paused_seconds += delta
            return self.get_status()

        # Update debounce buffer
        self._debounce_buffer.append(present)
        # Smooth state: present if majority of recent frames detected a face
        present_count = sum(1 for p in self._debounce_buffer if p)
        smoothed_present = present_count >= (len(self._debounce_buffer) / 2.0)

        if smoothed_present:
            self.state = "FOCUSED"
            self.present_seconds += delta
            if screen_facing:
                self.screen_facing_seconds += delta
        else:
            self.state = "NOT_DETECTED"
            self.not_detected_seconds += delta

        return self.get_status()

    def pause_session(self) -> Dict[str, Any]:
        """
        Toggles pause state for the active session.
        """
        if self.state in {"NOT_STARTED", "COMPLETED"}:
            return self.get_status()

        now = time.time()
        if self._last_tick is not None:
            delta = min(now - self._last_tick, 5.0)
            if self.state == "FOCUSED":
                self.present_seconds += delta
            elif self.state == "NOT_DETECTED":
                self.not_detected_seconds += delta
            elif self.state == "PAUSED":
                self.paused_seconds += delta
        self._last_tick = now

        if self.state == "PAUSED":
            self.state = self._pre_pause_state or "FOCUSED"
        else:
            self._pre_pause_state = self.state
            self.state = "PAUSED"

        return self.get_status()

    def stop_session(self) -> Dict[str, Any]:
        """
        Concludes the active focus tracking session and calculates final metrics.
        """
        now = time.time()
        if self.state not in {"NOT_STARTED", "COMPLETED"}:
            if self._last_tick is not None:
                delta = min(now - self._last_tick, 5.0)
                if self.state == "FOCUSED":
                    self.present_seconds += delta
                elif self.state == "NOT_DETECTED":
                    self.not_detected_seconds += delta
                elif self.state == "PAUSED":
                    self.paused_seconds += delta

        self.ended_at = datetime.utcnow()
        self.state = "COMPLETED"
        self._last_tick = None

        return self.get_status()

    def get_status(self) -> Dict[str, Any]:
        """
        Returns live observable session status and current metrics.
        """
        # Flush live delta if running
        now = time.time()
        live_present = self.present_seconds
        live_not_detected = self.not_detected_seconds
        live_screen_facing = self.screen_facing_seconds
        live_paused = self.paused_seconds

        if self.state in {"FOCUSED", "NOT_DETECTED", "PAUSED"} and self._last_tick is not None:
            delta = min(now - self._last_tick, 5.0)
            if self.state == "FOCUSED":
                live_present += delta
            elif self.state == "NOT_DETECTED":
                live_not_detected += delta
            elif self.state == "PAUSED":
                live_paused += delta

        active_duration = live_present + live_not_detected
        total_duration = active_duration + live_paused

        # Focus Score formula: (present_seconds / active_session_duration) * 100
        if active_duration > 0:
            score = round((live_present / active_duration) * 100, 2)
        else:
            score = 100.0

        return {
            "session_id": self.session_id,
            "state": self.state,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "ended_at": self.ended_at.isoformat() if self.ended_at else None,
            "elapsed_seconds": int(total_duration),
            "present_seconds": int(live_present),
            "not_detected_seconds": int(live_not_detected),
            "screen_facing_seconds": int(live_screen_facing),
            "paused_seconds": int(live_paused),
            "focus_score": score,
        }


# Singleton instance
session_manager = FocusSessionManager()
