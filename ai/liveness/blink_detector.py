import cv2
import mediapipe as mp
import numpy as np

# MediaPipe Face Mesh landmark indices for each eye
LEFT_EYE = [33, 160, 158, 133, 153, 144]
RIGHT_EYE = [362, 385, 387, 263, 373, 380]

EAR_THRESHOLD = 0.20  # eye aspect ratio below this = eye is closed
CONSEC_FRAMES = 2  # consecutive closed frames to count as a blink


def _eye_aspect_ratio(landmarks, indices, w, h):
    pts = [(int(landmarks[i].x * w), int(landmarks[i].y * h)) for i in indices]
    v1 = np.linalg.norm(np.array(pts[1]) - np.array(pts[5]))
    v2 = np.linalg.norm(np.array(pts[2]) - np.array(pts[4]))
    horiz = np.linalg.norm(np.array(pts[0]) - np.array(pts[3]))
    return (v1 + v2) / (2.0 * horiz + 1e-6)


class BlinkDetector:
    def __init__(self):
        self._mesh = mp.solutions.face_mesh.FaceMesh(
            max_num_faces=1,
            refine_landmarks=True,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5,
        )
        self._closed_frames = 0
        self.blink_count = 0

    def process(self, frame_bgr) -> bool:
        """Feed one BGR frame. Returns True the moment a blink is confirmed."""
        h, w = frame_bgr.shape[:2]
        rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
        result = self._mesh.process(rgb)

        if not result.multi_face_landmarks:
            self._closed_frames = 0
            return False

        lm = result.multi_face_landmarks[0].landmark
        ear = (
            _eye_aspect_ratio(lm, LEFT_EYE, w, h)
            + _eye_aspect_ratio(lm, RIGHT_EYE, w, h)
        ) / 2.0

        if ear < EAR_THRESHOLD:
            self._closed_frames += 1
        else:
            if self._closed_frames >= CONSEC_FRAMES:
                self.blink_count += 1
                self._closed_frames = 0
                return True
            self._closed_frames = 0

        return False

    def close(self):
        self._mesh.close()
