import os
from fastapi import APIRouter, Query
from fastapi.responses import FileResponse, PlainTextResponse
from typing import Dict, Any, List
from app.core.logger import metrics, get_recent_ui_logs, get_log_file_path
from app.attendance.engine import attendance_engine

router = APIRouter(prefix="/debug", tags=["Debug & Diagnostics"])

@router.get("/vision")
def get_vision_diagnostics() -> Dict[str, Any]:
    """
    Returns real-time runtime diagnostics of the CV pipeline, temporal tracker,
    SFace invocations, and attendance state breakdown.
    """
    stats = metrics.get_current_stats()
    attendance_counts = attendance_engine.get_attendance_breakdown()
    stats["attendance"] = attendance_counts
    return stats

@router.get("/logs")
def get_live_logs(limit: int = Query(default=100, ge=1, le=500)) -> List[Dict[str, Any]]:
    """
    Returns recent structured log entries in real time for UI stream viewer.
    """
    return get_recent_ui_logs(limit=limit)

@router.get("/logs/raw", response_class=PlainTextResponse)
def get_raw_log_tail(lines: int = Query(default=200, ge=1, le=2000)) -> str:
    """
    Returns the tail of the persistent attendx.log file as plain text.
    """
    log_path = get_log_file_path()
    if not os.path.exists(log_path):
        return "Log file empty or not created yet."
    
    try:
        with open(log_path, "r", encoding="utf-8", errors="replace") as f:
            all_lines = f.readlines()
            return "".join(all_lines[-lines:])
    except Exception as e:
        return f"Error reading log file: {e}"

@router.get("/logs/download")
def download_log_file():
    """
    Downloads the full persistent attendx.log file directly to the user's browser.
    """
    log_path = get_log_file_path()
    if not os.path.exists(log_path):
        # Create empty file if not yet created
        with open(log_path, "w", encoding="utf-8") as f:
            f.write(f"ATTENDX Log File Initialized at {log_path}\n")

    return FileResponse(
        path=log_path,
        media_type="text/plain",
        filename="attendx.log"
    )
