import cv2
import json
import numpy as np
from typing import Optional, Tuple, Dict, Any, List
from app.config import MODELS_DIR

class FaceRecognizer:
    """
    Real SFace deep facial recognition model (OpenCV Zoo pretrained).
    Extracts true 128-dimensional identity embeddings and performs cosine matching.
    """
    def __init__(self, match_threshold: float = 0.363):
        # OpenCV SFace official cosine similarity threshold is 0.363
        self.match_threshold = match_threshold
        self.sface_model = None
        self.model_path = MODELS_DIR / "face_recognition_sface_2021dec.onnx"
        self._init_model()

    def _init_model(self):
        if self.model_path.exists() and hasattr(cv2, 'FaceRecognizerSF'):
            try:
                self.sface_model = cv2.FaceRecognizerSF.create(
                    str(self.model_path),
                    ""
                )
                print(f"[FaceRecognizer] SFace model loaded successfully from {self.model_path}")
            except Exception as e:
                print(f"[FaceRecognizer] SFace model initialization error: {e}")
                self.sface_model = None
        else:
            self.sface_model = None

    def is_ready(self) -> bool:
        if self.sface_model is None:
            self._init_model()
        return self.sface_model is not None

    def extract_embedding(
        self, 
        image_np: np.ndarray, 
        raw_det: Optional[Any] = None, 
        face_crop_bgr: Optional[np.ndarray] = None
    ) -> List[float]:
        """
        Extracts 128-d deep facial representation using SFace.
        """
        if not self.is_ready():
            return []

        try:
            if raw_det is not None and image_np is not None:
                det_arr = np.array(raw_det, dtype=np.float32)
                # alignCrop requires 15 elements from YuNet detection
                aligned_face = self.sface_model.alignCrop(image_np, det_arr)
                if aligned_face is not None:
                    feat = self.sface_model.feature(aligned_face)
                    if feat is not None:
                        flat_feat = feat.flatten()
                        norm = np.linalg.norm(flat_feat)
                        if norm > 0:
                            flat_feat = flat_feat / norm
                        return flat_feat.tolist()

            if face_crop_bgr is not None and face_crop_bgr.size > 0:
                aligned = cv2.resize(face_crop_bgr, (112, 112))
                feat = self.sface_model.feature(aligned)
                if feat is not None:
                    flat_feat = feat.flatten()
                    norm = np.linalg.norm(flat_feat)
                    if norm > 0:
                        flat_feat = flat_feat / norm
                    return flat_feat.tolist()
        except Exception as e:
            print(f"[FaceRecognizer] SFace extraction error: {e}")

        return []

    def match(
        self, 
        target_embedding: List[float], 
        student_embeddings: List[Dict[str, Any]]
    ) -> Tuple[Optional[str], Optional[str], float]:
        """
        Compares target embedding with registered student embeddings via cosine similarity.
        Returns (student_id, student_name, confidence_percent).
        """
        if not target_embedding or not student_embeddings:
            return None, None, 0.0

        target_vec = np.array(target_embedding, dtype=np.float32).reshape(1, -1)
        target_norm = np.linalg.norm(target_vec)
        if target_norm == 0:
            return None, None, 0.0
        target_vec_normed = target_vec / target_norm

        best_student_id = None
        best_student_name = None
        best_similarity = -1.0

        for item in student_embeddings:
            s_id = item.get("student_id")
            s_name = item.get("name")
            emb_str = item.get("face_embedding")
            if not emb_str:
                continue

            try:
                emb_list = json.loads(emb_str) if isinstance(emb_str, str) else emb_str
                if not emb_list or len(emb_list) != len(target_embedding):
                    continue
                cand_vec = np.array(emb_list, dtype=np.float32).reshape(1, -1)
                cand_norm = np.linalg.norm(cand_vec)
                if cand_norm > 0:
                    cand_vec_normed = cand_vec / cand_norm
                    sim = float(np.dot(target_vec_normed.flatten(), cand_vec_normed.flatten()))
                    if sim > best_similarity:
                        best_similarity = sim
                        best_student_id = s_id
                        best_student_name = s_name
            except Exception:
                continue

        if best_similarity >= self.match_threshold:
            # Map cosine similarity [0.363, 0.65] to [80%, 98%] confidence for intuitive display
            scaled_conf = 80.0 + min(18.0, max(0.0, (best_similarity - self.match_threshold) / (0.60 - self.match_threshold)) * 18.0)
            confidence_pct = round(scaled_conf, 1)
            return best_student_id, best_student_name, confidence_pct
        else:
            return None, None, 0.0

face_recognizer = FaceRecognizer()
