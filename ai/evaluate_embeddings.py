import argparse
import os
import time
from dataclasses import dataclass
from pathlib import Path

import cv2
import numpy as np
from sklearn.metrics import roc_auc_score, roc_curve

try:
    import wandb
except ImportError:
    wandb = None

from recognition.facenet_model import FaceEmbedder
from utils.wandb_logger import wandb_logger


AI_ROOT = Path(__file__).resolve().parent
DEFAULT_FACES_DB_PATH = AI_ROOT / "ai" / "data" / "faces_db"
DEFAULT_THRESHOLD = 0.7
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}


@dataclass(frozen=True)
class ImageEmbedding:
    user_id: str
    image_path: Path
    embedding: np.ndarray


def parse_args():
    parser = argparse.ArgumentParser(
        description="Evaluate face embeddings and log comparison metrics to W&B."
    )
    parser.add_argument(
        "--faces-db",
        default=str(DEFAULT_FACES_DB_PATH),
        help="Path to faces_db with user_id/image files.",
    )
    parser.add_argument(
        "--threshold",
        type=float,
        default=DEFAULT_THRESHOLD,
        help="Similarity threshold used for verification metrics.",
    )
    parser.add_argument(
        "--sweep-start",
        type=float,
        default=0.3,
        help="First threshold value for threshold sweep.",
    )
    parser.add_argument(
        "--sweep-stop",
        type=float,
        default=0.95,
        help="Last threshold value for threshold sweep.",
    )
    parser.add_argument(
        "--sweep-steps",
        type=int,
        default=66,
        help="Number of threshold points to log.",
    )
    return parser.parse_args()


def list_image_paths(faces_db_path: Path) -> list[tuple[str, Path]]:
    image_paths = []
    if not faces_db_path.exists():
        return image_paths

    for user_path in sorted(path for path in faces_db_path.iterdir() if path.is_dir()):
        for image_path in sorted(user_path.iterdir()):
            if image_path.suffix.lower() in IMAGE_EXTENSIONS:
                image_paths.append((user_path.name, image_path))

    return image_paths


def to_numpy(embedding) -> np.ndarray:
    if hasattr(embedding, "detach"):
        embedding = embedding.detach()
    if hasattr(embedding, "cpu"):
        embedding = embedding.cpu()
    return np.asarray(embedding, dtype=np.float32)


def cosine_similarity(first: np.ndarray, second: np.ndarray) -> float:
    denominator = float(np.linalg.norm(first) * np.linalg.norm(second))
    if denominator == 0:
        return 0.0
    return float(np.dot(first, second) / denominator)


def build_embeddings(
    faces_db_path: Path, embedder: FaceEmbedder
) -> tuple[list[ImageEmbedding], int]:
    records = []
    skipped_images = 0

    for user_id, image_path in list_image_paths(faces_db_path):
        image = cv2.imread(str(image_path))
        if image is None:
            skipped_images += 1
            continue

        embedding = embedder.get_embedding(image)
        if embedding is None:
            skipped_images += 1
            continue

        records.append(
            ImageEmbedding(
                user_id=user_id,
                image_path=image_path,
                embedding=to_numpy(embedding),
            )
        )

    return records, skipped_images


def calculate_pair_scores(records: list[ImageEmbedding]):
    labels = []
    scores = []
    genuine_scores = []
    impostor_scores = []

    for left_index, left in enumerate(records):
        for right in records[left_index + 1 :]:
            is_same_user = left.user_id == right.user_id
            score = cosine_similarity(left.embedding, right.embedding)
            labels.append(1 if is_same_user else 0)
            scores.append(score)

            if is_same_user:
                genuine_scores.append(score)
            else:
                impostor_scores.append(score)

    return (
        np.asarray(labels, dtype=np.int32),
        np.asarray(scores, dtype=np.float32),
        np.asarray(genuine_scores, dtype=np.float32),
        np.asarray(impostor_scores, dtype=np.float32),
    )


def safe_divide(numerator: int | float, denominator: int | float) -> float:
    if denominator == 0:
        return 0.0
    return float(numerator / denominator)


def calculate_threshold_metrics(
    labels: np.ndarray, scores: np.ndarray, threshold: float
) -> dict[str, float]:
    predictions = scores >= threshold
    positives = labels == 1
    negatives = labels == 0

    tp = int(np.sum(predictions & positives))
    fp = int(np.sum(predictions & negatives))
    tn = int(np.sum(~predictions & negatives))
    fn = int(np.sum(~predictions & positives))

    precision = safe_divide(tp, tp + fp)
    recall = safe_divide(tp, tp + fn)
    f1 = safe_divide(2 * precision * recall, precision + recall)

    return {
        "accuracy": safe_divide(tp + tn, tp + fp + tn + fn),
        "precision": precision,
        "recall": recall,
        "f1": f1,
        "false_accept_rate": safe_divide(fp, fp + tn),
        "false_reject_rate": safe_divide(fn, tp + fn),
        "true_positive_pairs": tp,
        "false_positive_pairs": fp,
        "true_negative_pairs": tn,
        "false_negative_pairs": fn,
    }


def calculate_auc_and_eer(labels: np.ndarray, scores: np.ndarray):
    if len(np.unique(labels)) < 2:
        return None, None, None

    roc_auc = float(roc_auc_score(labels, scores))
    fpr, tpr, thresholds = roc_curve(labels, scores)
    fnr = 1 - tpr
    eer_index = int(np.nanargmin(np.abs(fpr - fnr)))
    eer = float((fpr[eer_index] + fnr[eer_index]) / 2)
    eer_threshold = float(thresholds[eer_index])
    return roc_auc, eer, eer_threshold


def calculate_score_summary(prefix: str, scores: np.ndarray) -> dict[str, float]:
    if len(scores) == 0:
        return {
            f"{prefix}_mean": 0.0,
            f"{prefix}_std": 0.0,
            f"{prefix}_min": 0.0,
            f"{prefix}_max": 0.0,
        }

    return {
        f"{prefix}_mean": float(np.mean(scores)),
        f"{prefix}_std": float(np.std(scores)),
        f"{prefix}_min": float(np.min(scores)),
        f"{prefix}_max": float(np.max(scores)),
    }


def mean_embedding(records: list[ImageEmbedding]) -> np.ndarray:
    return np.mean([record.embedding for record in records], axis=0)


def calculate_identification_metrics(
    records: list[ImageEmbedding], threshold: float
) -> tuple[dict[str, float], list[list[str | float]]]:
    records_by_user: dict[str, list[ImageEmbedding]] = {}
    for record in records:
        records_by_user.setdefault(record.user_id, []).append(record)

    evaluated = 0
    correct = 0
    rejected = 0
    wrong_user = 0
    best_scores = []
    error_rows = []

    for record in records:
        candidates = {}
        for user_id, user_records in records_by_user.items():
            if user_id == record.user_id:
                user_records = [
                    candidate
                    for candidate in user_records
                    if candidate.image_path != record.image_path
                ]

            if user_records:
                candidates[user_id] = mean_embedding(user_records)

        if not candidates:
            continue

        evaluated += 1
        best_user, best_score = max(
            (
                (user_id, cosine_similarity(record.embedding, candidate_embedding))
                for user_id, candidate_embedding in candidates.items()
            ),
            key=lambda item: item[1],
        )
        best_scores.append(best_score)

        predicted_user = best_user if best_score >= threshold else "Unknown"
        if predicted_user == record.user_id:
            correct += 1
        elif predicted_user == "Unknown":
            rejected += 1
            error_rows.append(
                [str(record.image_path), record.user_id, predicted_user, best_score]
            )
        else:
            wrong_user += 1
            error_rows.append(
                [str(record.image_path), record.user_id, predicted_user, best_score]
            )

    return (
        {
            "identification/evaluated_images": evaluated,
            "identification/accuracy": safe_divide(correct, evaluated),
            "identification/reject_rate": safe_divide(rejected, evaluated),
            "identification/wrong_user_rate": safe_divide(wrong_user, evaluated),
            "identification/best_similarity_mean": float(np.mean(best_scores))
            if best_scores
            else 0.0,
        },
        error_rows,
    )


def log_threshold_sweep(
    labels: np.ndarray,
    scores: np.ndarray,
    start: float,
    stop: float,
    steps: int,
) -> None:
    if len(labels) == 0 or steps <= 0:
        return

    for threshold in np.linspace(start, stop, steps):
        metrics = calculate_threshold_metrics(labels, scores, float(threshold))
        wandb_logger.log_metrics(
            {
                "threshold_sweep/threshold": float(threshold),
                "threshold_sweep/accuracy": metrics["accuracy"],
                "threshold_sweep/precision": metrics["precision"],
                "threshold_sweep/recall": metrics["recall"],
                "threshold_sweep/f1": metrics["f1"],
                "threshold_sweep/false_accept_rate": metrics["false_accept_rate"],
                "threshold_sweep/false_reject_rate": metrics["false_reject_rate"],
            },
            job_type="evaluate_embeddings",
        )


def wandb_media_payload(
    genuine_scores: np.ndarray,
    impostor_scores: np.ndarray,
    error_rows: list[list[str | float]],
) -> dict:
    if wandb is None:
        return {}

    payload = {}
    if len(genuine_scores) > 0:
        payload["similarity/genuine_histogram"] = wandb.Histogram(genuine_scores)
    if len(impostor_scores) > 0:
        payload["similarity/impostor_histogram"] = wandb.Histogram(impostor_scores)
    if error_rows:
        payload["identification/errors"] = wandb.Table(
            columns=["image_path", "expected_user", "predicted_user", "similarity"],
            data=error_rows,
        )
    return payload


def main():
    args = parse_args()
    started_at = time.perf_counter()
    faces_db_path = Path(args.faces_db).resolve()

    embedder = FaceEmbedder()
    wandb_logger.ensure_run(
        job_type="evaluate_embeddings",
        name=os.getenv("WANDB_EVAL_NAME", "evaluate-embeddings"),
        tags=["ai", "embeddings", "evaluation", "face-recognition"],
        config={
            "faces_db_path": str(faces_db_path),
            "threshold": args.threshold,
            "sweep_start": args.sweep_start,
            "sweep_stop": args.sweep_stop,
            "sweep_steps": args.sweep_steps,
            "device": embedder.device,
            "metric_type": "pairwise_verification_and_identification",
        },
    )

    records, skipped_images = build_embeddings(faces_db_path, embedder)
    labels, scores, genuine_scores, impostor_scores = calculate_pair_scores(records)
    threshold_metrics = calculate_threshold_metrics(labels, scores, args.threshold)
    roc_auc, eer, eer_threshold = calculate_auc_and_eer(labels, scores)
    identification_metrics, error_rows = calculate_identification_metrics(
        records, args.threshold
    )

    user_count = len({record.user_id for record in records})
    scalar_metrics = {
        "eval/images_total": len(records) + skipped_images,
        "eval/images_embedded": len(records),
        "eval/images_skipped": skipped_images,
        "eval/users_total": user_count,
        "eval/pairs_total": int(len(scores)),
        "eval/genuine_pairs": int(len(genuine_scores)),
        "eval/impostor_pairs": int(len(impostor_scores)),
        "eval/threshold": args.threshold,
        "eval/accuracy": threshold_metrics["accuracy"],
        "eval/precision": threshold_metrics["precision"],
        "eval/recall": threshold_metrics["recall"],
        "eval/f1": threshold_metrics["f1"],
        "eval/false_accept_rate": threshold_metrics["false_accept_rate"],
        "eval/false_reject_rate": threshold_metrics["false_reject_rate"],
        "eval/true_positive_pairs": threshold_metrics["true_positive_pairs"],
        "eval/false_positive_pairs": threshold_metrics["false_positive_pairs"],
        "eval/true_negative_pairs": threshold_metrics["true_negative_pairs"],
        "eval/false_negative_pairs": threshold_metrics["false_negative_pairs"],
        "eval/duration_sec": time.perf_counter() - started_at,
        **calculate_score_summary("similarity/genuine", genuine_scores),
        **calculate_score_summary("similarity/impostor", impostor_scores),
        **identification_metrics,
    }

    if roc_auc is not None:
        scalar_metrics["eval/roc_auc"] = roc_auc
    if eer is not None:
        scalar_metrics["eval/eer"] = eer
    if eer_threshold is not None:
        scalar_metrics["eval/eer_threshold"] = eer_threshold

    payload = {
        **scalar_metrics,
        **wandb_media_payload(genuine_scores, impostor_scores, error_rows),
    }
    wandb_logger.log_metrics(
        payload,
        summary_updates=scalar_metrics,
        job_type="evaluate_embeddings",
    )
    log_threshold_sweep(
        labels,
        scores,
        args.sweep_start,
        args.sweep_stop,
        args.sweep_steps,
    )
    wandb_logger.finish()

    print("[INFO] Evaluation metrics sent to W&B")
    print(f"[INFO] Users: {user_count}, images: {len(records)}, pairs: {len(scores)}")
    print(
        "[INFO] "
        f"F1={threshold_metrics['f1']:.4f}, "
        f"FAR={threshold_metrics['false_accept_rate']:.4f}, "
        f"FRR={threshold_metrics['false_reject_rate']:.4f}"
    )


if __name__ == "__main__":
    main()
