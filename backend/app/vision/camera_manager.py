import cv2
import time
import base64
import numpy as np
from abc import ABC, abstractmethod
from typing import Optional, List, Dict, Any, Tuple
from app.vision.detector import face_detector
from app.vision.recognizer import face_recognizer
from app.vision.tracker import temporal_tracker
from app.core.logger import log, metrics

class CameraSource(ABC):
    @abstractmethod
    def get_frame(self) -> Optional[np.ndarray]:
        pass

    @abstractmethod
    def is_connected(self) -> bool:
        pass

    @abstractmethod
    def release(self):
        pass


class USBCameraSource(CameraSource):
    def __init__(self, device_index: int = 0):
        self.device_index = device_index
        self.cap = None
        self._connect()

    def _connect(self):
        try:
            self.cap = cv2.VideoCapture(self.device_index)
            if not self.cap.isOpened():
                self.cap = None
                log.warning("CAMERA", f"USB Camera index {self.device_index} failed to open")
            else:
                w = int(self.cap.get(cv2.CAP_PROP_FRAME_WIDTH))
                h = int(self.cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
                fps = int(self.cap.get(cv2.CAP_PROP_FPS)) or 24
                log.camera(f"started | source=usb_{self.device_index} | resolution={w}x{h} | {fps} FPS")
        except Exception as e:
            self.cap = None
            log.error("CAMERA", f"USB Camera error: {e}")

    def get_frame(self) -> Optional[np.ndarray]:
        if self.cap and self.cap.isOpened():
            ret, frame = self.cap.read()
            if ret:
                return frame
        return None

    def is_connected(self) -> bool:
        return self.cap is not None and self.cap.isOpened()

    def release(self):
        if self.cap:
            self.cap.release()
            self.cap = None
            log.camera("stopped | source=usb")


class RTSPCameraSource(CameraSource):
    def __init__(self, rtsp_url: str):
        self.rtsp_url = rtsp_url
        self.cap = None
        self._connect()

    def _connect(self):
        try:
            self.cap = cv2.VideoCapture(self.rtsp_url)
            if not self.cap.isOpened():
                self.cap = None
                log.warning("CAMERA", f"RTSP stream failed to open: {self.rtsp_url}")
            else:
                w = int(self.cap.get(cv2.CAP_PROP_FRAME_WIDTH))
                h = int(self.cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
                log.camera(f"started | source=rtsp | resolution={w}x{h}")
        except Exception as e:
            self.cap = None
            log.error("CAMERA", f"RTSP connection error: {e}")

    def get_frame(self) -> Optional[np.ndarray]:
        if self.cap and self.cap.isOpened():
            ret, frame = self.cap.read()
            if ret:
                return frame
        return None

    def is_connected(self) -> bool:
        return self.cap is not None and self.cap.isOpened()

    def release(self):
        if self.cap:
            self.cap.release()
            self.cap = None
            log.camera("stopped | source=rtsp")


class BrowserCameraSource(CameraSource):
    def __init__(self):
        self.last_frame = None
        self.last_timestamp = 0
        self.started_logged = False
        self.stream_lost_logged = False

    def push_base64_frame(self, b64_str: str) -> Optional[np.ndarray]:
        try:
            if "," in b64_str:
                b64_str = b64_str.split(",")[1]
            img_bytes = base64.b64decode(b64_str)
            nparr = np.frombuffer(img_bytes, np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if frame is not None:
                h, w = frame.shape[:2]
                res_str = f"{w}x{h}"
                metrics.record_frame(res_str)
                
                if not self.started_logged:
                    log.camera(f"started | source=browser_webcam | resolution={res_str}")
                    self.started_logged = True
                    self.stream_lost_logged = False
                elif self.stream_lost_logged:
                    log.camera("stream restored")
                    self.stream_lost_logged = False

                self.last_frame = frame
                self.last_timestamp = time.time()
                metrics.camera_healthy = True
                return frame
        except Exception as e:
            log.error("CAMERA", f"Frame decode error: {e}")
        return None

    def get_frame(self) -> Optional[np.ndarray]:
        if time.time() - self.last_timestamp < 5.0:
            return self.last_frame
        if not self.stream_lost_logged and self.started_logged:
            log.warning("CAMERA", "frame stream lost")
            self.stream_lost_logged = True
            metrics.camera_healthy = False
        return None

    def is_connected(self) -> bool:
        connected = time.time() - self.last_timestamp < 5.0
        metrics.camera_healthy = connected
        return connected

    def release(self):
        self.last_frame = None
        self.started_logged = False
        log.camera("stopped | source=browser_webcam")


class CameraManager:
    """
    Unified Camera Manager orchestrating frame acquisition, lightweight temporal tracking,
    and conditional SFace facial recognition.
    """
    def __init__(self):
        self.current_source_type = "browser"  # 'browser', 'usb', 'rtsp', 'demo'
        self.source: CameraSource = BrowserCameraSource()
        self.tracker = temporal_tracker

    def set_source(self, source_type: str, config: Optional[Dict[str, Any]] = None):
        if self.source:
            self.source.release()

        self.current_source_type = source_type
        if source_type == "usb":
            device_idx = config.get("device_index", 0) if config else 0
            self.source = USBCameraSource(device_idx)
        elif source_type == "rtsp":
            rtsp_url = config.get("rtsp_url", "") if config else ""
            self.source = RTSPCameraSource(rtsp_url)
        else:
            self.source = BrowserCameraSource()

    def reset_tracker(self):
        self.tracker.reset()

    def process_frame(
        self,
        frame: np.ndarray,
        registered_students: List[Dict[str, Any]],
        force_reidentification: bool = False
    ) -> Dict[str, Any]:
        """
        Executes fast temporal tracking with conditional SFace recognition.
        Returns detection overlay data and normalized observations for the attendance engine.
        """
        if frame is None or frame.size == 0:
            return {
                "status": "no_frame",
                "detections": [],
                "observations": [],
                "faces_count": 0,
                "timestamp": time.time()
            }

        detections_overlay, normalized_observations = self.tracker.process_frame(
            frame,
            registered_students,
            force_reidentification=force_reidentification
        )

        return {
            "status": "success",
            "detections": detections_overlay,
            "observations": normalized_observations,
            "faces_count": len(detections_overlay),
            "timestamp": time.time()
        }

camera_manager = CameraManager()
