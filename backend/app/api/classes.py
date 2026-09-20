import json
import base64
import uuid
import datetime
import cv2
import numpy as np
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.database.models import (
    Teacher,
    ClassCourse,
    Student,
    ClassEnrollment,
    TimetableEntry,
    ClassSession,
    AttendanceRecord,
    AttendanceEvent
)
from app.schemas.class_course import (
    ClassCreate,
    ClassUpdate,
    ClassResponse,
    TimetableEntryCreate,
    TimetableEntryResponse,
    StudentEnrollRequest,
    StudentImportRequest,
    StudentImportRow
)
from app.schemas.session import SessionResponse
from app.vision.recognizer import face_recognizer
from app.attendance.engine import attendance_engine

router = APIRouter(prefix="/classes", tags=["Classes"])


def _format_class_response(cls: ClassCourse, db: Session) -> dict:
    enrolled_count = db.query(ClassEnrollment).filter(
        ClassEnrollment.class_id == cls.id,
        ClassEnrollment.active == True
    ).count()
    sessions_count = db.query(ClassSession).filter(ClassSession.class_id == cls.id).count()
    timetable = db.query(TimetableEntry).filter(TimetableEntry.class_id == cls.id).all()

    return {
        "id": cls.id,
        "name": cls.name,
        "course_code": cls.course_code,
        "section": cls.section,
        "room": cls.room,
        "color": cls.color,
        "teacher_id": cls.teacher_id,
        "teacher_name": cls.teacher.name if cls.teacher else "Faculty",
        "enrolled_count": enrolled_count,
        "sessions_count": sessions_count,
        "timetable": [
            {
                "id": tt.id,
                "class_id": tt.class_id,
                "day_of_week": tt.day_of_week,
                "start_time": tt.start_time,
                "end_time": tt.end_time,
                "room": tt.room
            }
            for tt in timetable
        ],
        "created_at": cls.created_at
    }


@router.get("", response_model=List[ClassResponse])
def get_classes(db: Session = Depends(get_db)):
    classes = db.query(ClassCourse).order_by(ClassCourse.course_code.asc()).all()
    return [_format_class_response(c, db) for c in classes]


@router.get("/{class_id}", response_model=ClassResponse)
def get_class(class_id: str, db: Session = Depends(get_db)):
    cls = db.query(ClassCourse).filter(ClassCourse.id == class_id).first()
    if not cls:
        raise HTTPException(status_code=404, detail="Class not found")
    return _format_class_response(cls, db)


@router.post("", response_model=ClassResponse, status_code=status.HTTP_201_CREATED)
def create_class(payload: ClassCreate, db: Session = Depends(get_db)):
    class_id = f"CLS-{payload.course_code.upper().replace(' ', '')}"
    existing = db.query(ClassCourse).filter(ClassCourse.id == class_id).first()
    if existing:
        class_id = f"CLS-{payload.course_code.upper().replace(' ', '')}-{uuid.uuid4().hex[:4]}"

    teacher = db.query(Teacher).first()
    teacher_id = payload.teacher_id or (teacher.id if teacher else None)

    new_class = ClassCourse(
        id=class_id,
        name=payload.name,
        course_code=payload.course_code,
        section=payload.section,
        room=payload.room,
        color=payload.color or "#ea5d38",
        teacher_id=teacher_id
    )
    db.add(new_class)
    db.flush()

    if payload.timetable:
        for tt in payload.timetable:
            t_entry = TimetableEntry(
                id=f"tt-{class_id}-{tt.day_of_week}-{tt.start_time.replace(':', '').replace(' ', '')}",
                class_id=class_id,
                day_of_week=tt.day_of_week,
                start_time=tt.start_time,
                end_time=tt.end_time,
                room=tt.room or payload.room
            )
            db.add(t_entry)

    db.commit()
    db.refresh(new_class)
    return _format_class_response(new_class, db)


@router.put("/{class_id}", response_model=ClassResponse)
def update_class(class_id: str, payload: ClassUpdate, db: Session = Depends(get_db)):
    cls = db.query(ClassCourse).filter(ClassCourse.id == class_id).first()
    if not cls:
        raise HTTPException(status_code=404, detail="Class not found")

    if payload.name is not None:
        cls.name = payload.name
    if payload.course_code is not None:
        cls.course_code = payload.course_code
    if payload.section is not None:
        cls.section = payload.section
    if payload.room is not None:
        cls.room = payload.room
    if payload.color is not None:
        cls.color = payload.color

    db.commit()
    db.refresh(cls)
    return _format_class_response(cls, db)


@router.delete("/{class_id}")
def delete_class(class_id: str, db: Session = Depends(get_db)):
    cls = db.query(ClassCourse).filter(ClassCourse.id == class_id).first()
    if not cls:
        raise HTTPException(status_code=404, detail="Class not found")

    db.delete(cls)
    db.commit()
    return {"message": "Class and all associated records deleted successfully", "id": class_id}


# ==========================================
# Class Student Enrollments
# ==========================================

@router.get("/{class_id}/students")
def get_class_students(class_id: str, db: Session = Depends(get_db)):
    cls = db.query(ClassCourse).filter(ClassCourse.id == class_id).first()
    if not cls:
        raise HTTPException(status_code=404, detail="Class not found")

    enrollments = db.query(ClassEnrollment).filter(
        ClassEnrollment.class_id == class_id,
        ClassEnrollment.active == True
    ).all()

    results = []
    for enr in enrollments:
        student = enr.student
        if not student:
            continue

        # Class-specific attendance stats
        class_sessions = db.query(ClassSession).filter(ClassSession.class_id == class_id).all()
        session_ids = [s.id for s in class_sessions]
        records = db.query(AttendanceRecord).filter(
            AttendanceRecord.student_id == student.id,
            AttendanceRecord.session_id.in_(session_ids)
        ).all() if session_ids else []

        total_sessions = len(records)
        present_sessions = sum(1 for r in records if r.status == "present")
        avg_presence = sum(r.presence_percentage for r in records) / total_sessions if total_sessions > 0 else 0.0

        results.append({
            "id": student.id,
            "roll_number": student.roll_number,
            "name": student.name,
            "department": student.department,
            "batch": student.batch,
            "email": student.email,
            "avatar": student.avatar or "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
            "avatar_bg_color": student.avatar_bg_color or "#ea5d38",
            "face_registered": student.face_registered,
            "active": student.active,
            "enrolled_at": enr.enrolled_at,
            "stats": {
                "total_sessions": total_sessions,
                "present_sessions": present_sessions,
                "average_presence": round(avg_presence, 1)
            }
        })

    return results


@router.post("/{class_id}/students", status_code=status.HTTP_201_CREATED)
def enroll_student_in_class(class_id: str, payload: StudentEnrollRequest, db: Session = Depends(get_db)):
    cls = db.query(ClassCourse).filter(ClassCourse.id == class_id).first()
    if not cls:
        raise HTTPException(status_code=404, detail="Class not found")

    # Check if student already exists globally by roll number
    student = db.query(Student).filter(Student.roll_number == payload.roll_number).first()
    embedding_json = None
    face_registered = False

    if payload.face_sample_base64:
        try:
            b64_str = payload.face_sample_base64
            if "," in b64_str:
                b64_str = b64_str.split(",")[1]
            img_bytes = base64.b64decode(b64_str)
            nparr = np.frombuffer(img_bytes, np.uint8)
            img_np = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if img_np is not None:
                from app.vision.detector import face_detector
                dets, _ = face_detector.detect(img_np)
                raw_det = dets[0].get("raw_det") if dets else None
                raw_box = dets[0].get("raw_box") if dets else None
                face_crop = None
                if raw_box:
                    x, y, bw, bh = raw_box
                    face_crop = img_np[max(0, y):min(img_np.shape[0], y+bh), max(0, x):min(img_np.shape[1], x+bw)]
                
                emb = face_recognizer.extract_embedding(img_np, raw_det=raw_det, face_crop_bgr=face_crop)
                if emb:
                    embedding_json = json.dumps(emb)
                    face_registered = True
        except Exception as e:
            print(f"[enroll_student_in_class] Face embedding error: {e}")

    if not student:
        student_id = f"std-{uuid.uuid4().hex[:8]}"
        student = Student(
            id=student_id,
            roll_number=payload.roll_number,
            name=payload.name,
            department=payload.department or "Computer Science",
            batch=payload.batch or "2024-2028",
            email=payload.email or f"{payload.roll_number.lower()}@cs.edu",
            avatar=payload.avatar or "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
            avatar_bg_color=payload.avatar_bg_color or "#ea5d38",
            face_embedding=embedding_json,
            face_registered=face_registered,
            active=True
        )
        db.add(student)
        db.flush()
    else:
        # If student exists and new face embedding is provided, update it
        if embedding_json:
            student.face_embedding = embedding_json
            student.face_registered = True
        if payload.name:
            student.name = payload.name
        student.active = True
        db.flush()

    # Check if enrollment already exists
    existing_enr = db.query(ClassEnrollment).filter(
        ClassEnrollment.class_id == class_id,
        ClassEnrollment.student_id == student.id
    ).first()

    if not existing_enr:
        enrollment = ClassEnrollment(
            id=f"enr-{class_id}-{student.id}",
            class_id=class_id,
            student_id=student.id,
            enrolled_at=datetime.datetime.utcnow(),
            active=True
        )
        db.add(enrollment)
    else:
        existing_enr.active = True

    # If there is an active session for THIS class, initialize attendance record
    active_session = db.query(ClassSession).filter(
        ClassSession.class_id == class_id,
        ClassSession.status == "active"
    ).first()

    if active_session:
        rec_id = f"rec-{active_session.id}-{student.id}"
        existing_rec = db.query(AttendanceRecord).filter(AttendanceRecord.id == rec_id).first()
        if not existing_rec:
            rec = AttendanceRecord(
                id=rec_id,
                session_id=active_session.id,
                student_id=student.id,
                status="not_detected",
                first_seen=None,
                last_seen=None,
                present_duration=0,
                away_duration=0,
                presence_percentage=0.0,
                currently_present=False,
                confidence=0.0
            )
            db.add(rec)

    db.commit()
    db.refresh(student)
    return {
        "message": f"Student {student.name} ({student.roll_number}) enrolled into {cls.name}",
        "student": {
            "id": student.id,
            "roll_number": student.roll_number,
            "name": student.name,
            "department": student.department,
            "batch": student.batch,
            "face_registered": student.face_registered
        }
    }


@router.post("/{class_id}/students/import")
def import_students_csv(class_id: str, payload: StudentImportRequest, db: Session = Depends(get_db)):
    cls = db.query(ClassCourse).filter(ClassCourse.id == class_id).first()
    if not cls:
        raise HTTPException(status_code=404, detail="Class not found")

    enrolled_count = 0
    created_count = 0

    for row in payload.students:
        s_id = row.student_id.strip()
        s_name = row.name.strip()
        if not s_id or not s_name:
            continue

        student = db.query(Student).filter(Student.roll_number == s_id).first()
        if not student:
            student = Student(
                id=f"std-{uuid.uuid4().hex[:8]}",
                roll_number=s_id,
                name=s_name,
                department=row.department or "Computer Science",
                batch=row.batch or "2024-2028",
                email=row.email or f"{s_id.lower()}@cs.edu",
                avatar="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
                avatar_bg_color="#ea5d38",
                face_registered=False,
                active=True
            )
            db.add(student)
            db.flush()
            created_count += 1

        existing_enr = db.query(ClassEnrollment).filter(
            ClassEnrollment.class_id == class_id,
            ClassEnrollment.student_id == student.id
        ).first()

        if not existing_enr:
            enrollment = ClassEnrollment(
                id=f"enr-{class_id}-{student.id}",
                class_id=class_id,
                student_id=student.id,
                enrolled_at=datetime.datetime.utcnow(),
                active=True
            )
            db.add(enrollment)
            enrolled_count += 1
        elif not existing_enr.active:
            existing_enr.active = True
            enrolled_count += 1

    db.commit()
    return {
        "message": f"Successfully enrolled {enrolled_count} students into {cls.name}",
        "enrolled_count": enrolled_count,
        "newly_created_count": created_count
    }


@router.delete("/{class_id}/students/{student_id}")
def unenroll_student(class_id: str, student_id: str, db: Session = Depends(get_db)):
    student = db.query(Student).filter(
        (Student.id == student_id) | (Student.roll_number == student_id)
    ).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    enr = db.query(ClassEnrollment).filter(
        ClassEnrollment.class_id == class_id,
        ClassEnrollment.student_id == student.id
    ).first()

    if not enr:
        raise HTTPException(status_code=404, detail="Enrollment not found")

    db.delete(enr)
    db.commit()
    return {"message": "Student unenrolled from class", "student_id": student.id}


# ==========================================
# Class Timetable
# ==========================================

@router.get("/{class_id}/timetable", response_model=List[TimetableEntryResponse])
def get_class_timetable(class_id: str, db: Session = Depends(get_db)):
    cls = db.query(ClassCourse).filter(ClassCourse.id == class_id).first()
    if not cls:
        raise HTTPException(status_code=404, detail="Class not found")

    return db.query(TimetableEntry).filter(TimetableEntry.class_id == class_id).order_by(TimetableEntry.day_of_week.asc()).all()


@router.post("/{class_id}/timetable", response_model=TimetableEntryResponse, status_code=status.HTTP_201_CREATED)
def add_timetable_entry(class_id: str, payload: TimetableEntryCreate, db: Session = Depends(get_db)):
    cls = db.query(ClassCourse).filter(ClassCourse.id == class_id).first()
    if not cls:
        raise HTTPException(status_code=404, detail="Class not found")

    entry_id = f"tt-{class_id}-{payload.day_of_week}-{payload.start_time.replace(':', '').replace(' ', '')}"
    t_entry = TimetableEntry(
        id=entry_id,
        class_id=class_id,
        day_of_week=payload.day_of_week,
        start_time=payload.start_time,
        end_time=payload.end_time,
        room=payload.room or cls.room
    )
    db.add(t_entry)
    db.commit()
    db.refresh(t_entry)
    return t_entry


@router.delete("/{class_id}/timetable/{entry_id}")
def delete_timetable_entry(class_id: str, entry_id: str, db: Session = Depends(get_db)):
    entry = db.query(TimetableEntry).filter(
        TimetableEntry.id == entry_id,
        TimetableEntry.class_id == class_id
    ).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Timetable entry not found")

    db.delete(entry)
    db.commit()
    return {"message": "Timetable entry deleted"}


# ==========================================
# Class Sessions & Analytics
# ==========================================

@router.get("/{class_id}/sessions")
def get_class_sessions(class_id: str, db: Session = Depends(get_db)):
    cls = db.query(ClassCourse).filter(ClassCourse.id == class_id).first()
    if not cls:
        raise HTTPException(status_code=404, detail="Class not found")

    sessions = db.query(ClassSession).filter(
        ClassSession.class_id == class_id
    ).order_by(ClassSession.start_time.desc()).all()

    results = []
    for sess in sessions:
        records = db.query(AttendanceRecord).filter(AttendanceRecord.session_id == sess.id).all()
        enrolled_in_class = db.query(ClassEnrollment).filter(
            ClassEnrollment.class_id == class_id,
            ClassEnrollment.active == True
        ).count()
        total_enrolled = len(records) or enrolled_in_class
        present = sum(1 for r in records if r.status == "present")
        away = sum(1 for r in records if r.status == "away")
        prolonged = sum(1 for r in records if r.status == "prolonged")
        avg_presence = sum(r.presence_percentage for r in records) / len(records) if records else 0.0

        results.append({
            "id": sess.id,
            "class_id": cls.id,
            "course_code": sess.course_code,
            "course_name": sess.course_name,
            "section": sess.section,
            "room": sess.room,
            "instructor": sess.instructor,
            "duration_minutes": sess.duration_minutes,
            "start_time": sess.start_time,
            "end_time": sess.end_time,
            "status": sess.status,
            "total_enrolled": total_enrolled,
            "students_present": present,
            "temporarily_away": away,
            "prolonged_absence": prolonged,
            "average_presence": round(avg_presence, 1)
        })

    return results


@router.post("/{class_id}/sessions/start")
def start_class_session(class_id: str, db: Session = Depends(get_db)):
    cls = db.query(ClassCourse).filter(ClassCourse.id == class_id).first()
    if not cls:
        raise HTTPException(status_code=404, detail="Class not found")

    # Complete any other active session before starting a new one
    active_existing = db.query(ClassSession).filter(ClassSession.status == "active").all()
    for active_sess in active_existing:
        active_sess.status = "completed"
        active_sess.end_time = datetime.datetime.utcnow()
        attendance_engine.end_session(active_sess.id, db)

    now = datetime.datetime.utcnow()
    session_id = f"SES-{now.strftime('%Y%m%d%H%M%S')}-{cls.course_code}"

    sess = ClassSession(
        id=session_id,
        class_id=cls.id,
        course_code=cls.course_code,
        course_name=cls.name,
        section=cls.section,
        room=cls.room,
        instructor=cls.teacher.name if cls.teacher else "Prof. Rahul M.",
        duration_minutes=60,
        start_time=now,
        status="active"
    )
    db.add(sess)

    # 1. Fetch ONLY students enrolled in THIS class
    enrollments = db.query(ClassEnrollment).filter(
        ClassEnrollment.class_id == class_id,
        ClassEnrollment.active == True
    ).all()

    enrolled_students = [enr.student for enr in enrollments if enr.student and enr.student.active]

    # 2. Initialize attendance records ONLY for enrolled students of this class
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
            currently_present=False,
            confidence=0.0
        )
        db.add(rec)

    db.commit()
    db.refresh(sess)

    # 3. Inform attendance engine of new active session and reset temporal tracker
    from app.vision.camera_manager import camera_manager
    camera_manager.reset_tracker()
    attendance_engine.start_session(session_id, db)

    return {
        "message": f"Class session started for {cls.name}",
        "session": {
            "id": sess.id,
            "class_id": cls.id,
            "course_code": sess.course_code,
            "course_name": sess.course_name,
            "section": sess.section,
            "room": sess.room,
            "instructor": sess.instructor,
            "start_time": sess.start_time,
            "total_enrolled": len(enrolled_students),
            "status": "active"
        }
    }


@router.get("/{class_id}/analytics")
def get_class_analytics(class_id: str, db: Session = Depends(get_db)):
    cls = db.query(ClassCourse).filter(ClassCourse.id == class_id).first()
    if not cls:
        raise HTTPException(status_code=404, detail="Class not found")

    sessions = db.query(ClassSession).filter(ClassSession.class_id == class_id).all()
    session_ids = [s.id for s in sessions]

    enrollments = db.query(ClassEnrollment).filter(
        ClassEnrollment.class_id == class_id,
        ClassEnrollment.active == True
    ).all()
    total_enrolled = len(enrollments)

    all_records = db.query(AttendanceRecord).filter(
        AttendanceRecord.session_id.in_(session_ids)
    ).all() if session_ids else []

    total_sessions_count = len(sessions)
    if total_sessions_count > 0 and all_records:
        avg_presence_pct = sum(r.presence_percentage for r in all_records) / len(all_records)
        avg_attendance_rate = (sum(1 for r in all_records if r.status == "present") / len(all_records)) * 100
        avg_away_mins = sum(r.away_duration for r in all_records) / len(all_records)
        prolonged_count = sum(1 for r in all_records if r.status == "prolonged")
    else:
        avg_presence_pct = 0.0
        avg_attendance_rate = 0.0
        avg_away_mins = 0.0
        prolonged_count = 0

    # Per-student stats for this class
    student_stats = []
    for enr in enrollments:
        student = enr.student
        if not student:
            continue
        s_records = [r for r in all_records if r.student_id == student.id]
        s_total = len(s_records)
        s_present = sum(1 for r in s_records if r.status == "present")
        s_avg_pct = sum(r.presence_percentage for r in s_records) / s_total if s_total > 0 else 0.0

        student_stats.append({
            "id": student.id,
            "roll_number": student.roll_number,
            "name": student.name,
            "avatar": student.avatar or "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
            "present_sessions": s_present,
            "total_sessions": s_total,
            "attendance_rate": round((s_present / s_total * 100) if s_total > 0 else 0, 1),
            "presence_percentage": round(s_avg_pct, 1)
        })

    # Sort top & low attendees
    top_attendees = sorted(student_stats, key=lambda x: x["presence_percentage"], reverse=True)[:5]
    low_attendees = sorted(student_stats, key=lambda x: x["presence_percentage"])[:5]

    # Session trends
    session_trends = []
    for sess in sorted(sessions, key=lambda x: x.start_time):
        s_recs = [r for r in all_records if r.session_id == sess.id]
        p_count = sum(1 for r in s_recs if r.status == "present")
        s_avg = sum(r.presence_percentage for r in s_recs) / len(s_recs) if s_recs else 0.0
        session_trends.append({
            "session_id": sess.id,
            "date": sess.start_time.strftime("%b %d"),
            "present_count": p_count,
            "total_enrolled": len(s_recs) or total_enrolled,
            "average_presence": round(s_avg, 1)
        })

    return {
        "class_id": cls.id,
        "name": cls.name,
        "course_code": cls.course_code,
        "section": cls.section,
        "room": cls.room,
        "total_enrolled": total_enrolled,
        "total_sessions": total_sessions_count,
        "average_attendance_rate": round(avg_attendance_rate, 1),
        "average_presence_percentage": round(avg_presence_pct, 1),
        "average_away_minutes": round(avg_away_mins, 1),
        "prolonged_absence_count": prolonged_count,
        "top_attendees": top_attendees,
        "low_attendees": low_attendees,
        "session_trends": session_trends
    }
