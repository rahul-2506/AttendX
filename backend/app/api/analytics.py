from typing import Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.database.models import Student, AttendanceRecord, ClassSession, ClassCourse, ClassEnrollment

router = APIRouter(prefix="/analytics", tags=["Analytics"])

@router.get("/overview")
def get_analytics_overview(class_id: Optional[str] = None, db: Session = Depends(get_db)):
    if class_id:
        sessions = db.query(ClassSession).filter(ClassSession.class_id == class_id).all()
        session_ids = [s.id for s in sessions]
        records = db.query(AttendanceRecord).filter(AttendanceRecord.session_id.in_(session_ids)).all() if session_ids else []
        total_enrolled = db.query(ClassEnrollment).filter(
            ClassEnrollment.class_id == class_id,
            ClassEnrollment.active == True
        ).count()
    else:
        records = db.query(AttendanceRecord).all()
        total_enrolled = db.query(Student).filter(Student.active == True).count()

    total_recs = len(records)
    avg_presence = sum(r.presence_percentage for r in records) / total_recs if total_recs > 0 else 0.0
    avg_duration = sum(r.present_duration for r in records) / total_recs if total_recs > 0 else 0.0
    flagged = sum(1 for r in records if r.status == "prolonged")
    quorum = (sum(1 for r in records if r.status == "present") / total_enrolled * 100) if total_enrolled > 0 else 0.0

    return {
        "overallAttendance": round(avg_presence, 1),
        "overallAttendanceDelta": "+0.0%",
        "avgPresenceDurationMinutes": round(avg_duration, 1),
        "totalClassDurationMinutes": 60,
        "avgQuorumPercentage": round(quorum, 1),
        "flaggedProlongedCount": flagged,
        "totalEnrolled": total_enrolled
    }

@router.get("/trends")
def get_analytics_trends(class_id: Optional[str] = None, db: Session = Depends(get_db)):
    if class_id:
        sessions = db.query(ClassSession).filter(ClassSession.class_id == class_id).all()
        session_ids = [s.id for s in sessions]
        records = db.query(AttendanceRecord).filter(AttendanceRecord.session_id.in_(session_ids)).all() if session_ids else []
        total_enrolled = db.query(ClassEnrollment).filter(
            ClassEnrollment.class_id == class_id,
            ClassEnrollment.active == True
        ).count()
    else:
        records = db.query(AttendanceRecord).all()
        total_enrolled = db.query(Student).filter(Student.active == True).count()

    present_count = sum(1 for r in records if r.status == "present")
    away_count = sum(1 for r in records if r.status == "away")
    prolonged_count = sum(1 for r in records if r.status == "prolonged")

    weekly_attendance = [
        {"day": "Mon", "rate": 0, "present": 0, "away": 0},
        {"day": "Tue", "rate": 0, "present": 0, "away": 0},
        {"day": "Wed", "rate": 0, "present": 0, "away": 0},
        {"day": "Thu", "rate": 0, "present": 0, "away": 0},
        {"day": "Fri", "rate": 0, "present": 0, "away": 0},
        {"day": "Sat", "rate": 0, "present": 0, "away": 0},
    ]

    status_distribution = [
        {"name": "Continuous Present (>90%)", "value": present_count, "color": "#10b981"},
        {"name": "Temporary Absence (<5m)", "value": away_count, "color": "#f59e0b"},
        {"name": "Prolonged Absence (>10m)", "value": prolonged_count, "color": "#ef4444"},
    ]

    department_breakdown = []
    if total_enrolled > 0:
        department_breakdown = [
            {"department": "Computer Science & Engineering", "attendance": 100.0, "total": total_enrolled}
        ]

    return {
        "weeklyAttendance": weekly_attendance,
        "statusDistribution": status_distribution,
        "departmentBreakdown": department_breakdown
    }
