### ai/main.py
import cv2
import numpy as np
import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from detection.yolo_detector import YoloDetector
from recognition.facenet_model import FaceEmbedder
from utils.compare_faces import find_best_match
from backend_integration import send_recognition_result_to_backend

# Загрузка модели
yolo = YoloDetector()
embedder = FaceEmbedder()

# Загрузка эмбеддингов
EMBEDDINGS_PATH = "ai/data/embeddings.npy"
embeddings_db = np.load(EMBEDDINGS_PATH, allow_pickle=True).item()

# Запуск камеры
cap = cv2.VideoCapture(0)

while True:
    ret, frame = cap.read()
    if not ret:
        break

    bboxes = yolo.detect_faces(frame)

    for (x1, y1, x2, y2) in bboxes:
        face_img = frame[y1:y2, x1:x2]
        embedding = embedder.get_embedding(face_img)
        best_match = find_best_match(embedding, embeddings_db)

        label = best_match if best_match else "Unknown"
        cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
        cv2.putText(frame, label, (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)

    cv2.imshow("Face Recognition", frame)
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()

# внутри цикла обработки лиц:
send_recognition_result_to_backend(label)