import io
import csv
from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.database.models import ClassSession, AttendanceRecord, Student

router = APIRouter(prefix="/reports", tags=["Reports"])

@router.get("/session/{session_id}/csv")
def export_session_csv(session_id: str, db: Session = Depends(get_db)):
    sess = db.query(ClassSession).filter(ClassSession.id == session_id).first()
    if not sess:
        sess = db.query(ClassSession).first()

    if not sess:
        raise HTTPException(status_code=404, detail="No session found")

    records = db.query(AttendanceRecord).filter(AttendanceRecord.session_id == sess.id).all()

    output = io.StringIO()
    writer = csv.writer(output)

    # Header
    writer.writerow([
        "Roll Number",
        "Student Name",
        "Department",
        "Batch",
        "Attendance Status",
        "Presence %",
        "Present Duration (Mins)",
        "Away Duration (Mins)",
        "First Seen",
        "Last Seen",
        "Flag Reason"
    ])

    for r in records:
        student = db.query(Student).filter(Student.id == r.student_id).first()
        if student:
            writer.writerow([
                student.roll_number,
                student.name,
                student.department,
                student.batch,
                r.status.upper(),
                f"{r.presence_percentage}%",
                r.present_duration,
                r.away_duration,
                r.first_seen.strftime("%I:%M %p") if r.first_seen else "N/A",
                r.last_seen.strftime("%I:%M %p") if r.last_seen else "N/A",
                r.flag_reason or "None"
            ])

    csv_content = output.getvalue()
    filename = f"Attendance_{sess.course_code}_{sess.id}.csv"

    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
