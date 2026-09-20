import cv2
import time
import uuid
import numpy as np
from typing import List, Dict, Any, Tuple, Optional
from app.vision.detector import face_detector
from app.vision.recognizer import face_recognizer
from app.core.logger import log, metrics

class TrackedFace:
    """
    State container for an active facial track.
    Maintains spatial position, identity, tracking quality, and temporal statistics.
    """
    def __init__(
        self,
        track_id: str,
        student_id: Optional[str],
        name: Optional[str],
        raw_box: Tuple[int, int, int, int],
        frame_shape: Tuple[int, int],
        identity_confidence: float = 95.0,
        observation_source: str = "sface_recognition"
    ):
        self.track_id = track_id
        self.student_id = student_id
        self.name = name
        self.raw_box = raw_box  # (x, y, w, h) in pixels
        self.frame_shape = frame_shape  # (h, w)
        self.identity_confidence = identity_confidence
        self.observation_source = observation_source
        
        now = time.time()
        self.created_at = now
        self.last_update_at = now
        self.last_confirmed_at = now if student_id else 0.0
        
        self.tracker_confidence = 1.0
        self.last_logged_confidence = 1.0
        self.tracking_quality = 1.0
        self.last_center = self._calc_center(raw_box)
        self.velocity = (0.0, 0.0)
        self.frames_tracked = 1
        self.consecutive_tracking_failures = 0
        self.reidentification_attempts = 0
        self.is_lost = False
        self.unknown_logged = False

    def _calc_center(self, box: Tuple[int, int, int, int]) -> Tuple[float, float]:
        x, y, w, h = box
        return (float(x + w / 2.0), float(y + h / 2.0))

    def update_box(
        self,
        new_box: Tuple[int, int, int, int],
        confidence: float,
        source: str = "temporal_tracking",
        is_confirmed: bool = False
    ):
        now = time.time()
        dt = max(0.001, now - self.last_update_at)
        new_center = self._calc_center(new_box)
        
        vx = (new_center[0] - self.last_center[0]) / dt
        vy = (new_center[1] - self.last_center[1]) / dt
        
        # Exponential moving average for velocity
        self.velocity = (0.7 * self.velocity[0] + 0.3 * vx, 0.7 * self.velocity[1] + 0.3 * vy)
        self.last_center = new_center
        self.raw_box = new_box
        self.last_update_at = now
        
        prev_conf = self.tracker_confidence
        self.tracker_confidence = confidence
        self.frames_tracked += 1
        self.consecutive_tracking_failures = 0
        self.observation_source = source
        
        if self.is_lost:
            self.is_lost = False
            log.track(f"RESTORED | track={self.track_id} | student={self.name or 'Unknown'}")
        
        # Log significant confidence changes (>0.25 change)
        if abs(self.tracker_confidence - self.last_logged_confidence) >= 0.25:
            log.track(f"CONFIDENCE | track={self.track_id} | student={self.name or 'Unknown'} | {self.last_logged_confidence:.2f} \u2192 {self.tracker_confidence:.2f}")
            self.last_logged_confidence = self.tracker_confidence
            
        if self.tracker_confidence < 0.55 and prev_conf >= 0.55:
            log.track(f"DEGRADED | track={self.track_id} | student={self.name or 'Unknown'} | confidence={self.tracker_confidence:.2f}")

        if is_confirmed:
            self.last_confirmed_at = now

    def mark_failed(self):
        self.consecutive_tracking_failures += 1
        self.tracker_confidence = max(0.0, self.tracker_confidence - 0.25)
        if self.consecutive_tracking_failures >= 4 and not self.is_lost:
            self.is_lost = True
            duration = round(time.time() - self.last_update_at, 1)
            time_str = datetime_str(self.last_update_at)
            log.track(f"LOST | track={self.track_id} | student={self.name or 'Unknown'} | last_seen={time_str} | duration={duration}s")

    def get_normalized_bbox(self) -> Dict[str, float]:
        h, w = self.frame_shape
        if h <= 0 or w <= 0:
            return {"x": 0.0, "y": 0.0, "width": 0.0, "height": 0.0}
        
        bx, by, bw, bh = self.raw_box
        return {
            "x": max(0.0, min(100.0, round(float((bx / w) * 100), 2))),
            "y": max(0.0, min(100.0, round(float((by / h) * 100), 2))),
            "width": max(0.0, min(100.0, round(float((bw / w) * 100), 2))),
            "height": max(0.0, min(100.0, round(float((bh / h) * 100), 2))),
        }

def datetime_str(ts: float) -> str:
    import datetime
    return datetime.datetime.fromtimestamp(ts).strftime("%H:%M:%S")

def compute_iou(boxA: Tuple[int, int, int, int], boxB: Tuple[int, int, int, int]) -> float:
    """Computes Intersection over Union between two (x, y, w, h) boxes."""
    xA = max(boxA[0], boxB[0])
    yA = max(boxA[1], boxB[1])
    xB = min(boxA[0] + boxA[2], boxB[0] + boxB[2])
    yB = min(boxA[1] + boxA[3], boxB[1] + boxB[3])

    interWidth = max(0, xB - xA)
    interHeight = max(0, yB - yA)
    interArea = interWidth * interHeight

    boxAArea = boxA[2] * boxA[3]
    boxBArea = boxB[2] * boxB[3]
    unionArea = boxAArea + boxBArea - interArea

    if unionArea <= 0:
        return 0.0
    return float(interArea) / float(unionArea)


class TemporalFaceTracker:
    """
    High-Performance CPU Temporal Tracker with Recognize-Then-Track Architecture.
    
    1. Runs fast spatial/IoU + correlation tracking across consecutive frames.
    2. Selectively triggers SFace deep recognition only on new tracks, degraded confidence,
       or periodic safety confirmation intervals.
    3. Strictly isolates active class session roster.
    4. Enforces re-identification upon track loss to prevent identity transfer.
    """
    def __init__(
        self,
        tracker_confidence_threshold: float = 0.55,
        reidentification_interval_seconds: float = 6.0,
        max_unconfirmed_track_seconds: float = 8.0,
        max_tracking_failures: int = 4
    ):
        self.tracker_confidence_threshold = tracker_confidence_threshold
        self.reidentification_interval = reidentification_interval_seconds
        self.max_unconfirmed_track_time = max_unconfirmed_track_seconds
        self.max_tracking_failures = max_tracking_failures
        
        self.active_tracks: Dict[str, TrackedFace] = {}
        self.track_counter = 0
        self.last_detection_timestamp = 0.0
        self.last_reported_face_count = -1
        self.last_detect_log_time = 0.0

    def reset(self):
        self.active_tracks.clear()
        self.track_counter = 0
        self.last_detection_timestamp = 0.0
        self.last_reported_face_count = -1
        self.last_detect_log_time = 0.0

    def process_frame(
        self,
        frame: np.ndarray,
        registered_students: List[Dict[str, Any]],
        force_reidentification: bool = False
    ) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        """
        Executes hybrid Fast Tracking + Conditional SFace Recognition loop.
        
        Returns:
            (detections_for_camera_overlay, normalized_observations_for_attendance_engine)
        """
        if frame is None or frame.size == 0:
            return [], []

        h, w = frame.shape[:2]
        now = time.time()
        track_start_time = now

        # Step 1: Run YuNet face detector to locate visible faces
        det_t0 = time.time()
        detected_faces, err = face_detector.detect(frame)
        det_duration_ms = (time.time() - det_t0) * 1000.0

        if err is not None:
            log.warning("DETECT", f"Face detector error: {err}")
            return [], []

        num_faces = len(detected_faces)
        metrics.record_detection(det_duration_ms, num_faces)

        # Log face count changes or periodic detection summary (every 4s)
        if self.last_reported_face_count != num_faces:
            if self.last_reported_face_count >= 0:
                log.detect(f"face_count_changed | {self.last_reported_face_count} \u2192 {num_faces} | time={det_duration_ms:.1f}ms")
            self.last_reported_face_count = num_faces
            self.last_detect_log_time = now
        elif (now - self.last_detect_log_time) >= 4.0:
            log.detect(f"faces={num_faces} | avg_time={det_duration_ms:.1f}ms")
            self.last_detect_log_time = now

        matched_detections = set()
        matched_track_ids = set()

        # Step 2: Match visible face detections with existing active tracks using spatial IoU
        for track_id, track in list(self.active_tracks.items()):
            best_iou = 0.0
            best_det_idx = -1

            for idx, det in enumerate(detected_faces):
                if idx in matched_detections:
                    continue
                raw_box = det.get("raw_box")
                if not raw_box:
                    continue

                iou = compute_iou(track.raw_box, raw_box)
                if iou > best_iou:
                    best_iou = iou
                    best_det_idx = idx

            # Spatial association threshold
            if best_iou >= 0.30 and best_det_idx >= 0:
                det = detected_faces[best_det_idx]
                raw_box = det["raw_box"]
                det_conf = det.get("confidence", 90.0) / 100.0

                matched_detections.add(best_det_idx)
                matched_track_ids.add(track_id)

                # Check if we need SFace re-identification
                time_since_confirmed = now - track.last_confirmed_at
                needs_reid = (
                    force_reidentification or
                    track.student_id is None or  # Unknown needs to keep checking
                    time_since_confirmed >= self.reidentification_interval or
                    track.tracker_confidence < self.tracker_confidence_threshold
                )

                if needs_reid and face_recognizer.is_ready() and registered_students:
                    raw_det = det.get("raw_det")
                    face_crop = frame[max(0, raw_box[1]):min(h, raw_box[1] + raw_box[3]),
                                      max(0, raw_box[0]):min(w, raw_box[0] + raw_box[2])]

                    sf_t0 = time.time()
                    emb = face_recognizer.extract_embedding(frame, raw_det=raw_det, face_crop_bgr=face_crop)
                    sf_duration_ms = (time.time() - sf_t0) * 1000.0
                    metrics.record_sface(sf_duration_ms, is_reid=bool(track.student_id))

                    if emb:
                        matched_sid, matched_name, conf = face_recognizer.match(emb, registered_students)
                        sim = conf / 100.0
                        threshold = face_recognizer.match_threshold

                        if matched_sid:
                            if track.student_id and track.student_id == matched_sid:
                                log.reidentify(f"track={track.track_id} | previous_student={track.name} | similarity={sim:.3f} | result=CONFIRMED")
                            else:
                                log.recognize(f"track={track.track_id} | candidate_count={len(registered_students)} | best_match={matched_name} | similarity={sim:.3f} | threshold={threshold:.3f} | result=CONFIRMED | time={sf_duration_ms:.1f}ms")
                            
                            track.student_id = matched_sid
                            track.name = matched_name
                            track.identity_confidence = conf
                            track.update_box(raw_box, confidence=1.0, source="sface_recognition", is_confirmed=True)
                        else:
                            if not track.unknown_logged:
                                log.recognize(f"track={track.track_id} | best_similarity={sim:.3f} | threshold={threshold:.3f} | result=UNKNOWN")
                                track.unknown_logged = True
                            track.student_id = None
                            track.name = None
                            track.identity_confidence = 0.0
                            track.update_box(raw_box, confidence=0.9, source="sface_recognition", is_confirmed=False)
                    else:
                        track.update_box(raw_box, confidence=det_conf, source="temporal_tracking")
                else:
                    # Maintain existing identity through fast temporal tracking (Zero SFace calls!)
                    track.update_box(raw_box, confidence=det_conf, source="temporal_tracking")
            else:
                track.mark_failed()

        # Step 3: Handle unmatched new detections (Create new tracks)
        for idx, det in enumerate(detected_faces):
            if idx in matched_detections:
                continue

            raw_box = det.get("raw_box")
            if not raw_box:
                continue

            self.track_counter += 1
            new_track_id = f"T{self.track_counter:02d}"

            # Run SFace on newly appeared face
            matched_sid = None
            matched_name = None
            identity_conf = 0.0

            if face_recognizer.is_ready() and registered_students:
                raw_det = det.get("raw_det")
                face_crop = frame[max(0, raw_box[1]):min(h, raw_box[1] + raw_box[3]),
                                  max(0, raw_box[0]):min(w, raw_box[0] + raw_box[2])]
                
                sf_t0 = time.time()
                emb = face_recognizer.extract_embedding(frame, raw_det=raw_det, face_crop_bgr=face_crop)
                sf_duration_ms = (time.time() - sf_t0) * 1000.0
                metrics.record_sface(sf_duration_ms, is_reid=False)

                if emb:
                    matched_sid, matched_name, identity_conf = face_recognizer.match(emb, registered_students)
                    sim = identity_conf / 100.0
                    threshold = face_recognizer.match_threshold
                    if matched_sid:
                        log.recognize(f"track={new_track_id} | candidate_count={len(registered_students)} | best_match={matched_name} | similarity={sim:.3f} | threshold={threshold:.3f} | result=CONFIRMED | time={sf_duration_ms:.1f}ms")
                    else:
                        log.recognize(f"track={new_track_id} | best_similarity={sim:.3f} | threshold={threshold:.3f} | result=UNKNOWN")

            new_track = TrackedFace(
                track_id=new_track_id,
                student_id=matched_sid,
                name=matched_name,
                raw_box=raw_box,
                frame_shape=(h, w),
                identity_confidence=identity_conf if matched_sid else 0.0,
                observation_source="sface_recognition" if matched_sid else "yunet_detection"
            )
            if not matched_sid:
                new_track.unknown_logged = True

            self.active_tracks[new_track_id] = new_track
            log.track(f"CREATED | track={new_track_id} | student={matched_name or 'Unknown'} | bbox={raw_box} | confidence=1.00")

        # Step 4: Prune dead / lost tracks
        pruned_tracks = {}
        for track_id, track in self.active_tracks.items():
            if not track.is_lost and track.consecutive_tracking_failures <= self.max_tracking_failures:
                pruned_tracks[track_id] = track
            else:
                if not track.student_id:
                    log.track(f"UNKNOWN_LOST | track={track.track_id}")
        self.active_tracks = pruned_tracks

        # Step 5: Format normalized output & calculate performance metrics
        detections_overlay = []
        normalized_observations = []
        conf_sum = 0.0
        unknown_count = 0

        for track_id, track in self.active_tracks.items():
            bbox_norm = track.get_normalized_bbox()
            is_recognized = track.student_id is not None
            conf_sum += track.tracker_confidence
            if not is_recognized:
                unknown_count += 1
            
            status_tag = "recognized" if is_recognized else "unknown"
            if track.tracker_confidence < self.tracker_confidence_threshold and is_recognized:
                status_tag = "uncertain"

            detections_overlay.append({
                "track_id": track.track_id,
                "student_id": track.student_id,
                "name": track.name,
                "confidence": track.identity_confidence if is_recognized else round(track.tracker_confidence * 100, 1),
                "tracking_confidence": round(track.tracker_confidence * 100, 1),
                "bbox": bbox_norm,
                "status": status_tag,
                "source": track.observation_source
            })

            normalized_observations.append({
                "student_id": track.student_id,
                "student_name": track.name,
                "track_id": track.track_id,
                "timestamp": now,
                "identity_confidence": track.identity_confidence,
                "tracking_confidence": track.tracker_confidence,
                "bbox": bbox_norm,
                "observation_source": track.observation_source,
                "is_confirmed": is_recognized and (track.tracker_confidence >= self.tracker_confidence_threshold)
            })

        track_duration_ms = (time.time() - track_start_time) * 1000.0
        avg_conf = (conf_sum / len(self.active_tracks)) if self.active_tracks else 1.0
        metrics.record_tracking(track_duration_ms, len(self.active_tracks), avg_conf, unknown_count)

        # Performance monitoring window check (every 5 seconds)
        perf_report = metrics.check_and_report_performance()
        if perf_report:
            log.performance(
                f"camera_fps={perf_report['camera_fps']} | processing_fps={perf_report['processing_fps']} | "
                f"active_tracks={perf_report['active_tracks']} | yunet_calls={perf_report['yunet_calls']} | "
                f"sface_calls={perf_report['sface_calls']} | reidentifications={perf_report['reidentifications']} | "
                f"avg_detection_ms={perf_report['avg_detection_ms']} | avg_sface_ms={perf_report['avg_sface_ms']} | "
                f"avg_tracking_ms={perf_report['avg_tracking_ms']} | avg_tracker_confidence={perf_report['avg_tracker_confidence']} | "
                f"unknown_faces={perf_report['unknown_faces']}"
            )

        return detections_overlay, normalized_observations

temporal_tracker = TemporalFaceTracker()
