import os
import sys
import time
import logging
from logging.handlers import RotatingFileHandler
from typing import Dict, Any, List, Optional
from datetime import datetime
import threading

# Configuration
LOG_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "logs")
SESSION_LOG_DIR = os.path.join(LOG_DIR, "sessions")
os.makedirs(LOG_DIR, exist_ok=True)
os.makedirs(SESSION_LOG_DIR, exist_ok=True)

LOG_FILE = os.path.join(LOG_DIR, "attendx.log")

LOG_LEVEL_ENV = os.environ.get("ATTENDX_LOG_LEVEL", "INFO").upper()
LOG_LEVEL = getattr(logging, LOG_LEVEL_ENV, logging.INFO)

class MillisecondFormatter(logging.Formatter):
    """Custom formatter providing [HH:MM:SS.mmm] [CATEGORY] message format."""
    def format(self, record):
        dt = datetime.fromtimestamp(record.created)
        timestamp = dt.strftime("%H:%M:%S") + f".{int(record.msecs):03d}"
        category = getattr(record, "category", record.name.upper())
        msg = record.getMessage()
        return f"[{timestamp}] [{category}] {msg}"

class AutoFlushRotatingFileHandler(RotatingFileHandler):
    """Rotating file handler that flushes immediately to disk so logs are never lost."""
    def emit(self, record):
        super().emit(record)
        self.flush()

# In-memory buffer of recent logs for live UI streaming
_recent_logs_lock = threading.Lock()
_recent_logs_buffer: List[Dict[str, Any]] = []
MAX_RECENT_LOGS = 500

class UILogBufferHandler(logging.Handler):
    """Handler that stores recent formatted log lines in a thread-safe ring buffer."""
    def emit(self, record):
        try:
            msg = self.format(record)
            category = getattr(record, "category", record.name.upper())
            dt = datetime.fromtimestamp(record.created)
            time_str = dt.strftime("%H:%M:%S") + f".{int(record.msecs):03d}"
            
            with _recent_logs_lock:
                _recent_logs_buffer.append({
                    "timestamp": time_str,
                    "category": category,
                    "level": record.levelname,
                    "message": record.getMessage(),
                    "raw": msg,
                    "created": record.created
                })
                if len(_recent_logs_buffer) > MAX_RECENT_LOGS:
                    _recent_logs_buffer.pop(0)
        except Exception:
            pass

# Create root logger for AttendX
_base_logger = logging.getLogger("attendx")
_base_logger.setLevel(LOG_LEVEL)
_base_logger.propagate = False

if not _base_logger.handlers:
    # Console Handler (Auto-flush)
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(LOG_LEVEL)
    console_handler.setFormatter(MillisecondFormatter())
    _base_logger.addHandler(console_handler)

    # Persistent Rotating File Handler (Max 10MB per file, 5 backups, immediate flush)
    file_handler = AutoFlushRotatingFileHandler(
        LOG_FILE, maxBytes=10 * 1024 * 1024, backupCount=5, encoding="utf-8"
    )
    file_handler.setLevel(logging.DEBUG)  # Keep full debug logs in file
    file_handler.setFormatter(MillisecondFormatter())
    _base_logger.addHandler(file_handler)

    # UI Buffer Handler
    ui_handler = UILogBufferHandler()
    ui_handler.setLevel(logging.DEBUG)
    ui_handler.setFormatter(MillisecondFormatter())
    _base_logger.addHandler(ui_handler)

class PerformanceMetricsCollector:
    """Thread-safe windowed performance collector that resets counters every reporting window."""
    def __init__(self):
        self.lock = threading.Lock()
        self.last_report_time = time.time()
        self.window_seconds = 5.0
        
        # Cumulative/Windowed counters
        self.frame_count = 0
        self.processed_frames = 0
        self.yunet_calls = 0
        self.sface_calls = 0
        self.reidentifications = 0
        self.detection_times_ms: List[float] = []
        self.sface_times_ms: List[float] = []
        self.tracking_times_ms: List[float] = []
        
        # State metrics
        self.active_tracks = 0
        self.avg_tracker_confidence = 0.0
        self.unknown_faces = 0
        self.camera_resolution = "1280x720"
        self.camera_fps = 0.0
        self.processing_fps = 0.0
        self.camera_healthy = True
        
        # Diagnostic event ring buffer for UI debug panel
        self.recent_events: List[Dict[str, Any]] = []
        self.max_events = 50

    def record_frame(self, resolution: str = "1280x720"):
        with self.lock:
            self.frame_count += 1
            self.camera_resolution = resolution

    def record_detection(self, duration_ms: float, faces_count: int):
        with self.lock:
            self.yunet_calls += 1
            self.detection_times_ms.append(duration_ms)

    def record_sface(self, duration_ms: float, is_reid: bool = False):
        with self.lock:
            self.sface_calls += 1
            if is_reid:
                self.reidentifications += 1
            self.sface_times_ms.append(duration_ms)

    def record_tracking(self, duration_ms: float, active_count: int, avg_conf: float, unknown_count: int = 0):
        with self.lock:
            self.processed_frames += 1
            self.tracking_times_ms.append(duration_ms)
            self.active_tracks = active_count
            self.avg_tracker_confidence = avg_conf
            self.unknown_faces = unknown_count

    def add_diagnostic_event(self, source: str, title: str, details: str = ""):
        with self.lock:
            dt_str = datetime.now().strftime("%H:%M:%S")
            self.recent_events.insert(0, {
                "timestamp": dt_str,
                "source": source,
                "title": title,
                "details": details,
                "time": time.time()
            })
            if len(self.recent_events) > self.max_events:
                self.recent_events.pop()

    def check_and_report_performance(self) -> Optional[Dict[str, Any]]:
        with self.lock:
            now = time.time()
            elapsed = now - self.last_report_time
            if elapsed < self.window_seconds:
                return None
            
            cam_fps = round(self.frame_count / elapsed, 1) if elapsed > 0 else 0.0
            proc_fps = round(self.processed_frames / elapsed, 1) if elapsed > 0 else 0.0
            self.camera_fps = cam_fps
            self.processing_fps = proc_fps
            
            avg_det_ms = round(sum(self.detection_times_ms) / len(self.detection_times_ms), 1) if self.detection_times_ms else 0.0
            avg_sf_ms = round(sum(self.sface_times_ms) / len(self.sface_times_ms), 1) if self.sface_times_ms else 0.0
            avg_trk_ms = round(sum(self.tracking_times_ms) / len(self.tracking_times_ms), 1) if self.tracking_times_ms else 0.0
            
            report = {
                "camera_fps": cam_fps,
                "processing_fps": proc_fps,
                "active_tracks": self.active_tracks,
                "yunet_calls": self.yunet_calls,
                "sface_calls": self.sface_calls,
                "reidentifications": self.reidentifications,
                "avg_detection_ms": avg_det_ms,
                "avg_sface_ms": avg_sf_ms,
                "avg_tracking_ms": avg_trk_ms,
                "avg_tracker_confidence": round(self.avg_tracker_confidence, 2),
                "unknown_faces": self.unknown_faces
            }
            
            self.frame_count = 0
            self.processed_frames = 0
            self.yunet_calls = 0
            self.sface_calls = 0
            self.reidentifications = 0
            self.detection_times_ms.clear()
            self.sface_times_ms.clear()
            self.tracking_times_ms.clear()
            self.last_report_time = now
            return report

    def get_current_stats(self) -> Dict[str, Any]:
        with self.lock:
            return {
                "camera": {
                    "status": "active" if self.camera_healthy else "error",
                    "fps": self.camera_fps,
                    "resolution": self.camera_resolution
                },
                "tracking": {
                    "active_tracks": self.active_tracks,
                    "average_confidence": round(self.avg_tracker_confidence, 2)
                },
                "recognition": {
                    "sface_calls_last_window": self.sface_calls,
                    "reidentifications_last_window": self.reidentifications
                },
                "detection": {
                    "yunet_calls_last_window": self.yunet_calls
                },
                "unknown_faces": self.unknown_faces,
                "recent_events": list(self.recent_events[:10])
            }

metrics = PerformanceMetricsCollector()

def get_recent_ui_logs(limit: int = 100) -> List[Dict[str, Any]]:
    """Returns recent formatted logs for the UI diagnostics tab."""
    with _recent_logs_lock:
        return list(_recent_logs_buffer[-limit:])

def get_log_file_path() -> str:
    """Returns the absolute path of the persistent attendx.log file."""
    return LOG_FILE

class AttendXLogger:
    """Structured categorized logger wrapper for ATTENDX."""
    def __init__(self, logger: logging.Logger):
        self._logger = logger

    def _log(self, level: int, category: str, msg: str, extra: Optional[Dict] = None):
        d = {"category": category}
        if extra:
            d.update(extra)
        self._logger.log(level, msg, extra=d)

    # Core categories
    def camera(self, msg: str):
        self._log(logging.INFO, "CAMERA", msg)

    def detect(self, msg: str):
        self._log(logging.INFO, "DETECT", msg)

    def track(self, msg: str):
        self._log(logging.INFO, "TRACK", msg)

    def recognize(self, msg: str):
        self._log(logging.INFO, "RECOGNIZE", msg)
        metrics.add_diagnostic_event("RECOGNIZE", msg)

    def reidentify(self, msg: str):
        self._log(logging.INFO, "REIDENTIFY", msg)
        metrics.add_diagnostic_event("REIDENTIFY", msg)

    def attendance(self, msg: str):
        self._log(logging.INFO, "ATTENDANCE", msg)
        metrics.add_diagnostic_event("ATTENDANCE", msg)

    def session(self, msg: str):
        self._log(logging.INFO, "SESSION", msg)
        metrics.add_diagnostic_event("SESSION", msg)

    def websocket(self, msg: str):
        self._log(logging.DEBUG, "WEBSOCKET", msg)

    def database(self, msg: str):
        self._log(logging.DEBUG, "DATABASE", msg)

    def performance(self, msg: str):
        self._log(logging.INFO, "PERFORMANCE", msg)

    def warning(self, category: str, msg: str):
        self._log(logging.WARNING, f"WARNING] [{category}", msg)
        metrics.add_diagnostic_event(category, f"WARNING: {msg}")

    def error(self, category: str, msg: str):
        self._log(logging.ERROR, f"ERROR] [{category}", msg)
        metrics.add_diagnostic_event(category, f"ERROR: {msg}")

    def debug(self, category: str, msg: str):
        self._log(logging.DEBUG, category, msg)

log = AttendXLogger(_base_logger)
