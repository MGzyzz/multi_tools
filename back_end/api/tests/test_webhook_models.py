"""Tests for WebhookSubscription and WebhookDelivery models."""

from django.test import TestCase

from app.models.webhookModels import WebhookDelivery, WebhookSubscription


class WebhookSubscriptionModelTests(TestCase):
    def test_creates_with_required_fields(self):
        sub = WebhookSubscription.objects.create(
            platform_name="TestPlatform",
            callback_url="https://example.com/hook",
            events=["attendance.marked"],
            secret="abc123",
        )
        self.assertEqual(sub.platform_name, "TestPlatform")
        self.assertTrue(sub.is_active)

    def test_str_returns_platform_name(self):
        sub = WebhookSubscription(
            platform_name="Platonus", callback_url="https://x.com", secret="s", events=[]
        )
        self.assertEqual(str(sub), "Platonus")


class WebhookDeliveryModelTests(TestCase):
    def setUp(self):
        self.sub = WebhookSubscription.objects.create(
            platform_name="P",
            callback_url="https://example.com/hook",
            events=["attendance.marked"],
            secret="sec",
        )

    def test_creates_with_pending_status(self):
        delivery = WebhookDelivery.objects.create(
            subscription=self.sub,
            event_type="attendance.marked",
            payload={"event": "attendance.marked"},
        )
        self.assertEqual(delivery.status, WebhookDelivery.Status.PENDING)
        self.assertEqual(delivery.attempts, 0)
        self.assertIsNone(delivery.delivered_at)
