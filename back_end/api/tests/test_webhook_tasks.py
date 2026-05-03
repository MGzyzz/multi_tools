"""Tests for webhook Celery delivery tasks."""

from unittest.mock import MagicMock, patch

from django.test import TestCase

from app.models.webhookModels import WebhookDelivery, WebhookSubscription
from app.tasks import _dispatch_single_webhook, deliver_webhook_event


class DeliverWebhookEventTests(TestCase):
    def setUp(self):
        self.sub = WebhookSubscription.objects.create(
            platform_name="Platonus",
            callback_url="https://platonus.kz/hook",
            events=["attendance.marked"],
            secret="testsecret",
        )

    def test_creates_delivery_record_for_matching_subscription(self):
        with patch("app.tasks._dispatch_single_webhook.delay") as mock_dispatch:
            deliver_webhook_event("attendance.marked", {"event": "attendance.marked"})
            mock_dispatch.assert_called_once()
            delivery_id = mock_dispatch.call_args[0][0]
            delivery = WebhookDelivery.objects.get(id=delivery_id)
            self.assertEqual(delivery.event_type, "attendance.marked")
            self.assertEqual(delivery.status, WebhookDelivery.Status.PENDING)

    def test_skips_subscription_not_matching_event(self):
        with patch("app.tasks._dispatch_single_webhook.delay") as mock_dispatch:
            deliver_webhook_event("other.event", {"event": "other.event"})
            mock_dispatch.assert_not_called()

    def test_skips_inactive_subscription(self):
        self.sub.is_active = False
        self.sub.save()
        with patch("app.tasks._dispatch_single_webhook.delay") as mock_dispatch:
            deliver_webhook_event("attendance.marked", {"event": "attendance.marked"})
            mock_dispatch.assert_not_called()


class DispatchSingleWebhookTests(TestCase):
    def setUp(self):
        self.sub = WebhookSubscription.objects.create(
            platform_name="Platonus",
            callback_url="https://platonus.kz/hook",
            events=["attendance.marked"],
            secret="testsecret",
        )
        self.delivery = WebhookDelivery.objects.create(
            subscription=self.sub,
            event_type="attendance.marked",
            payload={"event": "attendance.marked", "schedule_id": 1},
        )

    def test_marks_success_on_2xx_response(self):
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        with patch("requests.post", return_value=mock_resp):
            _dispatch_single_webhook(self.delivery.id)

        self.delivery.refresh_from_db()
        self.assertEqual(self.delivery.status, WebhookDelivery.Status.SUCCESS)
        self.assertEqual(self.delivery.attempts, 1)
        self.assertIsNotNone(self.delivery.delivered_at)

    def test_marks_failed_on_non_2xx_response(self):
        mock_resp = MagicMock()
        mock_resp.status_code = 500
        with patch("requests.post", return_value=mock_resp):
            with patch.object(_dispatch_single_webhook, "retry", side_effect=Exception("retry")):
                try:
                    _dispatch_single_webhook(self.delivery.id)
                except Exception:
                    pass

        self.delivery.refresh_from_db()
        self.assertEqual(self.delivery.status, WebhookDelivery.Status.FAILED)
        self.assertEqual(self.delivery.response_status, 500)

    def test_sends_hmac_signature_header(self):
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        with patch("requests.post", return_value=mock_resp) as mock_post:
            _dispatch_single_webhook(self.delivery.id)
            call_kwargs = mock_post.call_args[1]
            self.assertIn("X-Lectern-Signature", call_kwargs["headers"])
            self.assertTrue(call_kwargs["headers"]["X-Lectern-Signature"].startswith("sha256="))

    def test_does_nothing_for_missing_delivery(self):
        _dispatch_single_webhook(99999)  # should not raise
