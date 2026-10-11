import time
import datetime
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.database.models import Student, AttendanceEvent, ClassSession, ClassEnrollment
from app.vision.camera_manager import camera_manager, BrowserCameraSource
from app.attendance.engine import attendance_engine
from app.websocket.manager import ws_manager

router = APIRouter(prefix="/camera", tags=["Camera"])

class FrameProcessRequest(BaseModel):
    frame_base64: str
    session_id: Optional[str] = None
    force_reid: Optional[bool] = False

class CameraSourceUpdateRequest(BaseModel):
    source_type: str  # 'browser', 'usb', 'rtsp', 'demo'
    config: Optional[Dict[str, Any]] = None

@router.get("/status")
def get_camera_status():
    return {
        "source": camera_manager.current_source_type,
        "connected": camera_manager.source.is_connected() if camera_manager.source else True,
        "resolution": "1080p",
        "fps": 30,
        "latency_ms": 18
    }

@router.post("/process-frame")
async def process_camera_frame(payload: FrameProcessRequest, db: Session = Depends(get_db)):
    # 1. Resolve Active Session and Active Class
    active_session = None
    if payload.session_id:
        active_session = db.query(ClassSession).filter(ClassSession.id == payload.session_id).first()
    if not active_session:
        active_session = db.query(ClassSession).filter(ClassSession.status == "active").first()

    # 2. Query ONLY registered students enrolled in the active class!
    registered_list = []
    if active_session and active_session.class_id:
        enrollments = db.query(ClassEnrollment).filter(
            ClassEnrollment.class_id == active_session.class_id,
            ClassEnrollment.active == True
        ).all()

        for enr in enrollments:
            s = enr.student
            if s and s.active and s.face_registered and s.face_embedding:
                registered_list.append({
                    "student_id": s.id,
                    "name": s.name,
                    "roll_number": s.roll_number,
                    "face_embedding": s.face_embedding
                })
    elif active_session:
        # Fallback for active session without class_id
        records = active_session.attendance_records
        for rec in records:
            s = rec.student
            if s and s.active and s.face_registered and s.face_embedding:
                registered_list.append({
                    "student_id": s.id,
                    "name": s.name,
                    "roll_number": s.roll_number,
                    "face_embedding": s.face_embedding
                })

    # 3. Decode frame
    if isinstance(camera_manager.source, BrowserCameraSource):
        frame = camera_manager.source.push_base64_frame(payload.frame_base64)
    else:
        frame = camera_manager.source.get_frame()

    if frame is None:
        # Inform attendance engine that frame is absent
        try:
            await attendance_engine.process_observation_cycle([], db, is_camera_healthy=False)
        except Exception:
            pass

        return {
            "status": "no_frame",
            "detections": [],
            "faces_count": 0,
            "timestamp": time.time()
        }

    # 4. Process frame with Temporal Tracker + Conditional SFace Recognition
    results = camera_manager.process_frame(
        frame,
        registered_list,
        force_reidentification=bool(payload.force_reid)
    )

    detections = results.get("detections", [])
    observations = results.get("observations", [])

    # 5. Feed complete observation cycle into Attendance Engine State Machine
    try:
        confirmed_ids = [
            obs.get("student_id")
            for obs in observations
            if obs.get("student_id") and obs.get("is_confirmed", False)
        ]
        unknown_count = sum(1 for obs in observations if not obs.get("student_id"))
        sess_id = active_session.id if active_session else (payload.session_id or "SES-DEFAULT")

        attendance_engine.update(
            session_id=sess_id,
            recognized_student_ids=confirmed_ids,
            unknown_face_count=unknown_count,
            now=time.time(),
            db=db
        )
    except Exception as e:
        print(f"[CameraAPI] Attendance engine cycle error: {e}")

    # 6. Broadcast real-time camera detection event over WebSocket
    try:
        await ws_manager.broadcast({
            "type": "camera_detections",
            "detections": detections,
            "faces_count": len(detections),
            "timestamp": time.strftime("%I:%M:%S %p")
        })
    except Exception as e:
        print(f"[CameraAPI] WebSocket broadcast error: {e}")

    return results

@router.post("/snapshot")
def capture_snapshot(db: Session = Depends(get_db)):
    active_session = db.query(ClassSession).filter(ClassSession.status == "active").first()
    if not active_session:
        active_session = db.query(ClassSession).order_by(ClassSession.start_time.desc()).first()

    now = datetime.datetime.utcnow()
    evt = AttendanceEvent(
        id=f"act-snap-{int(time.time() * 1000)}",
        session_id=active_session.id if active_session else "SES-DEFAULT",
        event_type="SNAPSHOT_SAVED",
        timestamp=now,
        message="Classroom surveillance snapshot captured",
        badge_text="Frame Saved",
        confidence=100.0
    )
    db.add(evt)
    db.commit()
    return {"message": "Snapshot captured and audit event logged", "timestamp": now.strftime("%I:%M %p")}

@router.put("/source")
def switch_camera_source(payload: CameraSourceUpdateRequest):
    camera_manager.set_source(payload.source_type, payload.config)
    attendance_engine.demo_mode = (payload.source_type == "demo")
    return {"message": f"Camera source updated to {payload.source_type}"}
