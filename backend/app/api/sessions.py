import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.database.models import (
    ClassSession,
    AttendanceRecord,
    Student,
    AttendanceEvent,
    ClassCourse,
    ClassEnrollment,
    TimetableEntry
)
from app.schemas.session import SessionCreate, SessionResponse
from app.attendance.engine import attendance_engine

router = APIRouter(prefix="/sessions", tags=["Sessions"])


@router.get("", response_model=List[SessionResponse])
def list_sessions(class_id: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(ClassSession)
    if class_id:
        query = query.filter(ClassSession.class_id == class_id)

    sessions = query.order_by(ClassSession.start_time.desc()).all()
    results = []
    for sess in sessions:
        records = db.query(AttendanceRecord).filter(AttendanceRecord.session_id == sess.id).all()
        enrolled_in_class = 0
        if sess.class_id:
            enrolled_in_class = db.query(ClassEnrollment).filter(
                ClassEnrollment.class_id == sess.class_id,
                ClassEnrollment.active == True
            ).count()

        total_enrolled = len(records) or enrolled_in_class
        present = sum(1 for r in records if r.status == "present")
        away = sum(1 for r in records if r.status == "away")
        prolonged = sum(1 for r in records if r.status == "prolonged")
        avg_presence = sum(r.presence_percentage for r in records) / len(records) if records else 0.0

        results.append(SessionResponse(
            id=sess.id,
            course_code=sess.course_code,
            course_name=sess.course_name,
            section=sess.section,
            room=sess.room,
            instructor=sess.instructor,
            duration_minutes=sess.duration_minutes,
            start_time=sess.start_time,
            end_time=sess.end_time,
            status=sess.status,
            total_enrolled=total_enrolled,
            students_present=present,
            temporarily_away=away,
            prolonged_absence=prolonged,
            average_presence=round(avg_presence, 1)
        ))
    return results


@router.get("/today")
def get_today_schedule(db: Session = Depends(get_db)):
    """
    Returns today's schedule for the teacher:
    - Today's day of week (0=Mon..6=Sun)
    - List of scheduled classes with status (NOW, UPCOMING, ACTIVE, COMPLETED)
    - Active session if one exists
    """
    now = datetime.datetime.now()
    current_day = now.weekday()  # 0=Monday, 6=Sunday
    current_time_str = now.strftime("%I:%M %p")

    # Get active session if any
    active_session = db.query(ClassSession).filter(ClassSession.status == "active").first()

    # Find timetable entries for today across all classes
    timetable_entries = db.query(TimetableEntry).filter(
        TimetableEntry.day_of_week == current_day
    ).all()

    # If no entries found for today, fallback to showing all classes with default slots
    all_classes = db.query(ClassCourse).all()
    schedule_items = []

    # Map today's completed sessions
    today_start = datetime.datetime(now.year, now.month, now.day)
    completed_sessions_today = db.query(ClassSession).filter(
        ClassSession.start_time >= today_start,
        ClassSession.status == "completed"
    ).all()
    completed_class_ids = {s.class_id for s in completed_sessions_today}

    if timetable_entries:
        for tt in timetable_entries:
            cls = tt.class_course
            if not cls:
                continue

            enrolled_count = db.query(ClassEnrollment).filter(
                ClassEnrollment.class_id == cls.id,
                ClassEnrollment.active == True
            ).count()

            # Determine slot status
            status_tag = "UPCOMING"
            active_sess_id = None

            if active_session and active_session.class_id == cls.id:
                status_tag = "ACTIVE"
                active_sess_id = active_session.id
            elif cls.id in completed_class_ids:
                status_tag = "COMPLETED"
            else:
                # Compare times if possible
                try:
                    # Parse start_time (e.g. "02:00 PM" or "14:00")
                    start_t = datetime.datetime.strptime(tt.start_time.strip(), "%I:%M %p").time()
                    end_t = datetime.datetime.strptime(tt.end_time.strip(), "%I:%M %p").time()
                    now_t = now.time()
                    if start_t <= now_t <= end_t:
                        status_tag = "NOW"
                    elif now_t > end_t:
                        status_tag = "COMPLETED"
                    else:
                        status_tag = "UPCOMING"
                except Exception:
                    status_tag = "UPCOMING"

            schedule_items.append({
                "timetable_id": tt.id,
                "class_id": cls.id,
                "course_code": cls.course_code,
                "course_name": cls.name,
                "section": cls.section,
                "room": tt.room or cls.room,
                "color": cls.color,
                "start_time": tt.start_time,
                "end_time": tt.end_time,
                "enrolled_count": enrolled_count,
                "status": status_tag,
                "active_session_id": active_sess_id
            })
    else:
        # Fallback if no timetable defined for today: show all classes with standard times
        for idx, cls in enumerate(all_classes):
            enrolled_count = db.query(ClassEnrollment).filter(
                ClassEnrollment.class_id == cls.id,
                ClassEnrollment.active == True
            ).count()

            status_tag = "UPCOMING"
            active_sess_id = None
            if active_session and active_session.class_id == cls.id:
                status_tag = "ACTIVE"
                active_sess_id = active_session.id
            elif idx == 0:
                status_tag = "NOW"

            schedule_items.append({
                "timetable_id": f"tt-fallback-{cls.id}",
                "class_id": cls.id,
                "course_code": cls.course_code,
                "course_name": cls.name,
                "section": cls.section,
                "room": cls.room,
                "color": cls.color,
                "start_time": f"0{2+idx}:00 PM",
                "end_time": f"0{3+idx}:00 PM",
                "enrolled_count": enrolled_count,
                "status": status_tag,
                "active_session_id": active_sess_id
            })

    day_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

    return {
        "date_str": now.strftime("%A, %B %d, %Y"),
        "time_str": current_time_str,
        "day_name": day_names[current_day],
        "active_session": {
            "id": active_session.id,
            "class_id": active_session.class_id,
            "course_code": active_session.course_code,
            "course_name": active_session.course_name,
            "section": active_session.section,
            "room": active_session.room,
            "start_time": active_session.start_time.strftime("%I:%M %p")
        } if active_session else None,
        "classes": schedule_items
    }


@router.get("/current")
def get_current_session(db: Session = Depends(get_db)):
    active = db.query(ClassSession).filter(ClassSession.status == "active").first()
    if not active:
        # Fallback to latest session
        active = db.query(ClassSession).order_by(ClassSession.start_time.desc()).first()

    if not active:
        raise HTTPException(status_code=404, detail="No active class session found")

    records = db.query(AttendanceRecord).filter(AttendanceRecord.session_id == active.id).all()
    
    # Calculate enrolled count specifically for this session's class
    if active.class_id:
        total_enrolled = db.query(ClassEnrollment).filter(
            ClassEnrollment.class_id == active.class_id,
            ClassEnrollment.active == True
        ).count()
    else:
        total_enrolled = len(records)

    present = sum(1 for r in records if r.status == "present")
    away = sum(1 for r in records if r.status == "away")
    prolonged = sum(1 for r in records if r.status == "prolonged")
    not_detected = sum(1 for r in records if r.status == "not_detected")
    avg_presence = sum(r.presence_percentage for r in records) / len(records) if records else 0.0

    return {
        "id": active.id,
        "classId": active.class_id,
        "date": active.start_time.strftime("Today • %b %d, %Y"),
        "courseCode": active.course_code,
        "courseName": active.course_name,
        "section": active.section,
        "room": active.room,
        "instructor": active.instructor,
        "startTime": active.start_time.strftime("%I:%M %p"),
        "endTime": (active.start_time + datetime.timedelta(minutes=active.duration_minutes)).strftime("%I:%M %p"),
        "durationMinutes": active.duration_minutes,
        "totalEnrolled": total_enrolled,
        "studentsPresent": present,
        "temporarilyAway": away,
        "prolongedAbsence": prolonged,
        "notDetected": not_detected,
        "unregisteredDetected": 0,
        "averagePresence": round(avg_presence, 1),
        "flaggedStudents": prolonged,
        "status": active.status
    }


@router.post("", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
def create_session(session_in: SessionCreate, db: Session = Depends(get_db)):
    now = datetime.datetime.utcnow()
    session_id = f"SES-{now.strftime('%Y%m%d%H%M')}-{session_in.course_code}"

    # Find matching class if exists
    cls = db.query(ClassCourse).filter(ClassCourse.course_code == session_in.course_code).first()

    sess = ClassSession(
        id=session_id,
        class_id=cls.id if cls else None,
        course_code=session_in.course_code,
        course_name=session_in.course_name,
        section=session_in.section,
        room=session_in.room,
        instructor=session_in.instructor,
        duration_minutes=session_in.duration_minutes,
        start_time=now,
        status="active"
    )
    db.add(sess)

    # Initialize attendance records ONLY for students enrolled in this class
    if cls:
        enrollments = db.query(ClassEnrollment).filter(
            ClassEnrollment.class_id == cls.id,
            ClassEnrollment.active == True
        ).all()
        enrolled_students = [enr.student for enr in enrollments if enr.student and enr.student.active]
    else:
        enrolled_students = db.query(Student).filter(Student.active == True).all()

    for s in enrolled_students:
        rec = AttendanceRecord(
            id=f"rec-{session_id}-{s.id}",
            session_id=session_id,
            student_id=s.id,
            status="not_detected",
            first_seen=None,
            last_seen=None,
            present_duration=0,
            away_duration=0,
            presence_percentage=0.0,
            currently_present=False
        )
        db.add(rec)

    db.commit()
    db.refresh(sess)

    # Inform attendance engine and reset temporal tracker
    from app.vision.camera_manager import camera_manager
    camera_manager.reset_tracker()
    attendance_engine.start_session(session_id, db)

    return SessionResponse(
        id=sess.id,
        course_code=sess.course_code,
        course_name=sess.course_name,
        section=sess.section,
        room=sess.room,
        instructor=sess.instructor,
        duration_minutes=sess.duration_minutes,
        start_time=sess.start_time,
        end_time=sess.end_time,
        status=sess.status,
        total_enrolled=len(enrolled_students),
        students_present=0,
        temporarily_away=0,
        prolonged_absence=0,
        average_presence=0.0
    )


@router.post("/{session_id}/end")
def end_session(session_id: str, db: Session = Depends(get_db)):
    sess = db.query(ClassSession).filter(ClassSession.id == session_id).first()
    if not sess:
        raise HTTPException(status_code=404, detail="Session not found")

    sess.status = "completed"
    sess.end_time = datetime.datetime.utcnow()

    # Log end event
    end_event = AttendanceEvent(
        id=f"evt-end-{session_id}",
        session_id=session_id,
        event_type="session_ended",
        timestamp=datetime.datetime.utcnow(),
        message=f"Class session {sess.course_name} ({sess.course_code}) completed and saved.",
        badge_text="Session Finalized",
        confidence=100.0
    )
    db.add(end_event)

    db.commit()

    # Stop engine tracking and reset temporal tracker
    from app.vision.camera_manager import camera_manager
    camera_manager.reset_tracker()
    attendance_engine.end_session(session_id, db)

    return {
        "message": f"Session {session_id} successfully ended and attendance finalized",
        "session_id": session_id,
        "status": "completed"
    }
