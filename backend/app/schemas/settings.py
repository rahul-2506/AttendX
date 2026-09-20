from typing import Optional
from pydantic import BaseModel

class SystemSettingsSchema(BaseModel):
    camera_source: str = "browser"  # 'browser', 'usb', 'rtsp', 'demo'
    selected_device_id: str = "integrated-webcam-01"
    ip_stream_url: str = "rtsp://admin:lab3@192.168.1.120:554/live"
    recognition_confidence_threshold: float = 85.0
    temporary_absence_threshold_minutes: int = 5
    prolonged_absence_threshold_minutes: int = 10
    class_duration_minutes: int = 60
    auto_snapshot_on_absence: bool = True
    alert_sound_enabled: bool = False
    notify_faculty_on_prolonged: bool = True
    high_precision_mode: bool = True
    fastapi_sync_url: str = "http://localhost:8000/api"
