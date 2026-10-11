import os
from pathlib import Path
from pydantic import BaseModel

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE_DIR / "data"
DATABASE_DIR = DATA_DIR / "database"
MODELS_DIR = DATA_DIR / "models"
FACES_DIR = DATA_DIR / "faces"

# Ensure data directories exist
DATABASE_DIR.mkdir(parents=True, exist_ok=True)
MODELS_DIR.mkdir(parents=True, exist_ok=True)
FACES_DIR.mkdir(parents=True, exist_ok=True)

class Settings(BaseModel):
    PROJECT_NAME: str = "ATTENDX Backend"
    API_V1_STR: str = "/api"
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{DATABASE_DIR / 'attendance.db'}")
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "*"
    ]
    # Default attendance thresholds
    DEFAULT_UNCERTAIN_THRESHOLD_SECONDS: int = 60
    DEFAULT_TEMPORARY_ABSENCE_MINUTES: int = 5
    DEFAULT_PROLONGED_ABSENCE_MINUTES: int = 10
    DEFAULT_CLASS_DURATION_MINUTES: int = 60
    DEFAULT_RECOGNITION_CONFIDENCE: float = 0.85
    DEFAULT_PRESENT_THRESHOLD_PERCENT: float = 75.0
    DEFAULT_PARTIAL_THRESHOLD_PERCENT: float = 50.0
    DEFAULT_CAMERA_SOURCE: str = "browser"  # 'browser', 'usb', 'rtsp', 'demo'

settings = Settings()
