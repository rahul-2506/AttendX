import os
import sys
import time
import datetime
from pathlib import Path

# Ensure backend root is on sys.path
BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

from app.database.database import init_db, SessionLocal
from app.database.seed import seed_database
from app.database.models import Student, ClassCourse, ClassSession, AttendanceRecord, AttendanceEvent, ClassEnrollment
from app.attendance.engine import attendance_engine

def run_continuous_attendance_tests():
    print("==================================================")
    print("RUNNING ATTENDX CONTINUOUS ATTENDANCE ENGINE TESTS")
    print("==================================================")

    # 1. Initialize DB and Seed
    init_db()
    db = SessionLocal()

    try:
        seed_database(db)

        # Ensure test student exists
        test_student_id = "std-test-alice"
        student = db.query(Student).filter(Student.id == test_student_id).first()
        if not student:
            student = Student(
                id=test_student_id,
                roll_number="CS2026-001",
                name="Alice Test",
                department="Computer Science",
                face_registered=True,
                active=True
            )
            db.add(student)
            db.commit()

        # Start session at simulated t0 = 1000.0
        t0 = 1000.0
        session_id = "SES-TEST-CONT-01"
        sess = db.query(ClassSession).filter(ClassSession.id == session_id).first()
        if sess:
            db.delete(sess)
            db.commit()

        sess = ClassSession(
            id=session_id,
            course_code="CSE302",
            course_name="Operating Systems",
            duration_minutes=60,
            start_time=datetime.datetime.fromtimestamp(t0),
            status="active"
        )
        db.add(sess)

        # Add record
        rec = db.query(AttendanceRecord).filter(AttendanceRecord.id == f"rec-{session_id}-{test_student_id}").first()
        if not rec:
            rec = AttendanceRecord(
                id=f"rec-{session_id}-{test_student_id}",
                session_id=session_id,
                student_id=test_student_id,
                status="not_detected",
                present_duration=0,
                away_duration=0,
                presence_percentage=0.0
            )
            db.add(rec)
        db.commit()

        attendance_engine.set_thresholds(
            uncertain_seconds=60.0,
            temporary_minutes=5.0,
            prolonged_minutes=10.0,
            present_percent=75.0
        )
        attendance_engine.start_session(session_id, db, start_time=t0)
        assert test_student_id in attendance_engine.student_states, "Student state must be initialized"
        assert attendance_engine.student_states[test_student_id].status == "NOT_SEEN"
        print("[OK] TEST 1: Session initialized with state NOT_SEEN")

        # TEST 2: Initial detection at t = 1000.0
        res = attendance_engine.update(session_id, [test_student_id], unknown_face_count=0, now=t0, db=db)
        state = attendance_engine.student_states[test_student_id]
        assert state.status == "PRESENT", f"Expected PRESENT, got {state.status}"
        print(f"[OK] TEST 2: Student recognized at t0 -> status: {state.status}")

        # TEST 3: Flicker tolerance under 60s (unseen for 30s at t = 1030.0)
        t_flicker = t0 + 30.0
        attendance_engine.update(session_id, [], unknown_face_count=0, now=t_flicker, db=db)
        state = attendance_engine.student_states[test_student_id]
        assert state.status == "UNCERTAIN", f"Expected UNCERTAIN during flicker window, got {state.status}"
        # Still counted as present to prevent flicker:
        assert state.total_present_seconds >= 30.0, f"Expected total_present_seconds >= 30, got {state.total_present_seconds}"
        print(f"[OK] TEST 3: Flicker tolerance under 60s passed -> status: {state.status}, present_seconds: {state.total_present_seconds}s (counted as present)")

        # Return at t = 1045.0
        t_return = t0 + 45.0
        attendance_engine.update(session_id, [test_student_id], unknown_face_count=0, now=t_return, db=db)
        state = attendance_engine.student_states[test_student_id]
        assert state.status == "PRESENT", f"Expected PRESENT after return, got {state.status}"
        print(f"[OK] TEST 4: Student returned within grace -> status: {state.status}")

        # TEST 4 (continued): 5-minute transition to TEMPORARILY_AWAY
        # Last seen at t = 1045.0. 5 minutes unseen = 1045.0 + 301.0 = 1346.0
        t_away = 1045.0 + 305.0  # 5 minutes and 5 seconds unseen
        attendance_engine.update(session_id, [], unknown_face_count=0, now=t_away, db=db)
        state = attendance_engine.student_states[test_student_id]
        assert state.status == "TEMPORARILY_AWAY", f"Expected TEMPORARILY_AWAY at 5 min, got {state.status}"
        rec = db.query(AttendanceRecord).filter(AttendanceRecord.id == state.record_id).first()
        assert rec.status == "away", f"DB record expected 'away', got {rec.status}"
        print(f"[OK] TEST 5: 5-minute transition verified -> status: {state.status}, DB record: {rec.status}")

        # TEST 5: 10-minute transition to PROLONGED_ABSENCE
        # Last seen was at 1045.0. 10 minutes unseen = 1045.0 + 605.0 = 1650.0
        t_prolonged = 1045.0 + 605.0  # 10 minutes and 5 seconds unseen
        attendance_engine.update(session_id, [], unknown_face_count=0, now=t_prolonged, db=db)
        state = attendance_engine.student_states[test_student_id]
        assert state.status == "PROLONGED_ABSENCE", f"Expected PROLONGED_ABSENCE at 10 min, got {state.status}"
        assert state.flag_reason is not None, "Expected flag reason to be set"
        rec = db.query(AttendanceRecord).filter(AttendanceRecord.id == state.record_id).first()
        assert rec.status == "prolonged", f"DB record expected 'prolonged', got {rec.status}"
        print(f"[OK] TEST 6: 10-minute transition verified -> status: {state.status}, flag: {state.flag_reason}")

        # TEST 6: Unknown face detection
        t_unknown = t_prolonged + 10.0
        attendance_engine.update(session_id, [], unknown_face_count=1, now=t_unknown, db=db)
        unk_event = db.query(AttendanceEvent).filter(
            AttendanceEvent.session_id == session_id,
            AttendanceEvent.event_type == "UNKNOWN_FACE"
        ).first()
        assert unk_event is not None, "Expected UNKNOWN_FACE event in DB"
        print(f"[OK] TEST 7: Unknown face event logged -> {unk_event.message}")

        # TEST 7: Override priority
        # Faculty manual override to PRESENT
        override_success = attendance_engine.override_student(test_student_id, "present", reason="Faculty verified in seat", db=db)
        assert override_success, "Override should succeed"
        state = attendance_engine.student_states[test_student_id]
        assert state.status == "PRESENT", f"Expected PRESENT after override, got {state.status}"
        assert state.is_overridden is True, "is_overridden should be True"

        # Advance another 15 minutes with student unseen
        t_overridden_unseen = t_unknown + 900.0  # 15 minutes unseen
        attendance_engine.update(session_id, [], unknown_face_count=0, now=t_overridden_unseen, db=db)
        state = attendance_engine.student_states[test_student_id]
        # Should REMAIN PRESENT because override priority prevents automatic degradation
        assert state.status == "PRESENT", f"Override priority failed: expected PRESENT, got {state.status}"
        print(f"[OK] TEST 8: Teacher override priority verified -> status remained {state.status} despite 15m unobserved")

        # TEST 8: Session end and final percentage
        end_result = attendance_engine.end_session(session_id, db)
        rec = db.query(AttendanceRecord).filter(AttendanceRecord.student_id == test_student_id).first()
        assert rec.presence_percentage > 0, "Final presence percentage must be computed"
        assert rec.status == "present", f"Final status expected present, got {rec.status}"
        print(f"[OK] TEST 9: Final presence percentage computed -> {rec.presence_percentage}%, status: {rec.status}")

        print("\nALL CONTINUOUS ATTENDANCE LOGIC TESTS PASSED SUCCESSFULLY!")

    finally:
        db.close()

if __name__ == '__main__':
    run_continuous_attendance_tests()
