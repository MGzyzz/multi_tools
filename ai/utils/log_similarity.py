import os
from datetime import datetime

import matplotlib.pyplot as plt

from utils.wandb_logger import wandb_logger


def log_similarity(user_id, similarity_score):
    analytics_path = os.path.join("ai", "data", "analytics")
    os.makedirs(analytics_path, exist_ok=True)

    now = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{user_id}_{now}.png"
    filepath = os.path.join(analytics_path, filename)

    plt.figure(figsize=(5, 3))
    plt.plot(
        [0, 1],
        [similarity_score, similarity_score],
        label=f"Similarity: {similarity_score:.2f}",
        color="blue",
    )
    plt.title(f"Сходство с {user_id}")
    plt.ylim(0, 1)
    plt.xlabel("Frames")
    plt.ylabel("Cosine Similarity")
    plt.legend()
    plt.grid(True)

    plt.savefig(filepath)
    plt.close()
    print(f"[INFO] Сохранён график для {user_id} в {filepath}")

    wandb_logger.log_image(
        "analytics/similarity_plot",
        filepath,
        caption=f"{user_id}: similarity={similarity_score:.2f}",
        extra_metrics={
            "analytics/similarity_plot_logged": 1,
            "recognition/similarity": float(similarity_score),
        },
    )
