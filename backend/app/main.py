import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database.database import init_db, SessionLocal
from app.database.seed import seed_database
from app.websocket.manager import ws_manager
from app.attendance.engine import attendance_engine

# Import Routers
from app.api.classes import router as classes_router
from app.api.students import router as students_router
from app.api.sessions import router as sessions_router
from app.api.attendance import router as attendance_router
from app.api.settings import router as settings_router
from app.api.camera import router as camera_router
from app.api.analytics import router as analytics_router
from app.api.reports import router as reports_router
from app.api.debug import router as debug_router

async def demo_mode_background_worker():
    """
    Background worker that broadcasts live classroom simulated updates ONLY if demo_mode is True.
    """
    while True:
        await asyncio.sleep(4.0)
        try:
            if attendance_engine.demo_mode and attendance_engine.active_session_id:
                db = SessionLocal()
                try:
                    await attendance_engine.run_demo_step(db)
                finally:
                    db.close()
        except Exception:
            pass

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Initialize SQLite Database Tables & Seed
    init_db()
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()

    # 2. Start Background Worker
    worker_task = asyncio.create_task(demo_mode_background_worker())
    yield
    # Cleanup
    worker_task.cancel()

app = FastAPI(
    title=settings.PROJECT_NAME,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount REST API Routers
app.include_router(classes_router, prefix=settings.API_V1_STR)
app.include_router(students_router, prefix=settings.API_V1_STR)
app.include_router(sessions_router, prefix=settings.API_V1_STR)
app.include_router(attendance_router, prefix=settings.API_V1_STR)
app.include_router(settings_router, prefix=settings.API_V1_STR)
app.include_router(camera_router, prefix=settings.API_V1_STR)
app.include_router(analytics_router, prefix=settings.API_V1_STR)
app.include_router(reports_router, prefix=settings.API_V1_STR)
app.include_router(debug_router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    return {
        "system": "ATTENDX Teacher-Centric Classroom Attendance System API",
        "status": "online",
        "docs": "/docs",
        "websocket": "/ws/attendance"
    }

@app.get("/api/health")
def health_check():
    return {"status": "healthy", "service": "ATTENDX FastAPI Backend"}

@app.websocket("/ws/attendance")
async def websocket_attendance_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception:
        ws_manager.disconnect(websocket)
