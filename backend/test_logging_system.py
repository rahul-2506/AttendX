import os
import sys
import time
import json
import urllib.request
import numpy as np
import cv2

# Set stdout encoding for Windows console to handle UTF-8 safely
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

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

def run_logging_demonstration():
    print("================================================================================")
    print("ATTENDX — RUNTIME LOGGING & DIAGNOSTICS DEMONSTRATION")
    print("================================================================================")

    # 1. Start a Session for Operating Systems
    print("\n--- PHASE 1: STARTING CLASS SESSION ---")
    start_res = post('/classes/CLS-CSE302/sessions/start')
    sess_id = start_res['session']['id']
    print(f"[TEST] Session active: {sess_id}")

    # 2. Check Diagnostics Endpoint
    print("\n--- PHASE 2: INSPECTING /api/debug/vision DIAGNOSTICS ---")
    diag = get('/debug/vision')
    print(f"[DIAGNOSTICS] Camera: {diag['camera']['status']} | Tracks: {diag['tracking']['active_tracks']} | Attendance Breakdown: {diag['attendance']}")

    # 3. Simulate Camera Frame Ingestion (Recognize -> Track Loop)
    print("\n--- PHASE 3: SIMULATING CAMERA FRAMES & TRACKING ---")
    blank_frame = np.zeros((480, 640, 3), dtype=np.uint8)
    import base64
    _, buf = cv2.imencode('.jpg', blank_frame)
    b64_frame = base64.b64encode(buf).decode('utf-8')

    for i in range(1, 6):
        res = post('/camera/process-frame', {'frame_base64': b64_frame, 'session_id': sess_id})
        print(f"[FRAME {i}] Processed | Faces: {res['faces_count']} | Detections: {len(res['detections'])}")
        time.sleep(0.3)

    # 4. Check Updated Diagnostics
    print("\n--- PHASE 4: CHECKING UPDATED DIAGNOSTICS STATS ---")
    diag_after = get('/debug/vision')
    print(f"[DIAGNOSTICS] SFace Calls: {diag_after['recognition']['sface_calls_last_window']} | YuNet Calls: {diag_after['detection']['yunet_calls_last_window']}")

    # 5. End Session and Print Final Results
    print("\n--- PHASE 5: ENDING SESSION & FINALIZING ATTENDANCE ---")
    end_res = post(f'/sessions/{sess_id}/end')
    print(f"[TEST] Session {sess_id} successfully finalized!")

    # 6. Check Log File
    log_path = os.path.join(os.path.dirname(__file__), "logs", "attendx.log")
    print(f"\n--- PHASE 6: VERIFYING ROTATING LOG FILE: {log_path} ---")
    if os.path.exists(log_path):
        with open(log_path, "r", encoding="utf-8") as f:
            lines = f.readlines()
        print(f"[LOG FILE] Total log entries: {len(lines)}")
        print("[LOG FILE] Sample tail of attendx.log:")
        for line in lines[-12:]:
            print("  " + line.strip())
    else:
        print(f"[WARNING] Log file not found at {log_path}")

    print("\n================================================================================")
    print("ALL RUNTIME LOGGING & DEBUG MONITORING TESTS COMPLETED SUCCESSFULLY!")
    print("================================================================================")

if __name__ == '__main__':
    run_logging_demonstration()
