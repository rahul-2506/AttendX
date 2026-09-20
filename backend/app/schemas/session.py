from typing import Optional
from pydantic import BaseModel
import datetime

class SessionBase(BaseModel):
    course_code: str = "CSE302"
    course_name: str = "Operating Systems"
    section: str = "Section B"
    room: str = "Computer Science Lab 3"
    instructor: str = "Prof. Rahul M."
    duration_minutes: int = 60

class SessionCreate(SessionBase):
    pass

class SessionResponse(SessionBase):
    id: str
    start_time: datetime.datetime
    end_time: Optional[datetime.datetime] = None
    status: str
    total_enrolled: int = 50
    students_present: int = 0
    temporarily_away: int = 0
    prolonged_absence: int = 0
    average_presence: float = 0.0

    class Config:
        from_attributes = True
