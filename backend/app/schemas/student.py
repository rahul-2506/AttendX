from typing import Optional, List
from pydantic import BaseModel
import datetime

class StudentBase(BaseModel):
    roll_number: str
    name: str
    department: str = "Data Science & AI"
    batch: str = "2024-2028"
    email: Optional[str] = None
    avatar: Optional[str] = None
    avatar_bg_color: Optional[str] = "#2563eb"
    active: bool = True

class StudentCreate(StudentBase):
    face_sample_base64: Optional[str] = None

class StudentUpdate(BaseModel):
    name: Optional[str] = None
    department: Optional[str] = None
    batch: Optional[str] = None
    email: Optional[str] = None
    active: Optional[bool] = None

class StudentResponse(StudentBase):
    id: str
    face_registered: bool
    created_at: datetime.datetime
    updated_at: Optional[datetime.datetime] = None

    class Config:
        from_attributes = True
