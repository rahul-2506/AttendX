import time
import datetime
from typing import Dict, Any, List, Optional, Set
from sqlalchemy.orm import Session
from app.database.models import Student, ClassSession, AttendanceRecord, AttendanceEvent, ClassEnrollment
from app.websocket.manager import ws_manager
from app.core.logger import log, metrics

def format_duration(seconds: float) -> str:
    mins = int(seconds // 60)
    secs = int(seconds % 60)
    return f"{mins}m {secs:02d}s"

class StudentAttendanceState:
    """
    In-memory state for continuous presence monitoring of a single enrolled student.
    Tracks exact timestamps, accumulated seconds, and state transitions.
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
        
        self.status = "NOT_SEEN"  # 'NOT_SEEN', 'PRESENT', 'UNCERTAIN', 'TEMPORARILY_AWAY', 'PROLONGED_ABSENCE', 'RETURNED'
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
        self.last_logged_status: Optional[str] = None


class AttendanceEngine:
    """
    Intelligent Time-Based Continuous Classroom Presence State Machine.
    
    Receives full-observation cycles from temporal vision tracker and computes exact
    present/away durations, presence percentages, anti-flicker grace periods, and audit events.
    """
    def __init__(
        self,
        uncertain_threshold_seconds: float = 60.0,
        temporary_absence_threshold_minutes: float = 5.0,
        prolonged_absence_threshold_minutes: float = 10.0
    ):
        self.active_session_id: Optional[str] = None
        self.session_start_time: Optional[float] = None
        self.session_duration_seconds: float = 3600.0  # default 60 mins
        
        self.uncertain_threshold_seconds = uncertain_threshold_seconds
        self.temporary_absence_threshold_seconds = temporary_absence_threshold_minutes * 60.0
        self.prolonged_absence_threshold_seconds = prolonged_absence_threshold_minutes * 60.0
        
        self.student_states: Dict[str, StudentAttendanceState] = {}
        self.is_paused = False
        self.last_unknown_event_time = 0.0
        self.last_db_sync_time = 0.0
        self.last_summary_log_time = 0.0

    def start_session(self, session_id: str, db: Session):
        """
        Initializes attendance state for all students enrolled in this active class session.
        """
        self.active_session_id = session_id
        self.session_start_time = time.time()
        self.student_states.clear()
        self.is_paused = False
        self.last_summary_log_time = time.time()

        sess = db.query(ClassSession).filter(ClassSession.id == session_id).first()
        class_name = sess.class_course.name if (sess and sess.class_course) else "Unknown Class"
        class_id = sess.class_id if sess else "N/A"
        
        if sess:
            self.session_duration_seconds = max(60.0, float(sess.duration_minutes * 60))

        records = db.query(AttendanceRecord).filter(AttendanceRecord.session_id == session_id).all()
        now = time.time()

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
            
            # Map existing record status
            if rec.status == "present":
                state.status = "PRESENT"
                state.first_seen_at = now
                state.last_seen_at = now
                state.last_confirmed_at = now
                state.total_present_seconds = rec.present_duration * 60.0
            elif rec.status == "away":
                state.status = "TEMPORARILY_AWAY"
                state.total_away_seconds = rec.away_duration * 60.0
                state.away_started_at = now
            elif rec.status == "prolonged":
                state.status = "PROLONGED_ABSENCE"
                state.total_away_seconds = rec.away_duration * 60.0
                state.away_started_at = now
            else:
                state.status = "NOT_SEEN"

            self.student_states[rec.student_id] = state

        log.session(f"STARTED | session_id={session_id} | class_id={class_id} | class_name={class_name} | students={len(self.student_states)}")
        if self.student_states:
            roster_names = ", ".join([f"{s.name} ({s.roll_number})" for s in self.student_states.values()])
            log.session(f"ROSTER | enrolled=[{roster_names}]")

    def end_session(self, session_id: str, db: Session):
        """
        Freezes calculations and writes final presence percentages and durations to DB.
        """
        if self.active_session_id == session_id:
            now = time.time()
            elapsed_total = now - (self.session_start_time or now)
            log.session(f"ENDING | session_id={session_id} | duration={format_duration(elapsed_total)}")

            sess = db.query(ClassSession).filter(ClassSession.id == session_id).first()
            session_duration = self.session_duration_seconds

            log.session("FINAL RESULTS:")
            for s_id, state in self.student_states.items():
                rec = db.query(AttendanceRecord).filter(AttendanceRecord.id == state.record_id).first()
                present_mins = int(state.total_present_seconds / 60.0)
                away_mins = int(state.total_away_seconds / 60.0)
                presence_pct = min(100.0, round((state.total_present_seconds / session_duration) * 100.0, 1)) if session_duration > 0 else 0.0

                if rec:
                    rec.present_duration = present_mins
                    rec.away_duration = away_mins
                    rec.presence_percentage = presence_pct
                    rec.status = "present" if state.status in ["PRESENT", "RETURNED"] else ("away" if state.status in ["UNCERTAIN", "TEMPORARILY_AWAY"] else ("prolonged" if state.status == "PROLONGED_ABSENCE" else "not_detected"))
                    rec.currently_present = state.status in ["PRESENT", "RETURNED"]

                log.session(f"  {state.name} ({state.roll_number}) | present={format_duration(state.total_present_seconds)} | away={format_duration(state.total_away_seconds)} | presence={presence_pct}% | status={state.status}")

            db.commit()
            log.session(f"COMPLETED | session_id={session_id} attendance finalized.")
            self.active_session_id = None
            self.student_states.clear()

    async def process_observation_cycle(
        self,
        observed_tracks: List[Dict[str, Any]],
        db: Session,
        is_camera_healthy: bool = True
    ):
        """
        Core cycle processor: Receives normalized observations for the active class and updates state machine.
        """
        if not self.active_session_id:
            return

        now = time.time()
        time_str = datetime.datetime.now().strftime("%I:%M:%S %p")

        # Camera Disconnect / Error handling
        if not is_camera_healthy:
            if not self.is_paused:
                self.is_paused = True
                log.warning("CAMERA", "stream unavailable")
                log.warning("ATTENDANCE", "evaluation PAUSED | reason=camera_failure")
                await ws_manager.broadcast({
                    "type": "camera_health",
                    "status": "disconnected",
                    "message": "Vision pipeline paused. Attendance evaluation suspended."
                })
            return
        elif self.is_paused:
            self.is_paused = False
            log.camera("stream restored")
            log.attendance("evaluation RESUMED")
            await ws_manager.broadcast({
                "type": "camera_health",
                "status": "connected",
                "message": "Vision pipeline active."
            })

        # Set of confirmed enrolled student IDs in current cycle
        observed_confirmed_ids: Set[str] = set()

        for obs in observed_tracks:
            s_id = obs.get("student_id")
            if s_id and obs.get("is_confirmed", False):
                observed_confirmed_ids.add(s_id)
                await self._handle_student_confirmed(s_id, obs, now, time_str, db)
            elif not s_id:
                # Unknown person in frame
                await self._handle_unknown_face(obs, now, time_str, db)

        # Handle students NOT observed in this cycle
        for s_id, state in list(self.student_states.items()):
            if s_id not in observed_confirmed_ids:
                await self._handle_student_unobserved(state, now, time_str, db)

        # Periodic DB synchronization (every 3 seconds)
        if now - self.last_db_sync_time > 3.0:
            self.last_db_sync_time = now
            self._sync_all_to_db(db)

        # Periodic Attendance Summary log (every 10 seconds)
        if now - self.last_summary_log_time >= 10.0:
            self.last_summary_log_time = now
            self._log_periodic_summary()

    def _log_periodic_summary(self):
        if not self.student_states:
            return
        log.attendance("SUMMARY (10s window):")
        for state in self.student_states.values():
            pct = self._calc_presence_pct(state)
            last_seen_str = datetime.datetime.fromtimestamp(state.last_seen_at).strftime("%H:%M:%S") if state.last_seen_at else "Never"
            log.attendance(
                f"  {state.name}: state={state.status} | present={format_duration(state.total_present_seconds)} | "
                f"away={format_duration(state.total_away_seconds)} | presence={pct}% | last_seen={last_seen_str}"
            )

    async def _handle_student_confirmed(
        self,
        student_id: str,
        obs: Dict[str, Any],
        now: float,
        time_str: str,
        db: Session
    ):
        state = self.student_states.get(student_id)
        if not state:
            return  # Student not enrolled in active class

        dt = max(0.0, min(1.0, now - state.last_tick_at))
        state.last_tick_at = now
        state.total_present_seconds += dt
        state.last_seen_at = now
        state.last_confirmed_at = now
        state.consecutive_unobserved_cycles = 0
        state.recognition_count += 1
        
        conf = obs.get("identity_confidence", 95.0)
        state.average_confidence = round(0.9 * state.average_confidence + 0.1 * conf, 1)

        prev_status = state.status

        if prev_status == "NOT_SEEN":
            # Initial recognition
            state.status = "PRESENT"
            state.first_seen_at = now
            state.away_started_at = None

            time_hms = datetime.datetime.fromtimestamp(now).strftime("%H:%M:%S")
            log.attendance(f"STATE_CHANGE | student={state.name} | NOT_SEEN \u2192 PRESENT | reason=face_recognized | time={time_hms}")

            # Persist event
            event = AttendanceEvent(
                id=f"evt-rec-{int(now * 1000)}-{student_id}",
                session_id=self.active_session_id,
                student_id=student_id,
                event_type="STUDENT_RECOGNIZED",
                timestamp=datetime.datetime.utcnow(),
                confidence=conf,
                message=f"{state.name} ({state.roll_number}) verified present in classroom",
                badge_text="Present"
            )
            db.add(event)
            db.commit()

            await ws_manager.broadcast({
                "type": "student_recognized",
                "student_id": state.roll_number,
                "name": state.name,
                "status": "present",
                "presence_percentage": self._calc_presence_pct(state),
                "present_duration": int(state.total_present_seconds / 60.0),
                "away_duration": int(state.total_away_seconds / 60.0),
                "timestamp": time_str
            })

        elif prev_status in ["UNCERTAIN", "TEMPORARILY_AWAY", "PROLONGED_ABSENCE"]:
            # Returned to classroom
            away_dur = 0.0
            if state.away_started_at:
                away_dur = max(0.0, now - state.away_started_at)
                state.total_away_seconds += away_dur
                state.away_started_at = None

            state.status = "RETURNED"
            time_hms = datetime.datetime.fromtimestamp(now).strftime("%H:%M:%S")
            log.attendance(f"STATE_CHANGE | student={state.name} | {prev_status} \u2192 RETURNED | reason=reidentified | away_duration={away_dur:.1f}s | time={time_hms}")

            event = AttendanceEvent(
                id=f"evt-ret-{int(now * 1000)}-{student_id}",
                session_id=self.active_session_id,
                student_id=student_id,
                event_type="STUDENT_RETURNED",
                timestamp=datetime.datetime.utcnow(),
                confidence=conf,
                message=f"{state.name} ({state.roll_number}) returned to classroom view",
                badge_text="Returned"
            )
            db.add(event)
            db.commit()

            await ws_manager.broadcast({
                "type": "student_returned",
                "student_id": state.roll_number,
                "name": state.name,
                "status": "present",
                "presence_percentage": self._calc_presence_pct(state),
                "present_duration": int(state.total_present_seconds / 60.0),
                "away_duration": int(state.total_away_seconds / 60.0),
                "message": f"{state.name} returned to class",
                "timestamp": time_str
            })

            log.attendance(f"STATE_CHANGE | student={state.name} | RETURNED \u2192 PRESENT")
            state.status = "PRESENT"

    async def _handle_student_unobserved(
        self,
        state: StudentAttendanceState,
        now: float,
        time_str: str,
        db: Session
    ):
        if state.status == "NOT_SEEN" or not state.last_seen_at:
            return  # Student has never entered class

        state.consecutive_unobserved_cycles += 1
        time_since_last_seen = now - state.last_seen_at
        time_hms = datetime.datetime.fromtimestamp(now).strftime("%H:%M:%S")

        # 1. Grace Period / UNCERTAIN (0 to 60s)
        if time_since_last_seen < self.uncertain_threshold_seconds:
            if state.status == "PRESENT":
                state.status = "UNCERTAIN"
                log.attendance(f"STATE_CHANGE | student={state.name} | PRESENT \u2192 UNCERTAIN | reason=track_lost | time={time_hms}")
            return  # Anti-flicker protection: do not mark absent yet

        # 2. TEMPORARILY_AWAY (1 to 5 mins)
        if time_since_last_seen < self.prolonged_absence_threshold_seconds:
            if state.status != "TEMPORARILY_AWAY":
                prev = state.status
                state.status = "TEMPORARILY_AWAY"
                state.away_started_at = state.away_started_at or (now - self.uncertain_threshold_seconds)
                away_dur = now - state.away_started_at
                log.attendance(f"STATE_CHANGE | student={state.name} | {prev} \u2192 TEMPORARILY_AWAY | away_duration={away_dur:.1f}s | time={time_hms}")

                event = AttendanceEvent(
                    id=f"evt-away-{int(now * 1000)}-{state.student_id}",
                    session_id=self.active_session_id,
                    student_id=state.student_id,
                    event_type="TEMPORARILY_AWAY",
                    timestamp=datetime.datetime.utcnow(),
                    confidence=None,
                    message=f"{state.name} ({state.roll_number}) temporarily away from classroom",
                    badge_text="Away"
                )
                db.add(event)
                db.commit()

                await ws_manager.broadcast({
                    "type": "student_temporary_absence",
                    "student_id": state.roll_number,
                    "name": state.name,
                    "status": "away",
                    "presence_percentage": self._calc_presence_pct(state),
                    "present_duration": int(state.total_present_seconds / 60.0),
                    "away_duration": int((state.total_away_seconds + (now - state.away_started_at)) / 60.0),
                    "message": f"{state.name} temporarily away",
                    "timestamp": time_str
                })

        # 3. PROLONGED_ABSENCE (> 10 mins)
        else:
            if state.status != "PROLONGED_ABSENCE":
                prev = state.status
                state.status = "PROLONGED_ABSENCE"
                state.away_started_at = state.away_started_at or (now - time_since_last_seen)
                away_dur = now - state.away_started_at
                log.attendance(f"STATE_CHANGE | student={state.name} | {prev} \u2192 PROLONGED_ABSENCE | away_duration={away_dur:.1f}s | time={time_hms}")

                event = AttendanceEvent(
                    id=f"evt-prolong-{int(now * 1000)}-{state.student_id}",
                    session_id=self.active_session_id,
                    student_id=state.student_id,
                    event_type="PROLONGED_ABSENCE",
                    timestamp=datetime.datetime.utcnow(),
                    confidence=None,
                    message=f"Prolonged absence flagged: {state.name} away > {int(self.prolonged_absence_threshold_seconds/60)}m",
                    badge_text="Prolonged Absence"
                )
                db.add(event)
                db.commit()

                await ws_manager.broadcast({
                    "type": "student_prolonged_absence",
                    "student_id": state.roll_number,
                    "name": state.name,
                    "status": "prolonged",
                    "presence_percentage": self._calc_presence_pct(state),
                    "present_duration": int(state.total_present_seconds / 60.0),
                    "away_duration": int((state.total_away_seconds + (now - state.away_started_at)) / 60.0),
                    "message": f"Prolonged absence flagged: {state.name} away > {int(self.prolonged_absence_threshold_seconds/60)}m",
                    "timestamp": time_str
                })

    async def _handle_unknown_face(
        self,
        obs: Dict[str, Any],
        now: float,
        time_str: str,
        db: Session
    ):
        # Debounce unknown face events (at most once every 6 seconds)
        if now - self.last_unknown_event_time < 6.0:
            return
        
        self.last_unknown_event_time = now

        event = AttendanceEvent(
            id=f"evt-unk-{int(now * 1000)}",
            session_id=self.active_session_id,
            student_id=None,
            event_type="UNKNOWN_FACE",
            timestamp=datetime.datetime.utcnow(),
            confidence=obs.get("tracking_confidence", 70.0),
            message="Unregistered person detected in classroom camera view",
            badge_text="Unknown Person"
        )
        db.add(event)
        db.commit()

        await ws_manager.broadcast({
            "type": "unknown_face",
            "message": "Unregistered person detected in classroom",
            "confidence": round(obs.get("tracking_confidence", 0.7) * 100, 1),
            "timestamp": time_str
        })

    def _calc_presence_pct(self, state: StudentAttendanceState) -> float:
        if self.session_duration_seconds <= 0:
            return 0.0
        return min(100.0, round((state.total_present_seconds / self.session_duration_seconds) * 100.0, 1))

    def _sync_all_to_db(self, db: Session):
        for s_id, state in self.student_states.items():
            rec = db.query(AttendanceRecord).filter(AttendanceRecord.id == state.record_id).first()
            if rec:
                rec.present_duration = int(state.total_present_seconds / 60.0)
                rec.away_duration = int(state.total_away_seconds / 60.0)
                rec.presence_percentage = self._calc_presence_pct(state)
                rec.status = "present" if state.status in ["PRESENT", "RETURNED", "UNCERTAIN"] else ("away" if state.status == "TEMPORARILY_AWAY" else ("prolonged" if state.status == "PROLONGED_ABSENCE" else "not_detected"))
                rec.currently_present = state.status in ["PRESENT", "RETURNED", "UNCERTAIN"]
                rec.confidence = state.average_confidence
        db.commit()

    def get_attendance_breakdown(self) -> Dict[str, int]:
        counts = {"present": 0, "uncertain": 0, "temporarily_away": 0, "prolonged_absence": 0, "not_seen": 0}
        for state in self.student_states.values():
            if state.status == "PRESENT" or state.status == "RETURNED":
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
