import os
import time

import cv2
import numpy as np

from recognition.facenet_model import FaceEmbedder
from utils.wandb_logger import wandb_logger

FACES_DB_PATH = "ai/data/faces_db"
OUTPUT_PATH = "ai/data/embeddings.npy"


def load_images_from_folder(folder):
    images = []
    for filename in os.listdir(folder):
        path = os.path.join(folder, filename)
        img = cv2.imread(path)
        if img is not None:
            images.append(img)
    return images


def generate_embeddings():
    started_at = time.perf_counter()
    embedder = FaceEmbedder()
    embeddings_dict = {}
    total_users = 0
    processed_users = 0
    total_images = 0
    valid_images = 0
    skipped_images = 0

    wandb_logger.ensure_run(
        job_type="generate_embeddings",
        name=os.getenv("WANDB_NAME", "generate-embeddings"),
        tags=["ai", "embeddings", "facenet"],
        config={
            "faces_db_path": FACES_DB_PATH,
            "output_path": OUTPUT_PATH,
            "device": embedder.device,
        },
    )

    if not os.path.exists(FACES_DB_PATH):
        print(f"[WARNING] Папка {FACES_DB_PATH} не найдена. Пропуск генерации.")
        wandb_logger.log_metrics(
            {
                "embeddings/run": 1,
                "embeddings/status_faces_db_missing": 1,
            },
            summary_updates={"last_status": "faces_db_missing"},
            job_type="generate_embeddings",
        )
        wandb_logger.finish()
        return

    for user_id in os.listdir(FACES_DB_PATH):
        user_path = os.path.join(FACES_DB_PATH, user_id)
        if not os.path.isdir(user_path):
            continue

        total_users += 1
        imgs = load_images_from_folder(user_path)
        total_images += len(imgs)
        if not imgs:
            continue

        embeddings = []
        for img in imgs:
            embedding = embedder.get_embedding(img)
            if embedding is None:
                skipped_images += 1
                continue

            valid_images += 1
            embeddings.append(
                embedding.cpu().numpy()
                if hasattr(embedding, "cpu")
                else np.asarray(embedding)
            )

        if not embeddings:
            continue

        mean_embedding = np.mean(np.stack(embeddings), axis=0)
        embeddings_dict[user_id] = mean_embedding
        processed_users += 1

    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    np.save(OUTPUT_PATH, embeddings_dict)
    print(f"[INFO] Сохранено {len(embeddings_dict)} эмбеддингов в {OUTPUT_PATH}")

    duration_sec = time.perf_counter() - started_at
    wandb_logger.log_metrics(
        {
            "embeddings/run": 1,
            "embeddings/status_ok": 1,
            "embeddings/users_total": total_users,
            "embeddings/users_processed": processed_users,
            "embeddings/users_skipped": total_users - processed_users,
            "embeddings/images_total": total_images,
            "embeddings/images_valid": valid_images,
            "embeddings/images_skipped": skipped_images,
            "embeddings/output_count": len(embeddings_dict),
            "embeddings/duration_sec": duration_sec,
        },
        summary_updates={
            "last_status": "ok",
            "last_output_count": len(embeddings_dict),
            "last_duration_sec": duration_sec,
        },
        job_type="generate_embeddings",
    )
    wandb_logger.finish()


if __name__ == "__main__":
    generate_embeddings()

