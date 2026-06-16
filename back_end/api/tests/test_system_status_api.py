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
            "key": key, "name": name, "status": "degraded",
            "latency_ms": 5, "message": "down", "critical": False,
        }
        from api.views.systemStatusAPI import gather_status

        result = gather_status()
        self.assertIn("status", result)
        self.assertIn("services", result)
        for service in result["services"]:
            self.assertIn("severity", service)
        telegram = next(s for s in result["services"] if s["key"] == "telegram")
        self.assertEqual(telegram["severity"], 1)  # degraded -> 1
