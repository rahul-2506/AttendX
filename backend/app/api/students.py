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
from app.database.models import Student, AttendanceRecord, AttendanceEvent, ClassSession
from app.schemas.student import StudentCreate, StudentUpdate, StudentResponse
from app.vision.recognizer import face_recognizer

router = APIRouter(prefix="/students", tags=["Students"])

@router.get("", response_model=List[StudentResponse])
def get_students(active_only: bool = True, db: Session = Depends(get_db)):
    query = db.query(Student)
    if active_only:
        query = query.filter(Student.active == True)
    return query.order_by(Student.roll_number.asc()).all()

@router.get("/{student_id}")
def get_student_detail(student_id: str, db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    records = db.query(AttendanceRecord).filter(AttendanceRecord.student_id == student_id).all()
    total_sessions = len(records)
    present_sessions = sum(1 for r in records if r.status == "present")
    avg_presence = sum(r.presence_percentage for r in records) / total_sessions if total_sessions > 0 else 95.0

    return {
        "id": student.id,
        "roll_number": student.roll_number,
        "name": student.name,
        "department": student.department,
        "batch": student.batch,
        "email": student.email,
        "avatar": student.avatar or "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
        "avatar_bg_color": student.avatar_bg_color,
        "face_registered": student.face_registered,
        "active": student.active,
        "created_at": student.created_at,
        "stats": {
            "total_sessions": total_sessions,
            "present_sessions": present_sessions,
            "average_presence": round(avg_presence, 1),
            "status": "present"
        }
    }

@router.post("", response_model=StudentResponse, status_code=status.HTTP_201_CREATED)
def create_student(student_in: StudentCreate, db: Session = Depends(get_db)):
    existing = db.query(Student).filter(Student.roll_number == student_in.roll_number).first()
    if existing:
        if not existing.active:
            # Reactivate and update
            existing.active = True
            existing.name = student_in.name
            existing.department = student_in.department
            existing.batch = student_in.batch
            existing.email = student_in.email or existing.email
            if student_in.avatar:
                existing.avatar = student_in.avatar
        else:
            raise HTTPException(status_code=400, detail=f"Student with roll number '{student_in.roll_number}' already exists")

    student_id = f"std-{uuid.uuid4().hex[:8]}"
    embedding_json = None
    face_registered = False

    if student_in.face_sample_base64:
        try:
            b64_str = student_in.face_sample_base64
            if "," in b64_str:
                b64_str = b64_str.split(",")[1]
            img_bytes = base64.b64decode(b64_str)
            nparr = np.frombuffer(img_bytes, np.uint8)
            img_np = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if img_np is not None:
                # Detect face for landmark alignment
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
                    print(f"[create_student] Enrolled face biometric embedding for {student_in.name}")
        except Exception as e:
            print(f"[create_student] Face embedding extraction error: {e}")

    # Use captured photo as avatar if provided
    avatar_url = student_in.avatar or "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"

    if existing and not existing.active:
        if embedding_json:
            existing.face_embedding = embedding_json
            existing.face_registered = True
        db.commit()
        db.refresh(existing)
        student = existing
    else:
        student = Student(
            id=student_id,
            roll_number=student_in.roll_number,
            name=student_in.name,
            department=student_in.department,
            batch=student_in.batch,
            email=student_in.email or f"{student_in.roll_number.lower()}@cs.edu",
            avatar=avatar_url,
            avatar_bg_color=student_in.avatar_bg_color or "#ea5d38",
            face_embedding=embedding_json,
            face_registered=face_registered,
            active=True
        )
        db.add(student)
        db.commit()
        db.refresh(student)

    # If an active class session is in progress, automatically add an attendance record for this new student
    active_session = db.query(ClassSession).filter(ClassSession.status == "active").first()
    if active_session:
        rec_id = f"rec-{active_session.id}-{student.id}"
        existing_rec = db.query(AttendanceRecord).filter(AttendanceRecord.id == rec_id).first()
        if not existing_rec:
            rec = AttendanceRecord(
                id=rec_id,
                session_id=active_session.id,
                student_id=student.id,
                status="present" if face_registered else "away",
                first_seen=datetime.datetime.utcnow() if face_registered else None,
                last_seen=datetime.datetime.utcnow() if face_registered else None,
                present_duration=1 if face_registered else 0,
                away_duration=0,
                presence_percentage=100.0 if face_registered else 0.0,
                currently_present=face_registered,
                confidence=96.0 if face_registered else 0.0
            )
            db.add(rec)
            db.commit()

    return student

@router.put("/{student_id}", response_model=StudentResponse)
def update_student(student_id: str, student_in: StudentUpdate, db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    if student_in.name is not None:
        student.name = student_in.name
    if student_in.department is not None:
        student.department = student_in.department
    if student_in.batch is not None:
        student.batch = student_in.batch
    if student_in.email is not None:
        student.email = student_in.email
    if student_in.active is not None:
        student.active = student_in.active

    db.commit()
    db.refresh(student)
    return student

@router.delete("/{student_id}")
def delete_student(student_id: str, db: Session = Depends(get_db)):
    student = db.query(Student).filter(
        (Student.id == student_id) | (Student.roll_number == student_id)
    ).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # Delete related attendance records and events
    db.query(AttendanceEvent).filter(AttendanceEvent.student_id == student.id).delete()
    db.query(AttendanceRecord).filter(AttendanceRecord.student_id == student.id).delete()
    db.delete(student)
    db.commit()
    return {"message": "Student deleted successfully", "id": student_id}
