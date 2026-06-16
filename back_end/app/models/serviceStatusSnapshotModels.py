from django.db import models
from django.utils import timezone


class ServiceStatusSnapshot(models.Model):
    """One row per status-check cycle: overall + per-service severity snapshot."""

    created_at = models.DateTimeField(default=timezone.now, db_index=True)
    overall_status = models.CharField(max_length=20)
    overall_severity = models.PositiveSmallIntegerField()
    services = models.JSONField()

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["-created_at"])]

    def __str__(self) -> str:
        return f"{self.created_at:%Y-%m-%d %H:%M:%S} {self.overall_status}"
