import datetime
from sqlalchemy.orm import Session
from app.database.models import (
    Teacher,
    ClassCourse,
    TimetableEntry,
    SystemSetting
)

INITIAL_SETTINGS = {
    "camera_source": "browser",
    "selected_device_id": "integrated-webcam-01",
    "ip_stream_url": "rtsp://admin:lab3@192.168.1.120:554/live",
    "recognition_confidence_threshold": "85",
    "temporary_absence_threshold_minutes": "5",
    "prolonged_absence_threshold_minutes": "10",
    "class_duration_minutes": "60",
    "auto_snapshot_on_absence": "true",
    "alert_sound_enabled": "false",
    "notify_faculty_on_prolonged": "true",
    "high_precision_mode": "true",
    "fastapi_sync_url": "http://localhost:8000/api/v1"
}

def seed_database(db: Session):
    """
    Seeds initial system settings, default teacher, and teacher classes with timetable entries.
    Zero fake students are seeded, guaranteeing a clean student registry.
    """
    # 1. Seed System Settings
    for key, val in INITIAL_SETTINGS.items():
        existing_setting = db.query(SystemSetting).filter(SystemSetting.key == key).first()
        if not existing_setting:
            setting = SystemSetting(key=key, value=val)
            db.add(setting)

    # 2. Seed Teacher Profile
    teacher = db.query(Teacher).filter(Teacher.id == "TCH-001").first()
    if not teacher:
        teacher = Teacher(
            id="TCH-001",
            name="Prof. Rahul M.",
            email="rahul.m@attendx.edu",
            avatar="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
        )
        db.add(teacher)
        db.flush()

    # 3. Seed Default Classes
    classes_data = [
        {
            "id": "CLS-CSE302",
            "name": "Operating Systems",
            "course_code": "CSE302",
            "section": "Section B",
            "room": "AB3-204",
            "color": "#ea5d38",
            "teacher_id": "TCH-001",
            "timetable": [
                # 0=Mon, 1=Tue, 2=Wed, 3=Thu, 4=Fri, 5=Sat, 6=Sun
                (0, "02:00 PM", "03:00 PM", "AB3-204"),
                (1, "02:00 PM", "03:00 PM", "AB3-204"),
                (2, "10:00 AM", "11:00 AM", "AB3-204"),
                (3, "02:00 PM", "03:00 PM", "AB3-204"),
                (4, "02:00 PM", "03:00 PM", "AB3-204"),
                (5, "02:00 PM", "03:00 PM", "AB3-204"),
                (6, "02:00 PM", "03:00 PM", "AB3-204"),
            ]
        },
        {
            "id": "CLS-CSE304",
            "name": "Java Programming",
            "course_code": "CSE304",
            "section": "Section A",
            "room": "AB3-201",
            "color": "#3b82f6",
            "teacher_id": "TCH-001",
            "timetable": [
                (0, "04:00 PM", "05:00 PM", "AB3-201"),
                (1, "04:00 PM", "05:00 PM", "AB3-201"),
                (2, "04:00 PM", "05:00 PM", "AB3-201"),
                (3, "11:30 AM", "12:30 PM", "AB3-201"),
                (4, "04:00 PM", "05:00 PM", "AB3-201"),
                (5, "04:00 PM", "05:00 PM", "AB3-201"),
                (6, "04:00 PM", "05:00 PM", "AB3-201"),
            ]
        },
        {
            "id": "CLS-CSE308",
            "name": "Computer Networks",
            "course_code": "CSE308",
            "section": "Section C",
            "room": "AB3-205",
            "color": "#10b981",
            "teacher_id": "TCH-001",
            "timetable": [
                (0, "09:00 AM", "10:00 AM", "AB3-205"),
                (1, "09:00 AM", "10:00 AM", "AB3-205"),
                (2, "09:00 AM", "10:00 AM", "AB3-205"),
                (3, "03:00 PM", "04:00 PM", "AB3-205"),
                (4, "09:00 AM", "10:00 AM", "AB3-205"),
                (5, "09:00 AM", "10:00 AM", "AB3-205"),
                (6, "09:00 AM", "10:00 AM", "AB3-205"),
            ]
        },
        {
            "id": "CLS-CSE401",
            "name": "Artificial Intelligence & ML",
            "course_code": "CSE401",
            "section": "Section A",
            "room": "AI Lab 1 (AB3-301)",
            "color": "#8b5cf6",
            "teacher_id": "TCH-001",
            "timetable": [
                (0, "11:00 AM", "12:00 PM", "AI Lab 1 (AB3-301)"),
                (1, "11:00 AM", "12:00 PM", "AI Lab 1 (AB3-301)"),
                (2, "02:00 PM", "03:00 PM", "AI Lab 1 (AB3-301)"),
                (3, "09:00 AM", "10:00 AM", "AI Lab 1 (AB3-301)"),
                (4, "11:00 AM", "12:00 PM", "AI Lab 1 (AB3-301)"),
                (5, "11:00 AM", "12:00 PM", "AI Lab 1 (AB3-301)"),
                (6, "11:00 AM", "12:00 PM", "AI Lab 1 (AB3-301)"),
            ]
        }
    ]

    for cdata in classes_data:
        existing_cls = db.query(ClassCourse).filter(ClassCourse.id == cdata["id"]).first()
        if not existing_cls:
            cls = ClassCourse(
                id=cdata["id"],
                name=cdata["name"],
                course_code=cdata["course_code"],
                section=cdata["section"],
                room=cdata["room"],
                color=cdata["color"],
                teacher_id=cdata["teacher_id"]
            )
            db.add(cls)
            db.flush()

            for day, st, et, rm in cdata["timetable"]:
                tt = TimetableEntry(
                    id=f"tt-{cdata['id']}-{day}-{st.replace(':', '').replace(' ', '')}",
                    class_id=cdata["id"],
                    day_of_week=day,
                    start_time=st,
                    end_time=et,
                    room=rm
                )
                db.add(tt)

    db.commit()
