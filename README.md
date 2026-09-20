# ATTENDX — Intelligent Attendance & Continuous-Presence Monitoring System

**ATTENDX** is an AI-powered classroom attendance and continuous presence monitoring platform. Unlike conventional one-time check-in systems, ATTENDX continuously monitors the classroom environment, detects student faces, tracks their presence throughout a lecture, accounts for temporary absences with grace periods, flags prolonged absences, and broadcasts live telemetry to a React dashboard.

---

## 🏗️ Architecture & Technology Stack

```
CAMERA SOURCE (Webcam / USB / RTSP / Demo)
      ↓
CAMERA MANAGER (Unified Abstraction)
      ↓
FRAME PROCESSING & SAMPLING (2–5 FPS)
      ↓
LOCAL FACE DETECTION (OpenCV YuNet / Cascades)
      ↓
LOCAL FACE RECOGNITION (OpenCV SFace 128-d Embeddings)
      ↓
PRESENCE TRACKING ENGINE (Anti-flicker State Machine)
      ↓
DATABASE (SQLite / SQLAlchemy)
      ↓
FASTAPI REST & WEBSOCKET API
      ↓
REACT 19 + TYPESCRIPT DASHBOARD
```

* **Frontend:** React 19, TypeScript, Vite 8, Tailwind CSS v4, Lucide React, Recharts.
* **Backend:** Python 3.12/3.14, FastAPI, Uvicorn, SQLAlchemy, Pydantic, Aiofiles.
* **Computer Vision:** OpenCV (`opencv-python-headless`), YuNet ONNX Face Detector & SFace Feature Recognizer (CPU-optimized, zero cloud dependency).
* **Database:** SQLite (`data/database/attendance.db`) with SQLAlchemy ORM (PostgreSQL ready).
* **Real-time Engine:** WebSockets (`/ws/attendance`) for instantaneous event broadcasting.

---

## 🚀 Quick Start Guide

### 1. Backend Setup

```bash
# Navigate to the project root
cd attendanceX

# Install Python requirements
pip install -r backend/requirements.txt

# Start the FastAPI server (starts with auto-seeding & active session)
cd backend
python -m uvicorn app.main:app --reload --port 8000
```
* Backend API is live at: `http://localhost:8000`
* Interactive OpenAPI Documentation: `http://localhost:8000/docs`
* WebSocket live stream: `ws://localhost:8000/ws/attendance`

---

### 2. Frontend Setup

```bash
# In another terminal at the project root
npm install
npm run dev
```
* React Dashboard is live at: **`http://localhost:3000`**

---

## 🎯 Core Product Features

### 1. Anti-Flicker Continuous Presence Tracking
* **PRESENT:** Student face detected and verified in current observation window.
* **UNCERTAIN (0–60s):** Student momentarily turned or occluded; state remains present to prevent false absences.
* **TEMPORARILY AWAY (>5m):** Student stepped away within the allowed grace period.
* **PROLONGED ABSENCE (>10m):** Student absence exceeds grace limit; flagged on the dashboard and logged.
* **UNKNOWN FACE:** Unregistered person detected near doorways or aisles; audit alert triggered.

### 2. Local Biometric Privacy
* Face images are processed entirely locally on the machine CPU.
* Only 128-dimensional mathematical embeddings are stored in the database.
* No face photographs or biometric data are sent to external cloud APIs.

### 3. Hardware Independence
Camera input is abstracted through `CameraManager`:
1. **Browser Webcam (`getUserMedia`):** Default for laptops and quick presentations.
2. **USB Classroom Camera (`cv2.VideoCapture(0)`):** Dedicated USB hardware.
3. **RTSP / IP Camera:** RTSP stream link configured via Settings view.
4. **Demo Mode:** Automatic simulation mode reproducing student transitions, away events, and returned detections without requiring camera hardware.

---

## 📡 REST & WebSocket API Summary

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/students` | List all enrolled students |
| `POST` | `/api/students` | Enroll student with face sample |
| `DELETE` | `/api/students/{id}` | Deactivate student & delete embedding |
| `GET` | `/api/sessions/current` | Get active class session counters |
| `POST` | `/api/sessions/{id}/start` | Start live class session |
| `POST` | `/api/sessions/{id}/end` | Finalize and complete class session |
| `GET` | `/api/attendance/live` | Live attendance roster with presence % |
| `POST` | `/api/attendance/{id}/override` | Faculty manual status override |
| `POST` | `/api/camera/process-frame` | Process base64 frame & return face HUD boxes |
| `POST` | `/api/camera/snapshot` | Capture surveillance snapshot |
| `GET` | `/api/analytics/overview` | Overall attendance & duration analytics |
| `GET` | `/api/reports/session/{id}/csv` | Download CSV attendance report |
| `WS` | `/ws/attendance` | Real-time WebSocket attendance event stream |
