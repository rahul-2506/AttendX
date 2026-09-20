from typing import Optional, List
from pydantic import BaseModel
import datetime

class AttendanceRecordResponse(BaseModel):
    id: str
    session_id: str
    student_id: str
    roll_number: str
    name: str
    department: str
    status: str
    presence_percentage: float
    present_minutes: int
    away_minutes: int
    last_seen: Optional[str] = None
    confidence: float
    currently_present: bool
    flag_reason: Optional[str] = None

    class Config:
        from_attributes = True

class AttendanceOverrideRequest(BaseModel):
    status: str  # 'present', 'away', 'prolonged'
    reason: Optional[str] = None

class AttendanceEventResponse(BaseModel):
    id: str
    session_id: str
    student_id: Optional[str] = None
    student_name: Optional[str] = None
    event_type: str
    timestamp: str
    message: str
    badge_text: Optional[str] = None
    confidence: Optional[float] = None

class HeatmapInterval(BaseModel):
    time: str
    status: str
    value: int

class HeatmapStudentRow(BaseModel):
    student_id: str
    name: str
    intervals: List[HeatmapInterval]

class DetectedFaceResponse(BaseModel):
    id: str
    name: str
    student_id: Optional[str] = None
    confidence: float
    status: str
    bbox: dict
    seat: str
