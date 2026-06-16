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
