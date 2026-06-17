"""Tests for the system status + history endpoints."""

from datetime import timedelta
from unittest.mock import patch

from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APITestCase

from app.models import ServiceStatusSnapshot


class ServiceStatusSnapshotModelTests(APITestCase):
    def test_snapshot_persists_services_json_and_severity(self):
        snap = ServiceStatusSnapshot.objects.create(
            overall_status="degraded",
            overall_severity=1,
            services=[{"key": "telegram", "status": "degraded", "severity": 1}],
        )
        snap.refresh_from_db()
        self.assertEqual(snap.overall_severity, 1)
        self.assertEqual(snap.services[0]["key"], "telegram")
        self.assertIsNotNone(snap.created_at)


class GatherStatusTests(APITestCase):
    @patch("api.views.systemStatusAPI._check_http_service")
    def test_gather_status_adds_severity_per_service(self, mock_http):
        mock_http.side_effect = lambda key, name, url: {
            "key": key,
            "name": name,
            "status": "degraded",
            "latency_ms": 5,
            "message": "down",
            "critical": False,
        }
        from api.views.systemStatusAPI import gather_status

        result = gather_status()
        self.assertIn("status", result)
        self.assertIn("services", result)
        for service in result["services"]:
            self.assertIn("severity", service)
        telegram = next(s for s in result["services"] if s["key"] == "telegram")
        self.assertEqual(telegram["severity"], 1)  # degraded -> 1


class PersistSnapshotTests(APITestCase):
    @patch("api.views.systemStatusAPI._check_http_service")
    def test_get_status_persists_a_snapshot(self, mock_http):
        mock_http.side_effect = lambda key, name, url: {
            "key": key,
            "name": name,
            "status": "operational",
            "latency_ms": 5,
            "message": "ok",
            "critical": False,
        }
        url = reverse("system_status")
        self.assertEqual(ServiceStatusSnapshot.objects.count(), 0)
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(ServiceStatusSnapshot.objects.count(), 1)

    def test_prune_removes_old_snapshots(self):
        from api.views.systemStatusAPI import _prune_snapshots

        old = ServiceStatusSnapshot.objects.create(
            overall_status="operational",
            overall_severity=0,
            services=[],
        )
        ServiceStatusSnapshot.objects.filter(pk=old.pk).update(
            created_at=timezone.now() - timedelta(hours=48),
        )
        ServiceStatusSnapshot.objects.create(
            overall_status="operational",
            overall_severity=0,
            services=[],
        )
        _prune_snapshots()
        self.assertEqual(ServiceStatusSnapshot.objects.count(), 1)


class StatusHistoryTests(APITestCase):
    def test_history_returns_points_within_window(self):
        ServiceStatusSnapshot.objects.create(
            overall_status="operational",
            overall_severity=0,
            services=[{"key": "telegram", "status": "operational", "severity": 0}],
        )
        ServiceStatusSnapshot.objects.create(
            overall_status="degraded",
            overall_severity=1,
            services=[{"key": "telegram", "status": "degraded", "severity": 1}],
        )
        old = ServiceStatusSnapshot.objects.create(
            overall_status="operational",
            overall_severity=0,
            services=[],
        )
        ServiceStatusSnapshot.objects.filter(pk=old.pk).update(
            created_at=timezone.now() - timedelta(minutes=120),
        )

        url = reverse("system_status_history")
        response = self.client.get(url, {"window": 30})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["window_minutes"], 30)
        self.assertEqual(len(response.data["points"]), 2)
        self.assertEqual(response.data["points"][-1]["services"]["telegram"], 1)

    def test_history_empty_returns_no_points(self):
        url = reverse("system_status_history")
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["points"], [])
        self.assertEqual(response.data["window_minutes"], 30)

    def test_history_invalid_window_falls_back_to_default(self):
        url = reverse("system_status_history")
        response = self.client.get(url, {"window": "abc"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["window_minutes"], 30)

    def test_history_window_is_clamped(self):
        url = reverse("system_status_history")
        response = self.client.get(url, {"window": 99999})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["window_minutes"], 180)


class PersistDebounceTests(APITestCase):
    @patch("api.views.systemStatusAPI._check_http_service")
    def test_live_get_debounces_persistence(self, mock_http):
        mock_http.side_effect = lambda key, name, url: {
            "key": key,
            "name": name,
            "status": "operational",
            "latency_ms": 5,
            "message": "ok",
            "critical": False,
        }
        url = reverse("system_status")
        self.client.get(url)
        self.client.get(url)
        # Two rapid live requests should yield a single snapshot (debounced).
        self.assertEqual(ServiceStatusSnapshot.objects.count(), 1)


class CollectSnapshotTaskTests(APITestCase):
    @patch("api.views.systemStatusAPI._check_http_service")
    def test_collect_status_snapshot_creates_a_row(self, mock_http):
        mock_http.side_effect = lambda key, name, url: {
            "key": key,
            "name": name,
            "status": "operational",
            "latency_ms": 5,
            "message": "ok",
            "critical": False,
        }
        from app.tasks import collect_status_snapshot

        self.assertEqual(ServiceStatusSnapshot.objects.count(), 0)
        collect_status_snapshot()
        self.assertEqual(ServiceStatusSnapshot.objects.count(), 1)
