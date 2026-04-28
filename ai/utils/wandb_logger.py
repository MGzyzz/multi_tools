from __future__ import annotations

import atexit
import os
import threading
from pathlib import Path
from typing import Any

try:
    import wandb
except ImportError:
    wandb = None


AI_MODULE_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_WANDB_PROJECT = "multi-tools-ai"


class WandbLogger:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._run = None
        atexit.register(self.finish)

    def _resolve_mode(self) -> str:
        configured_mode = os.getenv("WANDB_MODE")
        if configured_mode:
            return configured_mode

        if any(
            os.getenv(name)
            for name in ("WANDB_API_KEY", "WANDB_PROJECT", "WANDB_ENTITY", "WANDB_BASE_URL")
        ):
            return "online"

        return "disabled"

    def _normalize_tags(
        self, tags: list[str] | tuple[str, ...] | None
    ) -> list[str] | None:
        env_tags = [
            tag.strip() for tag in os.getenv("WANDB_TAGS", "").split(",") if tag.strip()
        ]

        unique_tags: list[str] = []
        for tag in [*env_tags, *(tags or ())]:
            if tag and tag not in unique_tags:
                unique_tags.append(tag)

        return unique_tags or None

    def ensure_run(
        self,
        job_type: str,
        *,
        config: dict[str, Any] | None = None,
        tags: list[str] | tuple[str, ...] | None = None,
        name: str | None = None,
        notes: str | None = None,
    ):
        if wandb is None:
            return None

        mode = self._resolve_mode()
        if mode == "disabled":
            return None

        with self._lock:
            if self._run is None:
                try:
                    self._run = wandb.init(
                        project=os.getenv("WANDB_PROJECT", DEFAULT_WANDB_PROJECT),
                        entity=os.getenv("WANDB_ENTITY"),
                        dir=str(AI_MODULE_ROOT),
                        job_type=job_type,
                        mode=mode,
                        name=name or os.getenv("WANDB_NAME"),
                        notes=notes or os.getenv("WANDB_NOTES"),
                        tags=self._normalize_tags(tags),
                        config=config or {},
                        reinit="return_previous",
                    )
                except Exception as exc:
                    print(f"[WARNING] Failed to initialize W&B: {exc}")
                    self._run = None
                    return None
            elif config:
                self._safe_update_config(config)

            return self._run

    def _safe_update_config(self, config: dict[str, Any]) -> None:
        if not config or self._run is None:
            return

        try:
            self._run.config.update(config, allow_val_change=True)
        except Exception as exc:
            print(f"[WARNING] Failed to update W&B config: {exc}")

    def update_config(
        self, config: dict[str, Any], *, job_type: str = "service"
    ) -> None:
        if not config:
            return

        run = self.ensure_run(job_type=job_type)
        if run is None:
            return

        with self._lock:
            self._safe_update_config(config)

    def log_metrics(
        self,
        metrics: dict[str, Any] | None = None,
        *,
        summary_updates: dict[str, Any] | None = None,
        job_type: str = "service",
    ) -> None:
        if not metrics and not summary_updates:
            return

        run = self.ensure_run(job_type=job_type)
        if run is None:
            return

        with self._lock:
            try:
                if metrics:
                    run.log(metrics)

                if summary_updates:
                    for key, value in summary_updates.items():
                        run.summary[key] = value
            except Exception as exc:
                print(f"[WARNING] Failed to log metrics to W&B: {exc}")

    def log_image(
        self,
        key: str,
        image_path: str,
        *,
        caption: str | None = None,
        extra_metrics: dict[str, Any] | None = None,
        job_type: str = "service",
    ) -> None:
        if wandb is None:
            return

        path = Path(image_path)
        if not path.exists():
            return

        payload: dict[str, Any] = {key: wandb.Image(str(path), caption=caption)}
        if extra_metrics:
            payload.update(extra_metrics)

        self.log_metrics(payload, job_type=job_type)

    def finish(self) -> None:
        with self._lock:
            if self._run is None:
                return

            try:
                self._run.finish()
            except Exception as exc:
                print(f"[WARNING] Failed to finish W&B run: {exc}")
            finally:
                self._run = None


wandb_logger = WandbLogger()
