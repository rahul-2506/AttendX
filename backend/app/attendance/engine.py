import time
import datetime
import asyncio
from typing import Dict, Any, List, Optional, Set, Union
from sqlalchemy.orm import Session
from app.config import settings
from app.database.database import SessionLocal
from app.database.models import Student, ClassSession, AttendanceRecord, AttendanceEvent, ClassEnrollment, SystemSetting
from app.websocket.manager import ws_manager
from app.core.logger import log, metrics


def format_duration(seconds: float) -> str:
    mins = int(seconds // 60)
    secs = int(seconds % 60)
    return f"{mins}m {secs:02d}s"


class StudentAttendanceState:
    """
    In-memory state for continuous presence monitoring of a single enrolled student.
    Tracks exact timestamps, accumulated seconds, state transitions, and override stickiness.
    """
    def __init__(
        self,
        student_id: str,
        record_id: str,
        roll_number: str,
        name: str
    ):
        self.student_id = student_id
        self.record_id = record_id
        self.roll_number = roll_number
        self.name = name

        # States: 'NOT_SEEN', 'PRESENT', 'UNCERTAIN', 'TEMPORARILY_AWAY', 'PROLONGED_ABSENCE', 'RETURNED'
        self.status = "NOT_SEEN"
        self.first_seen_at: Optional[float] = None
        self.last_seen_at: Optional[float] = None
        self.last_confirmed_at: Optional[float] = None
        self.away_started_at: Optional[float] = None

        self.total_present_seconds: float = 0.0
        self.total_away_seconds: float = 0.0
        self.last_tick_at: float = time.time()

        self.recognition_count = 0
        self.average_confidence = 95.0
        self.consecutive_unobserved_cycles = 0

        # Teacher Override Management
        self.is_overridden: bool = False
        self.override_status: Optional[str] = None
        self.flag_reason: Optional[str] = None

        # Tracking state changes to avoid writing to DB on every frame
        self.last_persisted_status: str = "NOT_SEEN"


class AttendanceEngine:
    """
    Intelligent Time-Based Continuous Classroom Presence State Machine.
    Decides student presence over time, accounts for momentary occlusions (anti-flicker),
    grace periods, prolonged absences, unregistered faces, and teacher overrides.
    """
    def __init__(
        self,
        uncertain_threshold_seconds: Optional[float] = None,
        temporary_absence_threshold_minutes: Optional[float] = None,
        prolonged_absence_threshold_minutes: Optional[float] = None,
        present_threshold_percent: Optional[float] = None,
        partial_threshold_percent: Optional[float] = None
    ):
        self.active_session_id: Optional[str] = None
        self.session_start_time: Optional[float] = None
        self.session_duration_seconds: float = float(settings.DEFAULT_CLASS_DURATION_MINUTES * 60)

        # Configurable thresholds
        self.uncertain_threshold_seconds: float = (
            uncertain_threshold_seconds
            if uncertain_threshold_seconds is not None
            else float(settings.DEFAULT_UNCERTAIN_THRESHOLD_SECONDS)
        )
        self.temporary_absence_threshold_seconds: float = (
            temporary_absence_threshold_minutes * 60.0
            if temporary_absence_threshold_minutes is not None
            else float(settings.DEFAULT_TEMPORARY_ABSENCE_MINUTES * 60)
        )
        self.prolonged_absence_threshold_seconds: float = (
            prolonged_absence_threshold_minutes * 60.0
            if prolonged_absence_threshold_minutes is not None
            else float(settings.DEFAULT_PROLONGED_ABSENCE_MINUTES * 60)
        )
        self.present_threshold_percent: float = (
            present_threshold_percent
            if present_threshold_percent is not None
            else float(getattr(settings, "DEFAULT_PRESENT_THRESHOLD_PERCENT", 75.0))
        )
        self.partial_threshold_percent: float = (
            partial_threshold_percent
            if partial_threshold_percent is not None
            else float(getattr(settings, "DEFAULT_PARTIAL_THRESHOLD_PERCENT", 50.0))
        )

        self.student_states: Dict[str, StudentAttendanceState] = {}
        self.is_paused: bool = False
        self.demo_mode: bool = False
        self.last_unknown_event_time: float = 0.0
        self.last_db_sync_time: float = 0.0
        self.last_summary_log_time: float = 0.0

    def configure_from_settings(self, db: Optional[Session] = None):
        """
        Dynamically updates thresholds from system settings (DB or config.py).
        """
        if db is not None:
            try:
                rows = db.query(SystemSetting).all()
                s_map = {r.key: r.value for r in rows}
                if "temporary_absence_threshold_minutes" in s_map:
                    self.temporary_absence_threshold_seconds = float(s_map["temporary_absence_threshold_minutes"]) * 60.0
                if "prolonged_absence_threshold_minutes" in s_map:
                    self.prolonged_absence_threshold_seconds = float(s_map["prolonged_absence_threshold_minutes"]) * 60.0
                if "uncertain_threshold_seconds" in s_map:
                    self.uncertain_threshold_seconds = float(s_map["uncertain_threshold_seconds"])
                if "present_threshold_percent" in s_map:
                    self.present_threshold_percent = float(s_map["present_threshold_percent"])
            except Exception as e:
                log.warning("ENGINE", f"Failed to load settings from DB: {e}")

    def set_thresholds(
        self,
        uncertain_seconds: Optional[float] = None,
        temporary_minutes: Optional[float] = None,
        prolonged_minutes: Optional[float] = None,
        present_percent: Optional[float] = None
    ):
        """
        Directly sets engine thresholds.
        """
        if uncertain_seconds is not None:
            self.uncertain_threshold_seconds = float(uncertain_seconds)
        if temporary_minutes is not None:
            self.temporary_absence_threshold_seconds = float(temporary_minutes * 60.0)
        if prolonged_minutes is not None:
            self.prolonged_absence_threshold_seconds = float(prolonged_minutes * 60.0)
        if present_percent is not None:
            self.present_threshold_percent = float(present_percent)

    def _broadcast_ws(self, message: dict):
        """
        Safe WebSocket broadcast that works across async and sync contexts.
        """
        try:
            loop = asyncio.get_running_loop()
            loop.create_task(ws_manager.broadcast(message))
        except RuntimeError:
            pass

    def start_session(self, session_id: str, db: Session, start_time: Optional[float] = None):
        """
        Initializes attendance state for all students enrolled in this class session.
        """
        self.active_session_id = session_id
        now = start_time if start_time is not None else time.time()
        self.session_start_time = now
        self.student_states.clear()
        self.is_paused = False
        self.last_summary_log_time = now

        self.configure_from_settings(db)

        sess = db.query(ClassSession).filter(ClassSession.id == session_id).first()
        class_name = sess.course_name if sess else "Unknown Course"
        class_id = sess.class_id if sess else "N/A"

        if sess and sess.duration_minutes:
            self.session_duration_seconds = max(60.0, float(sess.duration_minutes * 60))

        records = db.query(AttendanceRecord).filter(AttendanceRecord.session_id == session_id).all()

        for rec in records:
            student = rec.student
            roll = student.roll_number if student else rec.student_id
            name = student.name if student else "Student"

            state = StudentAttendanceState(
                student_id=rec.student_id,
                record_id=rec.id,
                roll_number=roll,
                name=name
            )
            state.last_tick_at = now

            if rec.status == "present":
                state.status = "PRESENT"
                state.first_seen_at = now
                state.last_seen_at = now
                state.last_confirmed_at = now
                state.total_present_seconds = float(rec.present_duration * 60.0)
                state.last_persisted_status = "PRESENT"
            elif rec.status == "away":
                state.status = "TEMPORARILY_AWAY"
                state.total_away_seconds = float(rec.away_duration * 60.0)
                state.away_started_at = now
                state.last_persisted_status = "TEMPORARILY_AWAY"
            elif rec.status == "prolonged":
                state.status = "PROLONGED_ABSENCE"
                state.total_away_seconds = float(rec.away_duration * 60.0)
                state.away_started_at = now
                state.last_persisted_status = "PROLONGED_ABSENCE"
            else:
                state.status = "NOT_SEEN"
                state.last_persisted_status = "NOT_SEEN"

            self.student_states[rec.student_id] = state

        log.session(f"STARTED | session_id={session_id} | course={class_name} | enrolled={len(self.student_states)}")

    def override_student(
        self,
        identifier: str,
        new_status: str,
        reason: Optional[str] = None,
        db: Optional[Session] = None
    ) -> bool:
        """
        Applies a faculty manual override that takes absolute priority over automatic state degradation.
        Remains sticky until the session ends.
        """
        state = None
        for s in self.student_states.values():
            if s.student_id == identifier or s.roll_number == identifier or s.record_id == identifier:
                state = s
                break

        now = time.time()
        time_str = datetime.datetime.fromtimestamp(now).strftime("%I:%M:%S %p")
        normalized = new_status.lower()

        if state:
            state.is_overridden = True
            state.override_status = normalized
            if normalized == "present":
                state.status = "PRESENT"
                state.away_started_at = None
                state.flag_reason = None
                state.last_seen_at = now
            elif normalized in ["away", "temporarily_away"]:
                state.status = "TEMPORARILY_AWAY"
                state.away_started_at = state.away_started_at or now
                state.flag_reason = reason or "Faculty marked away"
            elif normalized in ["prolonged", "prolonged_absence"]:
                state.status = "PROLONGED_ABSENCE"
                state.away_started_at = state.away_started_at or now
                state.flag_reason = reason or "Faculty marked prolonged absence"
            else:
                state.status = "NOT_SEEN"

            state.last_persisted_status = state.status

            # Broadcast override event
            self._broadcast_ws({
                "type": "manual_override",
                "student_id": state.roll_number,
                "name": state.name,
                "status": "present" if state.status == "PRESENT" else ("away" if state.status == "TEMPORARILY_AWAY" else "prolonged"),
                "reason": state.flag_reason,
                "presence_percentage": self._calc_presence_pct(state),
                "timestamp": time_str
            })

        # Update in database if session provided
        if db is not None:
            rec = None
            if state:
                rec = db.query(AttendanceRecord).filter(AttendanceRecord.id == state.record_id).first()
            if not rec:
                rec = db.query(AttendanceRecord).filter(
                    (AttendanceRecord.id == identifier) | (AttendanceRecord.student_id == identifier)
                ).first()

            if rec:
                rec.status = "present" if normalized == "present" else ("away" if normalized in ["away", "temporarily_away"] else "prolonged")
                rec.currently_present = (normalized == "present")
                rec.flag_reason = reason or f"Faculty manual override: {normalized}"

                event = AttendanceEvent(
                    id=f"evt-ovr-{int(now * 1000)}-{rec.student_id}",
                    session_id=rec.session_id,
                    student_id=rec.student_id,
                    event_type="MANUAL_OVERRIDE",
                    timestamp=datetime.datetime.utcnow(),
                    confidence=100.0,
                    message=f"Manual override: status set to {normalized.upper()}",
                    badge_text="Override"
                )
                db.add(event)
                db.commit()
                return True

        return state is not None

    def update(
        self,
        session_id: str,
        recognized_student_ids: Union[List[str], Set[str]],
        unknown_face_count: int = 0,
        now: Optional[float] = None,
        db: Optional[Session] = None
    ) -> Dict[str, Any]:
        """
        Main per-frame update method.
        Decides presence over time, handles flicker tolerance, grace periods, and prolonged absences.
        Only persists to DB and broadcasts when a state change occurs.
        """
        if now is None:
            now = time.time()

        if self.active_session_id != session_id:
            self.active_session_id = session_id
            if db:
                self.start_session(session_id, db, start_time=now)

        close_db_at_end = False
        if db is None:
            db = SessionLocal()
            close_db_at_end = True

        try:
            recognized_set = {str(sid) for sid in recognized_student_ids} if recognized_student_ids else set()
            time_str = datetime.datetime.fromtimestamp(now).strftime("%I:%M:%S %p")

            # 1. Unknown face detection
            if unknown_face_count > 0:
                if (now - self.last_unknown_event_time) >= 5.0:
                    self.last_unknown_event_time = now
                    evt = AttendanceEvent(
                        id=f"evt-unk-{int(now * 1000)}",
                        session_id=session_id,
                        student_id=None,
                        event_type="UNKNOWN_FACE",
                        timestamp=datetime.datetime.utcnow(),
                        confidence=75.0,
                        message=f"{unknown_face_count} unregistered person(s) detected in camera view",
                        badge_text="Unknown Face"
                    )
                    db.add(evt)
                    db.commit()

                    self._broadcast_ws({
                        "type": "unknown_face",
                        "count": unknown_face_count,
                        "message": "Unregistered person detected in classroom",
                        "timestamp": time_str
                    })

            # 2. Process all enrolled students
            for s_id, state in self.student_states.items():
                dt = max(0.0, now - state.last_tick_at)
                state.last_tick_at = now

                # If student is subject to a faculty manual override, override takes precedence
                if state.is_overridden:
                    if state.override_status == "present":
                        state.total_present_seconds += dt
                        state.last_seen_at = now
                    else:
                        state.total_away_seconds += dt
                    continue

                # Check if student is recognized in this frame
                is_recognized = (s_id in recognized_set) or (state.roll_number in recognized_set)

                if is_recognized:
                    state.last_seen_at = now
                    state.last_confirmed_at = now
                    state.consecutive_unobserved_cycles = 0
                    state.recognition_count += 1
                    state.total_present_seconds += dt

                    prev_status = state.status

                    if prev_status == "NOT_SEEN":
                        state.status = "PRESENT"
                        state.first_seen_at = now
                        state.away_started_at = None
                        self._handle_state_change(state, "PRESENT", "STUDENT_RECOGNIZED", f"{state.name} ({state.roll_number}) verified present", "Present", db, now, time_str)
                    elif prev_status in ["TEMPORARILY_AWAY", "PROLONGED_ABSENCE"]:
                        if state.away_started_at:
                            state.total_away_seconds += max(0.0, now - state.away_started_at)
                            state.away_started_at = None
                        state.status = "PRESENT"
                        self._handle_state_change(state, "PRESENT", "STUDENT_RETURNED", f"{state.name} ({state.roll_number}) returned to classroom view", "Returned", db, now, time_str)
                    elif prev_status == "UNCERTAIN":
                        state.status = "PRESENT"
                        state.away_started_at = None

                else:
                    # Student not recognized in current frame
                    if state.status == "NOT_SEEN" or state.last_seen_at is None:
                        # Student has not arrived yet
                        continue

                    state.consecutive_unobserved_cycles += 1
                    time_since_last_seen = now - state.last_seen_at

                    # State Rule A: unseen 0 - 60s -> UNCERTAIN (anti-flicker: still counted as present)
                    if time_since_last_seen < self.uncertain_threshold_seconds:
                        state.status = "UNCERTAIN"
                        state.total_present_seconds += dt  # Still counted as present during flicker grace window
                    # State Rule B: unseen between 60s and 5 min -> UNCERTAIN, away duration starts accumulating
                    elif time_since_last_seen < self.temporary_absence_threshold_seconds:
                        state.status = "UNCERTAIN"
                        state.total_away_seconds += dt
                        if state.away_started_at is None:
                            state.away_started_at = state.last_seen_at + self.uncertain_threshold_seconds
                    # State Rule C: unseen over 5 min -> TEMPORARILY_AWAY
                    elif time_since_last_seen < self.prolonged_absence_threshold_seconds:
                        state.total_away_seconds += dt
                        if state.away_started_at is None:
                            state.away_started_at = state.last_seen_at + self.uncertain_threshold_seconds

                        if state.status != "TEMPORARILY_AWAY":
                            state.status = "TEMPORARILY_AWAY"
                            self._handle_state_change(
                                state,
                                "TEMPORARILY_AWAY",
                                "TEMPORARILY_AWAY",
                                f"{state.name} ({state.roll_number}) stepped away from classroom (> {int(self.temporary_absence_threshold_seconds/60)}m)",
                                "Away",
                                db,
                                now,
                                time_str
                            )
                    # State Rule D: unseen over 10 min -> PROLONGED_ABSENCE
                    else:
                        state.total_away_seconds += dt
                        if state.away_started_at is None:
                            state.away_started_at = state.last_seen_at + self.uncertain_threshold_seconds

                        if state.status != "PROLONGED_ABSENCE":
                            state.status = "PROLONGED_ABSENCE"
                            state.flag_reason = f"Prolonged absence (> {int(self.prolonged_absence_threshold_seconds/60)}m)"
                            self._handle_state_change(
                                state,
                                "PROLONGED_ABSENCE",
                                "PROLONGED_ABSENCE",
                                f"Prolonged absence flagged: {state.name} away > {int(self.prolonged_absence_threshold_seconds/60)}m",
                                "Prolonged Absence",
                                db,
                                now,
                                time_str
                            )

            return {
                "session_id": session_id,
                "timestamp": now,
                "counts": self.get_attendance_breakdown()
            }

        finally:
            if close_db_at_end:
                db.close()

    def _handle_state_change(
        self,
        state: StudentAttendanceState,
        new_status: str,
        event_type: str,
        message: str,
        badge_text: str,
        db: Session,
        now: float,
        time_str: str
    ):
        """
        Only writes to the DB and broadcasts over WebSocket when a state change occurs.
        """
        state.last_persisted_status = new_status
        db_status = "present" if new_status in ["PRESENT", "RETURNED", "UNCERTAIN"] else ("away" if new_status == "TEMPORARILY_AWAY" else "prolonged")

        # 1. Update AttendanceRecord
        rec = db.query(AttendanceRecord).filter(AttendanceRecord.id == state.record_id).first()
        if rec:
            rec.status = db_status
            rec.currently_present = (db_status == "present")
            rec.present_duration = int(state.total_present_seconds / 60.0)
            rec.away_duration = int(state.total_away_seconds / 60.0)
            rec.presence_percentage = self._calc_presence_pct(state)
            rec.flag_reason = state.flag_reason
            if state.first_seen_at and not rec.first_seen:
                rec.first_seen = datetime.datetime.fromtimestamp(state.first_seen_at)
            if state.last_seen_at:
                rec.last_seen = datetime.datetime.fromtimestamp(state.last_seen_at)

        # 2. Add AttendanceEvent
        event = AttendanceEvent(
            id=f"evt-{event_type.lower()}-{int(now * 1000)}-{state.student_id}",
            session_id=self.active_session_id,
            student_id=state.student_id,
            event_type=event_type,
            timestamp=datetime.datetime.utcnow(),
            confidence=state.average_confidence,
            message=message,
            badge_text=badge_text
        )
        db.add(event)
        db.commit()

        # 3. Real-time WebSocket Broadcast
        self._broadcast_ws({
            "type": event_type.lower(),
            "student_id": state.roll_number,
            "name": state.name,
            "status": db_status,
            "presence_percentage": self._calc_presence_pct(state),
            "present_duration": int(state.total_present_seconds / 60.0),
            "away_duration": int(state.total_away_seconds / 60.0),
            "message": message,
            "timestamp": time_str
        })

    async def process_observation_cycle(
        self,
        observed_tracks: List[Dict[str, Any]],
        db: Session,
        is_camera_healthy: bool = True
    ):
        """
        Integration adapter for temporal tracker observations.
        """
        if not self.active_session_id:
            return

        if not is_camera_healthy:
            if not self.is_paused:
                self.is_paused = True
                await ws_manager.broadcast({
                    "type": "camera_health",
                    "status": "disconnected",
                    "message": "Camera stream paused."
                })
            return
        elif self.is_paused:
            self.is_paused = False
            await ws_manager.broadcast({
                "type": "camera_health",
                "status": "connected",
                "message": "Camera stream restored."
            })

        confirmed_ids = [
            obs.get("student_id")
            for obs in observed_tracks
            if obs.get("student_id") and obs.get("is_confirmed", False)
        ]
        unknown_count = sum(1 for obs in observed_tracks if not obs.get("student_id"))

        self.update(
            session_id=self.active_session_id,
            recognized_student_ids=confirmed_ids,
            unknown_face_count=unknown_count,
            now=time.time(),
            db=db
        )

    async def run_demo_step(self, db: Session):
        """
        Exercises the real attendance engine update loop during demo mode.
        """
        if not self.active_session_id or not self.student_states:
            return

        enrolled_ids = list(self.student_states.keys())
        if not enrolled_ids:
            return

        now = time.time()
        # In demo mode, simulate 80% students present, 1 away, and rare unknown face
        recognized = enrolled_ids[:max(1, int(len(enrolled_ids) * 0.8))]
        unknown_count = 1 if (int(now) % 30 == 0) else 0

        self.update(
            session_id=self.active_session_id,
            recognized_student_ids=recognized,
            unknown_face_count=unknown_count,
            now=now,
            db=db
        )

    def end_session(self, session_id: str, db: Session) -> Dict[str, Any]:
        """
        Freezes calculations and writes final presence percentages and statuses to DB.
        Computes final presence_percent = total_present_seconds / session_duration.
        """
        sess = db.query(ClassSession).filter(ClassSession.id == session_id).first()
        session_duration = self.session_duration_seconds
        if sess and sess.duration_minutes:
            session_duration = max(60.0, float(sess.duration_minutes * 60))

        results_list = []

        for s_id, state in list(self.student_states.items()):
            rec = db.query(AttendanceRecord).filter(AttendanceRecord.id == state.record_id).first()

            # Final presence percentage calculation
            presence_pct = min(100.0, round((state.total_present_seconds / session_duration) * 100.0, 1)) if session_duration > 0 else 0.0

            # Determine final status based on configurable threshold
            if state.is_overridden and state.override_status:
                final_status = state.override_status.lower()
            elif presence_pct >= self.present_threshold_percent:
                final_status = "present"
            elif presence_pct >= self.partial_threshold_percent:
                final_status = "away"
            else:
                final_status = "absent" if state.status in ["TEMPORARILY_AWAY", "PROLONGED_ABSENCE", "NOT_SEEN"] else "present"

            present_mins = int(state.total_present_seconds / 60.0)
            away_mins = int(state.total_away_seconds / 60.0)

            if rec:
                rec.present_duration = present_mins
                rec.away_duration = away_mins
                rec.presence_percentage = presence_pct
                rec.status = final_status
                rec.currently_present = (final_status == "present")

            results_list.append({
                "student_id": state.student_id,
                "roll_number": state.roll_number,
                "name": state.name,
                "status": final_status,
                "presence_percentage": presence_pct,
                "present_minutes": present_mins,
                "away_minutes": away_mins
            })

        db.commit()

        if self.active_session_id == session_id:
            self.active_session_id = None
            self.student_states.clear()

        return {
            "session_id": session_id,
            "status": "completed",
            "attendance_records": results_list
        }

    def _calc_presence_pct(self, state: StudentAttendanceState) -> float:
        if self.session_duration_seconds <= 0:
            return 0.0
        return min(100.0, round((state.total_present_seconds / self.session_duration_seconds) * 100.0, 1))

    def get_attendance_breakdown(self) -> Dict[str, int]:
        counts = {"present": 0, "uncertain": 0, "temporarily_away": 0, "prolonged_absence": 0, "not_seen": 0}
        for state in self.student_states.values():
            if state.status in ["PRESENT", "RETURNED"]:
                counts["present"] += 1
            elif state.status == "UNCERTAIN":
                counts["uncertain"] += 1
            elif state.status == "TEMPORARILY_AWAY":
                counts["temporarily_away"] += 1
            elif state.status == "PROLONGED_ABSENCE":
                counts["prolonged_absence"] += 1
            else:
                counts["not_seen"] += 1
        return counts


attendance_engine = AttendanceEngine()
