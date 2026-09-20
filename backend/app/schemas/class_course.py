from typing import Optional, List
from pydantic import BaseModel
import datetime

class TimetableEntryBase(BaseModel):
    day_of_week: int  # 0=Mon, 1=Tue, 2=Wed, 3=Thu, 4=Fri, 5=Sat, 6=Sun
    start_time: str   # e.g. "14:00" or "02:00 PM"
    end_time: str     # e.g. "15:00" or "03:00 PM"
    room: str

class TimetableEntryCreate(TimetableEntryBase):
    pass

class TimetableEntryResponse(TimetableEntryBase):
    id: str
    class_id: str

    class Config:
        from_attributes = True

class ClassBase(BaseModel):
    name: str
    course_code: str
    section: str = "Section A"
    room: str = "AB3-204"
    color: Optional[str] = "#ea5d38"

class ClassCreate(ClassBase):
    teacher_id: Optional[str] = None
    timetable: Optional[List[TimetableEntryCreate]] = None

class ClassUpdate(BaseModel):
    name: Optional[str] = None
    course_code: Optional[str] = None
    section: Optional[str] = None
    room: Optional[str] = None
    color: Optional[str] = None

class ClassResponse(ClassBase):
    id: str
    teacher_id: Optional[str] = None
    teacher_name: Optional[str] = None
    enrolled_count: int = 0
    sessions_count: int = 0
    timetable: List[TimetableEntryResponse] = []
    created_at: datetime.datetime

    class Config:
        from_attributes = True

class StudentEnrollRequest(BaseModel):
    roll_number: str
    name: str
    department: Optional[str] = "Computer Science"
    batch: Optional[str] = "2024-2028"
    email: Optional[str] = None
    avatar: Optional[str] = None
    avatar_bg_color: Optional[str] = "#ea5d38"
    face_sample_base64: Optional[str] = None

class StudentImportRow(BaseModel):
    student_id: str
    name: str
    department: Optional[str] = "Computer Science"
    batch: Optional[str] = "2024-2028"
    email: Optional[str] = None

class StudentImportRequest(BaseModel):
    students: List[StudentImportRow]

class TodayScheduleItem(BaseModel):
    class_id: str
    course_code: str
    course_name: str
    section: str
    room: str
    start_time: str
    end_time: str
    day_name: str
    enrolled_count: int
    status: str  # 'NOW', 'UPCOMING', 'COMPLETED', 'ACTIVE'
    active_session_id: Optional[str] = None
