### ai/main.py
import cv2
import numpy as np
import sys
import os
import threading
import time
from queue import Queue

# Добавляем корень в PYTHONPATH
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from detection.yolo_detector import YoloDetector
from recognition.facenet_model import FaceEmbedder
from utils.compare_faces import find_best_match
from backend_integration import send_recognition_result_to_backend
from utils.log_similarity import log_similarity



# TO-DO реализовать через FastAPI запуск ИИ так чтобы первый url должен был быть
# /status для получение информации о состоянии
# /get_ai_start для запуска ИИ. Данный запрос должен открыть камеру и отсканировать лицо
# после сканирования отправить на front_end результат {"username": "Dmitry"}
# Окно должно рабоать ровно 30 секунд
# Все данные должны быть отправлены на сервер ввиде json формата
# прописать if __name__ == "__main__": и запускать только в этом случае
# Пути
EMBEDDINGS_PATH = "ai/data/embeddings.npy"

# Загрузка модели
print("[INFO] Загружаем модели...")
yolo = YoloDetector()
embedder = FaceEmbedder()

# Проверка наличия файла эмбеддингов
if not os.path.exists(EMBEDDINGS_PATH):
    raise FileNotFoundError(f"[ERROR] Файл эмбеддингов не найден: {EMBEDDINGS_PATH}")
embeddings_db = np.load(EMBEDDINGS_PATH, allow_pickle=True).item()
print(f"[INFO] Загружено эмбеддингов: {len(embeddings_db)}")

# Очередь на отправку результатов
send_queue = Queue()

# Последний отправленный пользователь (для избежания спама)
last_sent_user = None
last_sent_time = 0
COOLDOWN_SECONDS = 3  # интервал повторной отправки одного и того же лица

# Фоновый поток для отправки
def sender_loop():
    global last_sent_user, last_sent_time
    while True:
        user_id, similarity = send_queue.get()

        now = time.time()
        if user_id != "Unknown":
            if user_id != last_sent_user or (now - last_sent_time) > COOLDOWN_SECONDS:
                log_similarity(user_id, similarity)
                send_recognition_result_to_backend(user_id)
                last_sent_user = user_id
                last_sent_time = now
        else:
            if last_sent_user != "Unknown" or (now - last_sent_time) > COOLDOWN_SECONDS:
                send_recognition_result_to_backend("Unknown")
                last_sent_user = "Unknown"
                last_sent_time = now

        send_queue.task_done()

# Запуск фонового потока
threading.Thread(target=sender_loop, daemon=True).start()

# Запуск камеры
# Не работает камера? Поменяй на 1
cap = cv2.VideoCapture(0)
if not cap.isOpened():
    raise RuntimeError("[ERROR] Не удалось открыть камеру")

print("[INFO] Запущено распознавание. Нажмите 'q' для выхода.")

while True:
    start_time = time.time()

    ret, frame = cap.read()
    if not ret:
        print("[WARNING] Кадр не получен. Пропуск...")
        continue

    bboxes = yolo.detect_faces(frame)

    for (x1, y1, x2, y2) in bboxes:
        face_img = frame[y1:y2, x1:x2]

        try:
            embedding = embedder.get_embedding(face_img)
        except Exception as e:
            print(f"[ERROR] Ошибка при получении эмбеддинга: {e}")
            continue

        user_id, similarity = find_best_match(embedding, embeddings_db)
        label = user_id if user_id != "Unknown" else "Unknown"

        # Отправка в очередь
        send_queue.put((user_id, similarity))

        # Отрисовка
        cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
        cv2.putText(frame, f"{label} ({similarity:.2f})", (x1, y1 - 10),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)

    # Отображение
    cv2.imshow("Face Recognition", frame)

    # Производительность
    fps = 1.0 / (time.time() - start_time)
    print(f"[INFO] FPS: {fps:.2f}")

    # Выход
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

# Завершение
cap.release()
cv2.destroyAllWindows()
print("[INFO] Работа завершена.")
