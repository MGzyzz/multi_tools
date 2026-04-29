import os
import sys
import threading
import time

import cv2
import matplotlib
import numpy as np
import requests
import uvicorn
from fastapi import BackgroundTasks, FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

matplotlib.use("Agg")

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from detection.yolo_detector import YoloDetector
from liveness.blink_detector import BlinkDetector
from recognition.facenet_model import FaceEmbedder
from utils.compare_faces import find_best_match
from utils.log_similarity import log_similarity
from utils.wandb_logger import wandb_logger

DJANGO_API_URL = os.getenv("DJANGO_API_URL", "http://localhost:8000/api")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

EMBEDDINGS_PATH = "ai/data/embeddings.npy"
CAMERA_INDEX = 1
LIVENESS_TIMEOUT = 8
SCAN_DURATION = 15
SIMILARITY_THRESHOLD = 0.75
HIGHER_SIMILARITY_THRESHOLD = 0.7
CONFIDENCE_SAMPLES = 8

camera_running = False
current_phase = "idle"  # "idle" | "liveness" | "recognition"
stop_camera = threading.Event()
recognition_result = {"username": "Unknown"}
face_detected = threading.Event()

yolo = None
embedder = None
embeddings_db = None


def init_wandb_service():
    wandb_logger.ensure_run(
        job_type="service",
        name=os.getenv("WANDB_NAME", "ai-service"),
        tags=["ai", "fastapi", "face-recognition"],
        config={
            "embeddings_path": EMBEDDINGS_PATH,
            "camera_index": CAMERA_INDEX,
            "scan_duration_sec": SCAN_DURATION,
            "similarity_threshold": SIMILARITY_THRESHOLD,
            "higher_similarity_threshold": HIGHER_SIMILARITY_THRESHOLD,
            "confidence_samples": CONFIDENCE_SAMPLES,
        },
    )


def normalize_metric_key(value: str) -> str:
    normalized = "".join(char if char.isalnum() else "_" for char in value.lower())
    return normalized.strip("_") or "unknown"


def log_request_metrics(
    request_name: str,
    status: str,
    latency_ms: float,
    *,
    extra_metrics=None,
    summary_updates=None,
):
    metrics = {
        f"requests/{request_name}": 1,
        f"latency/{request_name}_ms": round(latency_ms, 2),
        f"{request_name}/status_{normalize_metric_key(status)}": 1,
    }
    if extra_metrics:
        metrics.update(extra_metrics)
    wandb_logger.log_metrics(metrics, summary_updates=summary_updates)


@app.on_event("startup")
async def startup_event():
    init_wandb_service()


@app.on_event("shutdown")
async def shutdown_event():
    wandb_logger.finish()


# Инициализация детектора и embedder (не требует базы эмбеддингов)
def init_detector():
    global yolo, embedder
    if yolo is None:
        print("[INFO] Загружаем модели YOLO и FaceNet...")
        yolo = YoloDetector()
        embedder = FaceEmbedder()
    return True


# Инициализация моделей + загрузка базы эмбеддингов (нужна только для распознавания)
def init_models():
    global embeddings_db

    init_detector()

    if embeddings_db is None:
        if not os.path.exists(EMBEDDINGS_PATH):
            wandb_logger.log_metrics(
                {
                    "service/model_init_failed": 1,
                    "service/missing_embeddings_file": 1,
                },
                summary_updates={"last_model_init_status": "missing_embeddings"},
            )
            raise FileNotFoundError(
                f"[ERROR] Файл эмбеддингов не найден: {EMBEDDINGS_PATH}"
            )

        embeddings_db = np.load(EMBEDDINGS_PATH, allow_pickle=True).item()
        print(f"[INFO] Загружено эмбеддингов: {len(embeddings_db)}")
        print(f"[INFO] Доступные ID в базе: {list(embeddings_db.keys())}")

        wandb_logger.update_config(
            {
                "device": embedder.device,
                "embeddings_db_size": len(embeddings_db),
            }
        )
        wandb_logger.log_metrics(
            {
                "service/model_init": 1,
                "service/embeddings_db_size": len(embeddings_db),
            },
            summary_updates={"last_model_init_status": "ok"},
        )

    return True


USERNAME_MAPPING = {
    "user_1": "dmitriy",
    "user_2": "admin",
}


def reset_recognition_state():
    global recognition_result, face_detected, current_phase
    recognition_result = {"username": "Unknown"}
    face_detected.clear()
    current_phase = "idle"
    print("[INFO] Состояние распознавания сброшено")


def recognize_faces():
    global camera_running, recognition_result, face_detected, current_phase

    reset_recognition_state()
    init_models()

    cap = cv2.VideoCapture(CAMERA_INDEX)
    session_started_at = time.time()
    processed_frames = 0
    frames_with_face = 0
    max_similarity = 0.0
    session_status = "timeout"
    recognized_username = "Unknown"
    blink_detector = BlinkDetector()

    if not cap.isOpened():
        print("[ERROR] Не удалось открыть камеру")
        camera_running = False
        wandb_logger.log_metrics(
            {
                "camera/sessions": 1,
                "camera/status_camera_unavailable": 1,
            },
            summary_updates={"last_camera_status": "camera_unavailable"},
        )
        return {"error": "Не удалось открыть камеру"}

    camera_running = True

    try:
        # --- Фаза 1: Проверка живости (моргание) ---
        current_phase = "liveness"
        print(f"[INFO] Фаза 1: ожидаем моргания ({LIVENESS_TIMEOUT} сек)...")
        liveness_start = time.time()

        while (
            time.time() - liveness_start < LIVENESS_TIMEOUT and not stop_camera.is_set()
        ):
            ret, frame = cap.read()
            if not ret or frame.size == 0:
                continue

            processed_frames += 1

            if blink_detector.process(frame):
                print("[INFO] Моргание зафиксировано — переходим к распознаванию")
                break
        else:
            session_status = "liveness_failed"
            recognition_result["liveness_status"] = "liveness_failed"
            print("[WARNING] Моргание не зафиксировано — проверка живости не пройдена")
            return recognition_result

        if stop_camera.is_set():
            session_status = "stopped"
            return recognition_result

        # --- Фаза 2: Распознавание лица ---
        current_phase = "recognition"
        print(f"[INFO] Фаза 2: распознавание лица ({SCAN_DURATION} сек)...")
        recognition_start = time.time()
        consecutive_matches = {}
        last_matched_user = None

        while (
            time.time() - recognition_start < SCAN_DURATION and not stop_camera.is_set()
        ):
            started_frame_at = time.time()
            ret, frame = cap.read()
            if not ret:
                print("[WARNING] Кадр не получен. Пропуск...")
                continue

            if frame.size == 0 or frame.shape[0] == 0 or frame.shape[1] == 0:
                print("[WARNING] Получен некорректный кадр. Пропуск...")
                continue

            processed_frames += 1
            bboxes = yolo.detect_faces(frame)

            if len(bboxes) > 0:
                frames_with_face += 1
                largest_face_idx = max(
                    range(len(bboxes)),
                    key=lambda idx: (bboxes[idx][2] - bboxes[idx][0])
                    * (bboxes[idx][3] - bboxes[idx][1]),
                )

                x1, y1, x2, y2 = bboxes[largest_face_idx]
                min_face_size = 100

                if (x2 - x1) >= min_face_size and (y2 - y1) >= min_face_size:
                    face_img = frame[y1:y2, x1:x2]

                    try:
                        face_img = cv2.resize(face_img, (160, 160))
                        face_img = cv2.cvtColor(face_img, cv2.COLOR_BGR2RGB)
                        embedding = embedder.get_embedding(face_img)

                        if embedding is None:
                            print(
                                "[WARNING] Не удалось получить эмбеддинг для обнаруженного лица"
                            )
                            continue

                        user_id, similarity = find_best_match(embedding, embeddings_db)
                        max_similarity = max(max_similarity, float(similarity))

                        print(
                            f"[DEBUG] Обнаружено лицо: размер={x2-x1}x{y2-y1}, "
                            f"best match: {user_id}, similarity: {similarity:.4f}"
                        )

                        if similarity > HIGHER_SIMILARITY_THRESHOLD:
                            if last_matched_user != user_id:
                                consecutive_matches = {user_id: 1}
                                last_matched_user = user_id
                            else:
                                consecutive_matches[user_id] = (
                                    consecutive_matches.get(user_id, 0) + 1
                                )

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

                            if (
                                consecutive_matches.get(user_id, 0)
                                >= CONFIDENCE_SAMPLES
                            ):
                                if real_username != "Unknown":
                                    recognition_result = {"username": real_username}
                                    session_status = "recognized"
                                    recognized_username = real_username
                                    log_similarity(user_id, similarity)
                                    print(
                                        "[INFO] Лицо уверенно распознано: "
                                        f"{real_username} с коэффициентом {similarity:.2f}"
                                    )
                                    face_detected.set()
                                    break
                        elif similarity > SIMILARITY_THRESHOLD:
                            cv2.rectangle(frame, (x1, y1), (x2, y2), (255, 165, 0), 2)
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
                                f"[INFO] Возможное совпадение: {real_username} "
                                f"с коэффициентом {similarity:.2f}"
                            )
                            consecutive_matches = {}
                            last_matched_user = None
                        else:
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
                            consecutive_matches = {}
                            last_matched_user = None

                    except Exception as exc:
                        print(f"[ERROR] Ошибка при обработке лица: {exc}")

            fps = 1.0 / max(time.time() - started_frame_at, 1e-6)
            print(f"[INFO] FPS: {fps:.2f}")

            if cv2.waitKey(1) & 0xFF == ord("q") or face_detected.is_set():
                break

    finally:
        blink_detector.close()

        if (
            session_status not in ("recognized", "liveness_failed")
            and stop_camera.is_set()
        ):
            session_status = "stopped"

        stop_camera.set()
        cap.release()
        camera_running = False
        current_phase = "idle"
        print("[INFO] Распознавание завершено")

        wandb_logger.log_metrics(
            {
                "camera/sessions": 1,
                f"camera/status_{normalize_metric_key(session_status)}": 1,
                "camera/session_duration_sec": time.time() - session_started_at,
                "camera/frames_processed": processed_frames,
                "camera/frames_with_face": frames_with_face,
                "camera/max_similarity": max_similarity,
                "camera/recognized": 1 if session_status == "recognized" else 0,
            },
            summary_updates={
                "last_camera_status": session_status,
                "last_recognized_user": recognized_username,
                "last_max_similarity": max_similarity,
            },
        )

    return recognition_result


class AiResponse(BaseModel):
    username: str


@app.get("/status")
async def status():
    return {
        "status": "online",
        "camera_status": "running" if camera_running else "idle",
        "phase": current_phase,
        "face_detected": face_detected.is_set(),
    }


@app.post("/check_attendance_use_ai")
async def check_attendance_use_ai(background_tasks: BackgroundTasks):
    global camera_running, stop_camera, face_detected

    if camera_running:
        wandb_logger.log_metrics(
            {"camera/start_requests": 1, "camera/status_already_running": 1}
        )
        return JSONResponse(
            status_code=400, content={"error": "Распознавание уже запущено"}
        )

    stop_camera.clear()
    reset_recognition_state()
    background_tasks.add_task(recognize_faces)
    wandb_logger.log_metrics({"camera/start_requests": 1, "camera/status_started": 1})

    return {"message": "Запущен процесс распознавания лиц"}


@app.get("/get_recognition_result")
async def get_recognition_result():
    started_at = time.perf_counter()
    username = recognition_result.get("username", "Unknown")

    liveness_status = recognition_result.get("liveness_status")
    if username == "Unknown":
        status_key = liveness_status if liveness_status else "not_recognized"
        log_request_metrics(
            "recognition_result",
            status_key,
            (time.perf_counter() - started_at) * 1000,
            extra_metrics={"recognition_result/has_user": 0},
        )
        return {"user_id": None, "status": status_key}

    try:
        response = requests.get(f"{DJANGO_API_URL}/get_student_information/{username}")
        response.raise_for_status()

        student_data = response.json()
        user_id = student_data["data"]["id"]
        reset_recognition_state()

        log_request_metrics(
            "recognition_result",
            "recognized",
            (time.perf_counter() - started_at) * 1000,
            extra_metrics={"recognition_result/has_user": 1},
            summary_updates={"last_result_user_id": user_id},
        )
        return {"user_id": user_id, "status": "recognized"}

    except Exception as exc:
        print(f"[ERROR] Ошибка при запросе данных студента: {exc}")
        log_request_metrics(
            "recognition_result",
            "backend_error",
            (time.perf_counter() - started_at) * 1000,
            extra_metrics={"recognition_result/has_user": 0},
            summary_updates={"last_backend_error": str(exc)},
        )
        return {"user_id": None, "error": str(exc)}


@app.post("/reset_recognition")
async def reset_recognition():
    global camera_running, stop_camera

    if camera_running:
        stop_camera.set()
        time.sleep(1)

    reset_recognition_state()
    camera_running = False
    stop_camera.clear()
    wandb_logger.log_metrics({"camera/reset_requests": 1, "camera/status_reset": 1})

    return {"message": "Состояние распознавания сброшено"}


def extract_face_embedding(img):
    bboxes = yolo.detect_faces(img)
    if not bboxes:
        return None, "no_face"

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
    except Exception as exc:
        return None, str(exc)


@app.post("/embedding")
async def embedding_from_image(file: UploadFile = File(...)):
    started_at = time.perf_counter()
    init_detector()

    content = await file.read()
    np_arr = np.frombuffer(content, np.uint8)
    img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

    if img is None:
        log_request_metrics(
            "embedding",
            "invalid_image",
            (time.perf_counter() - started_at) * 1000,
        )
        return JSONResponse(
            status_code=400, content={"error": "Некорректное изображение"}
        )

    embedding, status = extract_face_embedding(img)
    if embedding is None:
        log_request_metrics(
            "embedding",
            status,
            (time.perf_counter() - started_at) * 1000,
        )
        return {"status": status, "embedding": None}

    log_request_metrics(
        "embedding",
        "ok",
        (time.perf_counter() - started_at) * 1000,
        extra_metrics={"embedding/vector_size": int(len(embedding))},
    )
    return {"status": "ok", "embedding": embedding.tolist()}


@app.post("/recognize_from_image")
async def recognize_from_image(file: UploadFile = File(...)):
    started_at = time.perf_counter()
    init_models()

    content = await file.read()
    np_arr = np.frombuffer(content, np.uint8)
    img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

    if img is None:
        log_request_metrics(
            "recognize",
            "invalid_image",
            (time.perf_counter() - started_at) * 1000,
        )
        return JSONResponse(
            status_code=400, content={"error": "Некорректное изображение"}
        )

    embedding, status = extract_face_embedding(img)
    if embedding is None:
        log_request_metrics(
            "recognize",
            status,
            (time.perf_counter() - started_at) * 1000,
        )
        return {"username": "Unknown", "status": status}

    try:
        user_id, similarity = find_best_match(embedding, embeddings_db)
        if similarity > HIGHER_SIMILARITY_THRESHOLD:
            real_username = USERNAME_MAPPING.get(user_id, "Unknown")
            log_request_metrics(
                "recognize",
                "recognized",
                (time.perf_counter() - started_at) * 1000,
                extra_metrics={
                    "recognize/similarity": float(similarity),
                    "recognize/recognized": 1,
                },
                summary_updates={
                    "last_recognize_status": "recognized",
                    "last_recognize_user": real_username,
                },
            )
            return {
                "username": real_username,
                "similarity": float(similarity),
                "status": "recognized",
            }

        log_request_metrics(
            "recognize",
            "not_recognized",
            (time.perf_counter() - started_at) * 1000,
            extra_metrics={
                "recognize/similarity": float(similarity),
                "recognize/recognized": 0,
            },
            summary_updates={"last_recognize_status": "not_recognized"},
        )
        return {
            "username": "Unknown",
            "similarity": float(similarity),
            "status": "not_recognized",
        }

    except Exception as exc:
        log_request_metrics(
            "recognize",
            "error",
            (time.perf_counter() - started_at) * 1000,
            summary_updates={"last_recognize_error": str(exc)},
        )
        return JSONResponse(status_code=500, content={"error": str(exc)})


if __name__ == "__main__":
    print("[INFO] Запуск FastAPI сервера на порту 8002...")
    uvicorn.run(app, host="0.0.0.0", port=8002)
