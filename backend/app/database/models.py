import datetime
from sqlalchemy import (
    Column,
    String,
    Integer,
    Float,
    Boolean,
    DateTime,
    ForeignKey,
    Text
)
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


class Teacher(Base):
    __tablename__ = "teachers"

    id = Column(String(50), primary_key=True, index=True)
    name = Column(String(100), nullable=False, default="Prof. Rahul M.")
    email = Column(String(100), nullable=False, default="rahul.m@attendx.edu")
    avatar = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    classes = relationship("ClassCourse", back_populates="teacher", cascade="all, delete-orphan")


class ClassCourse(Base):
    __tablename__ = "classes"

    id = Column(String(50), primary_key=True, index=True)
    name = Column(String(100), nullable=False)  # e.g. Operating Systems
    course_code = Column(String(50), nullable=False, index=True)  # e.g. CSE302
    section = Column(String(50), nullable=False, default="Section A")
    room = Column(String(100), nullable=False, default="AB3-204")
    teacher_id = Column(String(50), ForeignKey("teachers.id"), nullable=True)
    color = Column(String(20), default="#ea5d38")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    teacher = relationship("Teacher", back_populates="classes")
    enrollments = relationship("ClassEnrollment", back_populates="class_course", cascade="all, delete-orphan")
    timetable_entries = relationship("TimetableEntry", back_populates="class_course", cascade="all, delete-orphan")
    sessions = relationship("ClassSession", back_populates="class_course", cascade="all, delete-orphan")


class Student(Base):
    __tablename__ = "students"

    id = Column(String(50), primary_key=True, index=True)
    roll_number = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=False)
    department = Column(String(100), nullable=False, default="Computer Science")
    batch = Column(String(50), nullable=False, default="2024-2028")
    email = Column(String(100), nullable=True)
    avatar = Column(String(500), nullable=True)
    avatar_bg_color = Column(String(20), nullable=True, default="#2563eb")
    face_embedding = Column(Text, nullable=True)  # JSON string of float embedding vector
    face_registered = Column(Boolean, default=False)
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    enrollments = relationship("ClassEnrollment", back_populates="student", cascade="all, delete-orphan")
    attendance_records = relationship("AttendanceRecord", back_populates="student", cascade="all, delete-orphan")
    attendance_events = relationship("AttendanceEvent", back_populates="student")


class ClassEnrollment(Base):
    __tablename__ = "class_enrollments"

    id = Column(String(50), primary_key=True, index=True)
    class_id = Column(String(50), ForeignKey("classes.id"), nullable=False, index=True)
    student_id = Column(String(50), ForeignKey("students.id"), nullable=False, index=True)
    enrolled_at = Column(DateTime, default=datetime.datetime.utcnow)
    active = Column(Boolean, default=True)

    class_course = relationship("ClassCourse", back_populates="enrollments")
    student = relationship("Student", back_populates="enrollments")


class TimetableEntry(Base):
    __tablename__ = "timetable_entries"

    id = Column(String(50), primary_key=True, index=True)
    class_id = Column(String(50), ForeignKey("classes.id"), nullable=False, index=True)
    day_of_week = Column(Integer, nullable=False)  # 0=Monday, 1=Tuesday, 2=Wednesday, 3=Thursday, 4=Friday, 5=Saturday, 6=Sunday
    start_time = Column(String(20), nullable=False)  # "14:00" or "02:00 PM"
    end_time = Column(String(20), nullable=False)    # "15:00" or "03:00 PM"
    room = Column(String(100), nullable=False)

    class_course = relationship("ClassCourse", back_populates="timetable_entries")


class ClassSession(Base):
    __tablename__ = "class_sessions"

    id = Column(String(50), primary_key=True, index=True)
    class_id = Column(String(50), ForeignKey("classes.id"), nullable=True, index=True)
    course_code = Column(String(50), nullable=False, default="CSE302")
    course_name = Column(String(100), nullable=False, default="Operating Systems")
    section = Column(String(50), nullable=False, default="Section B")
    room = Column(String(100), nullable=False, default="AB3-204")
    instructor = Column(String(100), nullable=False, default="Prof. Rahul M.")
    start_time = Column(DateTime, nullable=False, default=datetime.datetime.utcnow)
    end_time = Column(DateTime, nullable=True)
    duration_minutes = Column(Integer, default=60)
    status = Column(String(20), default="active")  # 'scheduled', 'active', 'completed', 'cancelled'
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    class_course = relationship("ClassCourse", back_populates="sessions")
    attendance_records = relationship("AttendanceRecord", back_populates="session", cascade="all, delete-orphan")
    events = relationship("AttendanceEvent", back_populates="session", cascade="all, delete-orphan")


class AttendanceRecord(Base):
    __tablename__ = "attendance_records"

    id = Column(String(50), primary_key=True, index=True)
    session_id = Column(String(50), ForeignKey("class_sessions.id"), nullable=False, index=True)
    student_id = Column(String(50), ForeignKey("students.id"), nullable=False, index=True)
    status = Column(String(20), default="not_detected")  # 'not_detected', 'present', 'away', 'prolonged'
    first_seen = Column(DateTime, nullable=True)
    last_seen = Column(DateTime, nullable=True)
    present_duration = Column(Integer, default=0)  # minutes
    away_duration = Column(Integer, default=0)     # minutes
    presence_percentage = Column(Float, default=0.0)
    currently_present = Column(Boolean, default=False)
    confidence = Column(Float, default=0.0)
    flag_reason = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    session = relationship("ClassSession", back_populates="attendance_records")
    student = relationship("Student", back_populates="attendance_records")


class AttendanceEvent(Base):
    __tablename__ = "attendance_events"

    id = Column(String(50), primary_key=True, index=True)
    session_id = Column(String(50), ForeignKey("class_sessions.id"), nullable=False, index=True)
    student_id = Column(String(50), ForeignKey("students.id"), nullable=True, index=True)
    event_type = Column(String(50), nullable=False)  # 'recognized', 'returned', 'temporary_absence', 'prolonged_absence', 'unknown_face', 'snapshot_saved', 'manual_override'
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    confidence = Column(Float, nullable=True)
    message = Column(String(255), nullable=False)
    badge_text = Column(String(50), nullable=True)
    metadata_json = Column(Text, nullable=True)

    session = relationship("ClassSession", back_populates="events")
    student = relationship("Student", back_populates="attendance_events")


class SystemSetting(Base):
    __tablename__ = "system_settings"

    key = Column(String(50), primary_key=True, index=True)
    value = Column(Text, nullable=False)
    description = Column(String(255), nullable=True)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
