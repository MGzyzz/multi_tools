import cv2
import numpy as np
import sys
import os
import threading
import time
import uvicorn
from fastapi import FastAPI, BackgroundTasks, File, UploadFile
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import requests
import matplotlib

matplotlib.use("Agg")  # Используем аггре-режим для избегания GUI

# Добавляем корень в PYTHONPATH
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from detection.yolo_detector import YoloDetector
from recognition.facenet_model import FaceEmbedder
from utils.compare_faces import find_best_match
from utils.log_similarity import log_similarity

# Создаем FastAPI приложение
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Разрешаем запросы с Vite (или React)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Пути
EMBEDDINGS_PATH = "ai/data/embeddings.npy"
SCAN_DURATION = 15  # Увеличиваем время сканирования до 15 секунд
SIMILARITY_THRESHOLD = 0.75  # Базовый порог для распознавания
HIGHER_SIMILARITY_THRESHOLD = 0.7  # Повышенный порог для надежного распознавания
CONFIDENCE_SAMPLES = (
    8  # Увеличенное количество положительных образцов для подтверждения
)

# Глобальные переменные для управления камерой
camera_running = False
stop_camera = threading.Event()
recognition_result = {"username": "Unknown"}
face_detected = threading.Event()  # Флаг для сигнализации об успешном распознавании

# Модели
yolo = None
embedder = None
embeddings_db = None


# Инициализация моделей
def init_models():
    global yolo, embedder, embeddings_db

    if yolo is None:
        print("[INFO] Загружаем модели...")
        yolo = YoloDetector()
        embedder = FaceEmbedder()

        # Проверка наличия файла эмбеддингов
        if not os.path.exists(EMBEDDINGS_PATH):
            raise FileNotFoundError(
                f"[ERROR] Файл эмбеддингов не найден: {EMBEDDINGS_PATH}"
            )
        embeddings_db = np.load(EMBEDDINGS_PATH, allow_pickle=True).item()
        print(f"[INFO] Загружено эмбеддингов: {len(embeddings_db)}")

        # Вывести все доступные ID для отладки
        print(f"[INFO] Доступные ID в базе: {list(embeddings_db.keys())}")
    return True


USERNAME_MAPPING = {
    "user_1": "dmitriy",
    "user_2": "admin",
    # Добавьте другие соответствия по мере необходимости
}


# Сброс состояния распознавания
def reset_recognition_state():
    global recognition_result, face_detected
    recognition_result = {"username": "Unknown"}
    face_detected.clear()
    print("[INFO] Состояние распознавания сброшено")


# Модифицированная функция recognize_faces() с улучшенной точностью
def recognize_faces():
    global camera_running, recognition_result, face_detected

    # Сброс состояния при каждом новом запуске
    reset_recognition_state()

    # Инициализация моделей, если они еще не загружены
    init_models()

    # Запуск камеры
    cap = cv2.VideoCapture(1)
    if not cap.isOpened():
        print("[ERROR] Не удалось открыть камеру")
        camera_running = False
        return {"error": "Не удалось открыть камеру"}

    print(
        "[INFO] Запущено распознавание. Ожидаем обнаружения лица или максимум",
        SCAN_DURATION,
        "секунд",
    )
    camera_running = True
    start_scan_time = time.time()

    # Словарь для подсчета совпадений по каждому пользователю
    user_match_counts = {}
    consecutive_matches = {}  # Для отслеживания последовательных совпадений
    last_matched_user = None  # Для отслеживания последнего распознанного пользователя

    try:
        while (
            time.time() - start_scan_time < SCAN_DURATION and not stop_camera.is_set()
        ):
            start_time = time.time()

            ret, frame = cap.read()
            if not ret:
                print("[WARNING] Кадр не получен. Пропуск...")
                continue

            # Проверка качества изображения
            if frame.size == 0 or frame.shape[0] == 0 or frame.shape[1] == 0:
                print("[WARNING] Получен некорректный кадр. Пропуск...")
                continue

            # Детекция лиц
            bboxes = yolo.detect_faces(frame)

            # Если обнаружены лица
            if len(bboxes) > 0:
                # Выбираем самое большое лицо (предположительно самое близкое к камере)
                largest_area = 0
                largest_face_idx = -1

                for idx, (x1, y1, x2, y2) in enumerate(bboxes):
                    area = (x2 - x1) * (y2 - y1)
                    if area > largest_area:
                        largest_area = area
                        largest_face_idx = idx

                # Обрабатываем только самое большое лицо
                if largest_face_idx >= 0:
                    x1, y1, x2, y2 = bboxes[largest_face_idx]

                    # Проверка минимального размера лица (для отфильтровки слишком маленьких)
                    min_face_size = 100  # минимальный размер в пикселях
                    if (x2 - x1) >= min_face_size and (y2 - y1) >= min_face_size:
                        face_img = frame[y1:y2, x1:x2]

                        try:
                            # Применяем предобработку для улучшения качества
                            face_img = cv2.resize(
                                face_img, (160, 160)
                            )  # Размер, который ожидает FaceNet
                            face_img = cv2.cvtColor(
                                face_img, cv2.COLOR_BGR2RGB
                            )  # Перевод в RGB

                            # Получаем эмбеддинг
                            embedding = embedder.get_embedding(face_img)

                            # Проверяем, что эмбеддинг не пустой
                            if embedding is None:
                                print(
                                    "[WARNING] Не удалось получить эмбеддинг для обнаруженного лица"
                                )
                                continue

                            # Находим наилучшее совпадение
                            user_id, similarity = find_best_match(
                                embedding, embeddings_db
                            )

                            # Для отладки - более подробная информация
                            print(
                                f"[DEBUG] Обнаружено лицо: размер={x2-x1}x{y2-y1}, best match: {user_id}, similarity: {similarity:.4f}"
                            )

                            # Если найдено лицо с высокой схожестью
                            if similarity > HIGHER_SIMILARITY_THRESHOLD:
                                # Если это новый пользователь или другой пользователь, сбрасываем счетчик последовательных совпадений
                                if last_matched_user != user_id:
                                    consecutive_matches = {user_id: 1}
                                    last_matched_user = user_id
                                else:
                                    consecutive_matches[user_id] = (
                                        consecutive_matches.get(user_id, 0) + 1
                                    )

                                # Увеличиваем счетчик совпадений для данного пользователя
                                if user_id not in user_match_counts:
                                    user_match_counts[user_id] = 0
                                user_match_counts[user_id] += 1

                                # Отрисовка результата
                                cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
                                real_username = USERNAME_MAPPING.get(user_id, "Unknown")
                                label = f"{real_username} ({similarity:.2f})"
                                cv2.putText(
                                    frame,
                                    label,
                                    (x1, y1 - 10),
                                    cv2.FONT_HERSHEY_SIMPLEX,
                                    0.7,
                                    (0, 255, 0),
                                    2,
                                )

                                # Проверяем, достигли ли мы порога уверенности для этого пользователя
                                if (
                                    consecutive_matches.get(user_id, 0)
                                    >= CONFIDENCE_SAMPLES
                                ):
                                    real_username = USERNAME_MAPPING.get(
                                        user_id, "Unknown"
                                    )
                                    if real_username != "Unknown":
                                        # Сохраняем результат распознавания
                                        recognition_result = {"username": real_username}
                                        log_similarity(user_id, similarity)  # Логгируем
                                        print(
                                            f"[INFO] Лицо уверенно распознано: {real_username} с коэффициентом {similarity:.2f}"
                                        )

                                        # Сигнализируем об успешном распознавании и прекращаем сканирование
                                        face_detected.set()
                                        break
                            elif similarity > SIMILARITY_THRESHOLD:
                                # Если схожесть средняя - отображаем, но не засчитываем
                                cv2.rectangle(
                                    frame, (x1, y1), (x2, y2), (255, 165, 0), 2
                                )  # Оранжевая рамка для средней уверенности
                                real_username = USERNAME_MAPPING.get(user_id, "Unknown")
                                label = f"{real_username}? ({similarity:.2f})"
                                cv2.putText(
                                    frame,
                                    label,
                                    (x1, y1 - 10),
                                    cv2.FONT_HERSHEY_SIMPLEX,
                                    0.7,
                                    (255, 165, 0),
                                    2,
                                )
                                print(
                                    f"[INFO] Возможное совпадение: {real_username} с коэффициентом {similarity:.2f}"
                                )

                                # Сбрасываем счетчик последовательных совпадений
                                consecutive_matches = {}
                                last_matched_user = None
                            else:
                                # Если схожесть ниже порога - отображаем как неизвестного
                                cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 0, 255), 2)
                                cv2.putText(
                                    frame,
                                    f"Unknown ({similarity:.2f})",
                                    (x1, y1 - 10),
                                    cv2.FONT_HERSHEY_SIMPLEX,
                                    0.7,
                                    (0, 0, 255),
                                    2,
                                )

                                # Сбрасываем счетчик последовательных совпадений
                                consecutive_matches = {}
                                last_matched_user = None

                        except Exception as e:
                            print(f"[ERROR] Ошибка при обработке лица: {e}")

            # Производительность
            fps = 1.0 / (time.time() - start_time)
            print(f"[INFO] FPS: {fps:.2f}")

            # Проверка на выход или успешное распознавание
            if cv2.waitKey(1) & 0xFF == ord("q") or face_detected.is_set():
                break

    finally:
        # Остановка камеры и завершение всех процессов
        stop_camera.set()
        cap.release()
        camera_running = False
        print("[INFO] Распознавание завершено")

    return recognition_result


# Модель для ответа API
class AiResponse(BaseModel):
    username: str


@app.get("/status")
async def status():
    """Возвращает информацию о состоянии системы распознавания"""
    return {
        "status": "online",
        "camera_status": "running" if camera_running else "idle",
        "face_detected": face_detected.is_set(),
    }


@app.post("/check_attendance_use_ai")
async def check_attendance_use_ai(background_tasks: BackgroundTasks):
    """Запускает процесс распознавания лиц"""
    global camera_running, stop_camera, face_detected

    if camera_running:
        return JSONResponse(
            status_code=400, content={"error": "Распознавание уже запущено"}
        )

    # Полный сброс состояния перед новым запуском
    stop_camera.clear()
    reset_recognition_state()

    # Запуск распознавания в фоновом режиме
    background_tasks.add_task(recognize_faces)

    return {"message": "Запущен процесс распознавания лиц"}


@app.get("/get_recognition_result")
async def get_recognition_result():
    """Возвращает ID студента из внешнего API"""
    username = recognition_result.get("username", "Unknown")

    if username == "Unknown":
        return {"user_id": None, "status": "not_recognized"}

    try:
        # Запрашиваем данные студента
        response = requests.get(
            f"http://localhost:8000/api/get_student_information/{username}"
        )
        response.raise_for_status()  # Бросит исключение при 4XX/5XX

        # Достаем ID из ответа
        student_data = response.json()
        user_id = student_data["data"]["id"]

        # После получения результата сбрасываем состояние
        reset_recognition_state()

        return {"user_id": user_id, "status": "recognized"}

    except Exception as e:
        print(f"[ERROR] Ошибка при запросе данных студента: {e}")
        return {"user_id": None, "error": str(e)}


# Добавляем новый endpoint для принудительного сброса состояния
@app.post("/reset_recognition")
async def reset_recognition():
    """Принудительно сбрасывает состояние распознавания"""
    global camera_running, stop_camera

    # Остановка работающей камеры
    if camera_running:
        stop_camera.set()
        time.sleep(1)  # Даем время на завершение потоков

    # Сброс состояния
    reset_recognition_state()
    camera_running = False
    stop_camera.clear()

    return {"message": "Состояние распознавания сброшено"}


def extract_face_embedding(img):
    bboxes = yolo.detect_faces(img)
    if not bboxes:
        return None, "no_face"

    # берём самое большое лицо
    x1, y1, x2, y2 = max(bboxes, key=lambda b: (b[2] - b[0]) * (b[3] - b[1]))
    if x2 <= x1 or y2 <= y1:
        return None, "invalid_bbox"

    face_img = img[y1:y2, x1:x2]
    if face_img is None or face_img.size == 0:
        return None, "invalid_crop"

    try:
        face_img = cv2.resize(face_img, (160, 160))
        face_img = cv2.cvtColor(face_img, cv2.COLOR_BGR2RGB)
        embedding = embedder.get_embedding(face_img)
        if embedding is None:
            return None, "embedding_failed"
        return embedding, "ok"
    except Exception as e:
        return None, str(e)


@app.post("/embedding")
async def embedding_from_image(file: UploadFile = File(...)):
    init_models()

    content = await file.read()
    np_arr = np.frombuffer(content, np.uint8)
    img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

    if img is None:
        return JSONResponse(
            status_code=400, content={"error": "Некорректное изображение"}
        )

    embedding, status = extract_face_embedding(img)
    if embedding is None:
        return {"status": status, "embedding": None}

    return {"status": "ok", "embedding": embedding.tolist()}


@app.post("/recognize_from_image")
async def recognize_from_image(file: UploadFile = File(...)):
    init_models()

    content = await file.read()
    np_arr = np.frombuffer(content, np.uint8)
    img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

    if img is None:
        return JSONResponse(
            status_code=400, content={"error": "Некорректное изображение"}
        )

    embedding, status = extract_face_embedding(img)
    if embedding is None:
        return {"username": "Unknown", "status": status}

    try:
        user_id, similarity = find_best_match(embedding, embeddings_db)
        if similarity > HIGHER_SIMILARITY_THRESHOLD:
            real_username = USERNAME_MAPPING.get(user_id, "Unknown")
            return {
                "username": real_username,
                "similarity": float(similarity),
                "status": "recognized",
            }

        return {
            "username": "Unknown",
            "similarity": float(similarity),
            "status": "not_recognized",
        }

    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})


if __name__ == "__main__":
    # Запуск FastAPI на порту 8002
    print("[INFO] Запуск FastAPI сервера на порту 8002...")
    uvicorn.run(app, host="0.0.0.0", port=8002)
