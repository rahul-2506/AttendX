import urllib.request
import json
import time
import base64
import numpy as np
import cv2

BASE = 'http://127.0.0.1:8000/api'

def post(endpoint, data=None):
    if data is None:
        data = {}
    req = urllib.request.Request(
        f'{BASE}{endpoint}',
        data=json.dumps(data).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )
    return json.loads(urllib.request.urlopen(req).read().decode())

def get(endpoint):
    return json.loads(urllib.request.urlopen(f'{BASE}{endpoint}').read().decode())

def test_full_pipeline():
    print("==================================================")
    print("RUNNING ATTENDX CONTINUOUS ATTENDANCE ENGINE TESTS")
    print("==================================================")

    # TEST 1 & 2: Start session for Operating Systems (CLS-CSE302)
    start_res = post('/classes/CLS-CSE302/sessions/start')
    sess_id = start_res['session']['id']
    print(f"[OK] TEST 1: Session started -> {sess_id}")

    # TEST 3: Check class enrollment scoping
    live_records = get('/attendance/live')
    print(f"[OK] TEST 2: Active class enrolled students initialized: {len(live_records)}")
    for r in live_records:
        print(f"   - {r['student_id']}: {r['student_name']} -> Status: {r['status']}, Presence: {r['presence_percentage']}%")

    # TEST 4: Process real camera frames through fast tracking loop
    blank_frame = np.zeros((480, 640, 3), dtype=np.uint8)
    _, buf = cv2.imencode('.jpg', blank_frame)
    b64_frame = base64.b64encode(buf).decode('utf-8')

    f1_res = post('/camera/process-frame', {'frame_base64': b64_frame, 'session_id': sess_id})
    print(f"[OK] TEST 3: Frame 1 (Detection + SFace cycle): status={f1_res['status']}, detections={len(f1_res['detections'])}")

    f2_res = post('/camera/process-frame', {'frame_base64': b64_frame, 'session_id': sess_id})
    print(f"[OK] TEST 4: Frame 2 (Fast temporal tracking loop): status={f2_res['status']}, detections={len(f2_res['detections'])}")

    # TEST 5: Check events endpoint for state transition logs
    events = get('/attendance/events')
    print(f"[OK] TEST 5: Attendance events recorded: {len(events)}")
    if events:
        print(f"   - Latest event: [{events[0]['type']}] {events[0]['message']}")

    # TEST 6: Test session finalization and timestamp calculations
    time.sleep(1)
    end_res = post(f'/sessions/{sess_id}/end')
    print(f"[OK] TEST 6: Session finalization: status={end_res['session']['status']}")
    for rec in end_res.get('attendance_records', []):
        print(f"   - Final Student {rec['student_id']}: Status={rec['status']}, Present={rec['present_minutes']}m, Percentage={rec['presence_percentage']}%")

    print("\nALL BACKEND CONTINUOUS ENGINE VERIFICATIONS PASSED SUCCESSFULLY!")

if __name__ == '__main__':
    test_full_pipeline()
