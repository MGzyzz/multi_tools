from ultralytics import YOLO
import cv2

class YoloDetector:
    def __init__(self, model_path="ai/data/yolo_models/yolov8n.pt"):
        self.model = YOLO(model_path)

    def detect_faces(self, frame):
        results = self.model(frame)[0]
        faces = []
        for box in results.boxes:
            cls_id = int(box.cls[0].item())
            if cls_id == 0:  # класс 0 — человек
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                faces.append((x1, y1, x2, y2))
        return faces