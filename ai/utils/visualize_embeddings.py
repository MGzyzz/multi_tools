import torch
import numpy as np
import matplotlib.pyplot as plt
import os
from datetime import datetime
import umap

def visualize_embeddings(embeddings_path="ai/data/embeddings.npy", output_dir="ai/data/analytics/embeddings_viz/"):
    # Загружаем эмбеддинги
    embeddings_db = np.load(embeddings_path, allow_pickle=True).item()
    if not embeddings_db:
        print("[!] Нет данных в embeddings.npy для визуализации.")
        return

    names = list(embeddings_db.keys())

    # Конвертация эмбеддингов в тензоры
    embeddings = torch.stack([
        torch.from_numpy(embedding) if isinstance(embedding, np.ndarray) else embedding
        for embedding in embeddings_db.values()
    ])

    # Нормализация эмбеддингов (важно для UMAP!)
    embeddings = torch.nn.functional.normalize(embeddings, p=2, dim=1)

    # Переводим обратно в numpy для UMAP
    embeddings_np = embeddings.cpu().numpy()

    # Проверка папки
    os.makedirs(output_dir, exist_ok=True)

    # Снижение размерности через UMAP
    reducer = umap.UMAP(n_components=2, random_state=42, n_neighbors=5, min_dist=0.3)
    embeddings_2d = reducer.fit_transform(embeddings_np)

    # Построение графика
    plt.figure(figsize=(12, 10))
    for i, name in enumerate(names):
        x, y = embeddings_2d[i]
        plt.scatter(x, y, label=name)
        plt.text(x + 0.02, y + 0.02, name, fontsize=8)

    plt.title("Face Embeddings Visualization (UMAP)", fontsize=16)
    plt.xlabel("Dimension 1")
    plt.ylabel("Dimension 2")
    plt.legend(loc='best', fontsize=7)
    plt.grid(True)

    # Сохраняем файл
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_file = os.path.join(output_dir, f"embeddings_viz_{timestamp}.png")
    plt.savefig(output_file)

    print(f"[+] Визуализация эмбеддингов (UMAP) сохранена: {output_file}")

    # Открыть график после сохранения
    plt.show()
    plt.close()
