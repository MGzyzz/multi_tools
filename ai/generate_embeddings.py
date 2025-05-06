import os
import cv2
import numpy as np
from recognition.facenet_model import FaceEmbedder

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
    embedder = FaceEmbedder()
    embeddings_dict = {}

    if not os.path.exists(FACES_DB_PATH):
        print(f"[WARNING] Папка {FACES_DB_PATH} не найдена. Пропуск генерации.")
        return

    for user_id in os.listdir(FACES_DB_PATH):
        user_path = os.path.join(FACES_DB_PATH, user_id)
        if not os.path.isdir(user_path):
            continue

        imgs = load_images_from_folder(user_path)
        if not imgs:
            continue

        embeddings = [embedder.get_embedding(img) for img in imgs]
        mean_embedding = np.mean(embeddings, axis=0)
        embeddings_dict[user_id] = mean_embedding

    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    np.save(OUTPUT_PATH, embeddings_dict)
    print(f"[INFO] Сохранено {len(embeddings_dict)} эмбеддингов в {OUTPUT_PATH}")

# 💡 Если файл запускается напрямую — запускаем генерацию
if __name__ == "__main__":
    generate_embeddings()
