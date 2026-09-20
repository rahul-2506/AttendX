import cv2
import numpy as np
from typing import List, Dict, Any, Tuple, Optional
from app.config import MODELS_DIR

class FaceDetector:
    """
    Real CPU-optimized face detector using OpenCV YuNet ONNX model.
    Does not fabricate detections when model is unavailable or when no face is present.
    """
    def __init__(self, score_threshold: float = 0.5):
        self.score_threshold = score_threshold
        self.yunet_model = None
        self.model_path = MODELS_DIR / "face_detection_yunet_2023mar.onnx"
        self._init_detector()

    def _init_detector(self):
        if self.model_path.exists() and hasattr(cv2, 'FaceDetectorYN'):
            try:
                # Initialize YuNet detector
                self.yunet_model = cv2.FaceDetectorYN.create(
                    str(self.model_path),
                    "",
                    (320, 320),
                    self.score_threshold,
                    0.3,
                    5000
                )
                print(f"[FaceDetector] YuNet model loaded successfully from {self.model_path}")
            except Exception as e:
                print(f"[FaceDetector] YuNet model load error: {e}")
                self.yunet_model = None
        else:
            self.yunet_model = None

    def is_ready(self) -> bool:
        if self.yunet_model is None:
            self._init_detector()
        return self.yunet_model is not None

    def detect(self, image_np: np.ndarray) -> Tuple[List[Dict[str, Any]], Optional[Dict[str, Any]]]:
        """
        Detects visible faces and returns real bounding box coordinates.
        Returns (detections, error_dict).
        """
        if not self.is_ready():
            return [], {
                "status": "vision_unavailable",
                "reason": "YuNet model weights not found or failed to initialize."
            }

        if image_np is None or image_np.size == 0:
            return [], None

        h, w = image_np.shape[:2]
        faces = []

        try:
            self.yunet_model.setInputSize((w, h))
            _, detections = self.yunet_model.detect(image_np)
            
            if detections is not None:
                for det in detections:
                    box_x, box_y, box_w, box_h, conf = det[0], det[1], det[2], det[3], det[14]
                    if conf >= self.score_threshold:
                        # Normalize coordinates as percentages of frame (0-100%)
                        faces.append({
                            "bbox": {
                                "x": max(0.0, min(100.0, round(float((box_x / w) * 100), 2))),
                                "y": max(0.0, min(100.0, round(float((box_y / h) * 100), 2))),
                                "width": max(0.0, min(100.0, round(float((box_w / w) * 100), 2))),
                                "height": max(0.0, min(100.0, round(float((box_h / h) * 100), 2))),
                            },
                            "confidence": round(float(conf * 100), 1),
                            "raw_box": (int(box_x), int(box_y), int(box_w), int(box_h)),
                            "raw_det": det.tolist() if hasattr(det, 'tolist') else list(det)
                        })
            return faces, None
        except Exception as e:
            print(f"[FaceDetector] YuNet detection runtime error: {e}")
            return [], {
                "status": "detection_error",
                "reason": str(e)
            }

face_detector = FaceDetector()
