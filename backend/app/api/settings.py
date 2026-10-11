from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.database.models import SystemSetting
from app.schemas.settings import SystemSettingsSchema

router = APIRouter(prefix="/settings", tags=["Settings"])

@router.get("", response_model=SystemSettingsSchema)
def get_settings(db: Session = Depends(get_db)):
    settings_rows = db.query(SystemSetting).all()
    s_dict = {row.key: row.value for row in settings_rows}

    return SystemSettingsSchema(
        camera_source=s_dict.get("camera_source", "browser"),
        selected_device_id=s_dict.get("selected_device_id", "integrated-webcam-01"),
        ip_stream_url=s_dict.get("ip_stream_url", "rtsp://admin:lab3@192.168.1.120:554/live"),
        recognition_confidence_threshold=float(s_dict.get("recognition_confidence_threshold", "85")),
        temporary_absence_threshold_minutes=int(s_dict.get("temporary_absence_threshold_minutes", "5")),
        prolonged_absence_threshold_minutes=int(s_dict.get("prolonged_absence_threshold_minutes", "10")),
        class_duration_minutes=int(s_dict.get("class_duration_minutes", "60")),
        auto_snapshot_on_absence=s_dict.get("auto_snapshot_on_absence", "true").lower() == "true",
        alert_sound_enabled=s_dict.get("alert_sound_enabled", "false").lower() == "true",
        notify_faculty_on_prolonged=s_dict.get("notify_faculty_on_prolonged", "true").lower() == "true",
        high_precision_mode=s_dict.get("high_precision_mode", "true").lower() == "true",
        fastapi_sync_url=s_dict.get("fastapi_sync_url", "http://localhost:8000/api")
    )

@router.put("", response_model=SystemSettingsSchema)
def update_settings(payload: SystemSettingsSchema, db: Session = Depends(get_db)):
    data = payload.dict()
    for k, v in data.items():
        existing = db.query(SystemSetting).filter(SystemSetting.key == k).first()
        val_str = str(v).lower() if isinstance(v, bool) else str(v)
        if existing:
            existing.value = val_str
        else:
            db.add(SystemSetting(key=k, value=val_str))

    db.commit()

    # Inform attendance engine to dynamically adapt thresholds
    from app.attendance.engine import attendance_engine
    attendance_engine.configure_from_settings(db)
    attendance_engine.demo_mode = (payload.camera_source == "demo")

    return payload
