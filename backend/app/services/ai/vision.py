import io
import math
import os
import time
from typing import Optional, Dict, Any, List, Tuple
import numpy as np
from PIL import Image
import onnxruntime as ort

from .base import VisionProvider, ModelNotInitializedError
from ...core.config import settings

MODEL_FILENAME = "version-RFB-320.onnx"
WEIGHTS_DIR = os.path.join(os.path.dirname(__file__), "weights")
MODEL_PATH = os.path.join(WEIGHTS_DIR, MODEL_FILENAME)


def _generate_priors() -> np.ndarray:
    """
    Generates 4420 anchor prior boxes for UltraFace 320x240 input.
    """
    priors = []
    shrinkage_list = [8, 16, 32, 64]
    min_boxes = [[10, 16, 24], [32, 48], [64, 96], [128, 192, 256]]
    feature_map_sizes = [[30, 40], [15, 20], [8, 10], [4, 5]]
    for index, (h, w) in enumerate(feature_map_sizes):
        scale_w = 320 / shrinkage_list[index]
        scale_h = 240 / shrinkage_list[index]
        for j in range(h):
            for i in range(w):
                x_center = (i + 0.5) / scale_w
                y_center = (j + 0.5) / scale_h
                for min_box in min_boxes[index]:
                    w_box = min_box / 320
                    h_box = min_box / 240
                    priors.append([x_center, y_center, w_box, h_box])
    return np.array(priors, dtype=np.float32)


class VisionService(VisionProvider):
    """
    On-device computer vision service for observable presence and screen-facing detection.
    Powered by UltraFace-320 (1.21 MB ONNX) executed locally on ONNX Runtime.
    Processes webcam frames strictly in memory; zero images are stored or transmitted.
    """

    def __init__(self, model_path: Optional[str] = None):
        self.model_path = model_path or MODEL_PATH
        self.model_name = "UltraFace-320 (version-RFB-320.onnx)"
        self._session: Optional[ort.InferenceSession] = None
        self._priors: Optional[np.ndarray] = None
        self._initialized = False

    def initialize(self) -> bool:
        """
        Initializes the ONNX runtime inference session.
        """
        if self._initialized and self._session is not None:
            return True

        if not os.path.exists(self.model_path):
            self._initialized = False
            return False

        try:
            # Set ONNX Runtime logging to ERROR to suppress non-critical graph initializer warnings
            sess_options = ort.SessionOptions()
            sess_options.log_severity_level = 3
            self._session = ort.InferenceSession(
                self.model_path,
                sess_options,
                providers=["CPUExecutionProvider"]
            )
            self._priors = _generate_priors()
            self._initialized = True
            return True
        except Exception:
            self._session = None
            self._initialized = False
            return False

    def is_initialized(self) -> bool:
        return self._initialized and self._session is not None

    def get_status(self) -> Dict[str, Any]:
        """
        Returns truthful vision component status.
        Never reports ready unless the model is actually loaded in memory.
        """
        return {
            "status": "ready" if self.is_initialized() else "not_initialized",
            "model": self.model_name if self.is_initialized() else None,
            "runtime": "onnxruntime",
            "device": settings.DEV_ENVIRONMENT,
            "target_upgrade": "On-Device Neural Engine"
        }

    def process_frame(self, image_bytes: bytes, confidence_threshold: float = 0.70) -> Dict[str, Any]:
        """
        Processes a single camera frame entirely in memory.
        Returns observable visual signals:
            - present: bool (face detected)
            - screen_facing: bool (observable frontal orientation)
            - confidence: float
            - box: [xmin, ymin, xmax, ymax] normalized coordinates
            - latency_ms: float
        """
        if not self.is_initialized():
            if not self.initialize():
                raise ModelNotInitializedError("UltraFace computer vision model could not be initialized.")

        start_time = time.perf_counter()

        # Step 1: In-memory image decode and preprocessing via Pillow
        try:
            img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            orig_w, orig_h = img.size
            img_resized = img.resize((320, 240))
            img_np = np.array(img_resized, dtype=np.float32)
        except Exception as e:
            raise ValueError(f"Could not decode image frame in memory: {str(e)}")

        # Normalize: (x - 127.0) / 128.0, transpose to NCHW
        img_np = (img_np - 127.0) / 128.0
        img_np = np.transpose(img_np, (2, 0, 1))  # (3, 240, 320)
        img_input = np.expand_dims(img_np, axis=0)  # (1, 3, 240, 320)

        # Step 2: Run ONNX inference
        outputs = self._session.run(None, {"input": img_input})
        scores = outputs[0]  # (1, 4420, 2)
        boxes = outputs[1]   # (1, 4420, 4)

        # Step 3: Compute probabilities via softmax
        scores_arr = scores[0]  # (4420, 2)
        exp_scores = np.exp(scores_arr - np.max(scores_arr, axis=-1, keepdims=True))
        probs = exp_scores / np.sum(exp_scores, axis=-1, keepdims=True)
        face_probs = probs[:, 1]

        max_idx = int(np.argmax(face_probs))
        max_prob = float(face_probs[max_idx])
        latency_ms = round((time.perf_counter() - start_time) * 1000, 2)

        is_present = max_prob >= confidence_threshold
        is_screen_facing = False
        detected_box = None

        if is_present and self._priors is not None:
            # Decode top bounding box
            prior = self._priors[max_idx]
            box_offset = boxes[0, max_idx]

            center_x = prior[0] + box_offset[0] * 0.1 * prior[2]
            center_y = prior[1] + box_offset[1] * 0.1 * prior[3]
            w = prior[2] * math.exp(box_offset[2] * 0.2)
            h = prior[3] * math.exp(box_offset[3] * 0.2)

            xmin = max(0.0, center_x - w / 2)
            ymin = max(0.0, center_y - h / 2)
            xmax = min(1.0, center_x + w / 2)
            ymax = min(1.0, center_y + h / 2)

            detected_box = [round(xmin, 4), round(ymin, 4), round(xmax, 4), round(ymax, 4)]

            # Observable screen-facing estimate:
            # Frontal face has aspect ratio (w/h) between 0.55 and 1.25, and is centered in frame
            aspect_ratio = (xmax - xmin) / max((ymax - ymin), 0.001)
            is_centered = (0.15 <= center_x <= 0.85) and (0.10 <= center_y <= 0.90)
            if 0.55 <= aspect_ratio <= 1.25 and is_centered:
                is_screen_facing = True

        return {
            "present": is_present,
            "screen_facing": is_screen_facing,
            "confidence": round(max_prob, 4),
            "box": detected_box,
            "latency_ms": latency_ms,
            "device": settings.DEV_ENVIRONMENT,
        }

    async def detect_attention(self, frame_bytes: bytes) -> Dict[str, Any]:
        """
        Base provider method wrapper.
        """
        return self.process_frame(frame_bytes)


# Global singleton instance
vision_service = VisionService()
vision_service.initialize()
