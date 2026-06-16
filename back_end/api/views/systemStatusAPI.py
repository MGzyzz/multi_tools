import logging
import time
from datetime import timedelta

import requests
from celery import current_app
from django.conf import settings
from django.db import connection
from django.utils import timezone
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from app.models import ServiceStatusSnapshot, WebhookDelivery, WebhookSubscription

STATUS_OPERATIONAL = "operational"
STATUS_DEGRADED = "degraded"
STATUS_OUTAGE = "outage"
STATUS_UNKNOWN = "unknown"

logger = logging.getLogger(__name__)

_SEVERITY = {
    STATUS_OPERATIONAL: 0,
    STATUS_DEGRADED: 1,
    STATUS_OUTAGE: 2,
    STATUS_UNKNOWN: 0,
}


def _severity(status: str) -> int:
    return _SEVERITY.get(status, 0)


SNAPSHOT_RETENTION = timedelta(hours=24)


def _persist_snapshot(result: dict) -> None:
    try:
        ServiceStatusSnapshot.objects.create(
            overall_status=result["status"],
            overall_severity=_severity(result["status"]),
            services=result["services"],
        )
    except Exception:
        logger.exception("Failed to persist status snapshot")


def _prune_snapshots() -> None:
    cutoff = timezone.now() - SNAPSHOT_RETENTION
    ServiceStatusSnapshot.objects.filter(created_at__lt=cutoff).delete()


def _latency_ms(started_at: float) -> int:
    return round((time.perf_counter() - started_at) * 1000)


def _service(
    key: str,
    name: str,
    status: str,
    started_at: float,
    *,
    message: str = "",
    details: dict | None = None,
    critical: bool = False,
) -> dict:
    payload = {
        "key": key,
        "name": name,
        "status": status,
        "latency_ms": _latency_ms(started_at),
        "message": message,
        "critical": critical,
    }
    if details:
        payload["details"] = details
    return payload


def _check_database() -> dict:
    started_at = time.perf_counter()
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
        return _service(
            "database",
            "PostgreSQL",
            STATUS_OPERATIONAL,
            started_at,
            message="Database accepts queries.",
            critical=True,
        )
    except Exception:
        return _service(
            "database",
            "PostgreSQL",
            STATUS_OUTAGE,
            started_at,
            message="Database query failed.",
            critical=True,
        )


def _check_celery_workers() -> dict:
    started_at = time.perf_counter()
    try:
        if getattr(settings, "CELERY_TASK_ALWAYS_EAGER", False):
            return _service(
                "workers",
                "Background workers",
                STATUS_OPERATIONAL,
                started_at,
                message="Celery runs tasks eagerly in this environment.",
            )

        inspector = current_app.control.inspect(timeout=1)
        pings = inspector.ping() or {}
        if pings:
            return _service(
                "workers",
                "Background workers",
                STATUS_OPERATIONAL,
                started_at,
                message="Celery workers responded.",
                details={"workers": sorted(pings.keys())},
            )
        return _service(
            "workers",
            "Background workers",
            STATUS_DEGRADED,
            started_at,
            message="No Celery worker responded within timeout.",
        )
    except Exception:
        return _service(
            "workers",
            "Background workers",
            STATUS_DEGRADED,
            started_at,
            message="Celery worker health check failed.",
        )


def _check_http_service(key: str, name: str, url: str) -> dict:
    started_at = time.perf_counter()
    try:
        response = requests.get(url, timeout=2)
        if 200 <= response.status_code < 300:
            details = (
                response.json()
                if response.headers.get("content-type", "").startswith("application/json")
                else {}
            )
            return _service(
                key,
                name,
                STATUS_OPERATIONAL,
                started_at,
                message="Service responded.",
                details=details if isinstance(details, dict) else {},
            )
        return _service(
            key,
            name,
            STATUS_DEGRADED,
            started_at,
            message=f"Service returned HTTP {response.status_code}.",
        )
    except requests.Timeout:
        return _service(
            key,
            name,
            STATUS_DEGRADED,
            started_at,
            message="Service timed out.",
        )
    except requests.RequestException:
        return _service(
            key,
            name,
            STATUS_DEGRADED,
            started_at,
            message="Service is unreachable.",
        )


def _check_integrations() -> dict:
    started_at = time.perf_counter()
    try:
        active_subscriptions = WebhookSubscription.objects.filter(is_active=True).count()
        failed_deliveries = WebhookDelivery.objects.filter(
            status=WebhookDelivery.Status.FAILED,
        ).count()
        pending_deliveries = WebhookDelivery.objects.filter(
            status=WebhookDelivery.Status.PENDING,
        ).count()
        status = STATUS_DEGRADED if failed_deliveries else STATUS_OPERATIONAL
        message = (
            "Integration API is accepting webhook configuration."
            if status == STATUS_OPERATIONAL
            else "Integration API is available, but failed webhook deliveries exist."
        )
        return _service(
            "integrations",
            "Integration API",
            status,
            started_at,
            message=message,
            details={
                "active_subscriptions": active_subscriptions,
                "pending_deliveries": pending_deliveries,
                "failed_deliveries": failed_deliveries,
            },
        )
    except Exception:
        return _service(
            "integrations",
            "Integration API",
            STATUS_DEGRADED,
            started_at,
            message="Integration status query failed.",
        )


def _overall_status(services: list[dict]) -> str:
    if any(service["critical"] and service["status"] == STATUS_OUTAGE for service in services):
        return STATUS_OUTAGE
    if any(service["status"] in {STATUS_DEGRADED, STATUS_OUTAGE} for service in services):
        return STATUS_DEGRADED
    if any(service["status"] == STATUS_UNKNOWN for service in services):
        return STATUS_UNKNOWN
    return STATUS_OPERATIONAL


def gather_status() -> dict:
    started_at = time.perf_counter()
    services = [
        _service(
            "backend",
            "Backend API",
            STATUS_OPERATIONAL,
            started_at,
            message="Django API is serving requests.",
            critical=True,
        ),
        _check_database(),
        _check_celery_workers(),
        _check_http_service(
            "ai", "AI face recognition", f"{settings.AI_SERVICE_URL.rstrip('/')}/status"
        ),
        _check_http_service(
            "telegram", "Telegram bot", f"{settings.BOT_SERVICE_URL.rstrip('/')}/status"
        ),
        _check_integrations(),
    ]
    for service in services:
        service["severity"] = _severity(service["status"])
    return {
        "status": _overall_status(services),
        "checked_at": timezone.now().isoformat(),
        "services": services,
    }


class SystemStatusAPI(APIView):
    permission_classes = [AllowAny]
    authentication_classes: list = []

    def get(self, request):
        result = gather_status()
        _persist_snapshot(result)
        _prune_snapshots()
        return Response(result)


class SystemStatusHistoryAPI(APIView):
    permission_classes = [AllowAny]
    authentication_classes: list = []

    def get(self, request):
        try:
            window = int(request.query_params.get("window", 30))
        except (TypeError, ValueError):
            window = 30
        window = max(1, min(window, 180))
        since = timezone.now() - timedelta(minutes=window)
        rows = ServiceStatusSnapshot.objects.filter(created_at__gte=since).order_by("created_at")
        points = [
            {
                "checked_at": row.created_at.isoformat(),
                "overall_severity": row.overall_severity,
                "services": {
                    s["key"]: s.get("severity", _severity(s.get("status", "")))
                    for s in row.services
                },
            }
            for row in rows
        ]
        return Response({"window_minutes": window, "points": points})
