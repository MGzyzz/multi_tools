"""Tests for notification delivery celery tasks."""

from unittest.mock import Mock, patch

from django.contrib.auth import get_user_model
from django.test import TestCase

from app.models import NotificationDelivery, NotificationModels
from app.models._choices import (
    NotificationDeliveryChoices,
    NotificationStatusChoices,
    NotificationTypeChoices,
)
from app.tasks import enqueue_pending_notification_deliveries, process_notification_delivery

User = get_user_model()


class NotificationDeliveryTasksTests(TestCase):
    def setUp(self):
        user = User.objects.create_user(
            username="teacher_notification_tasks",
            password="pass_123",
            email="teacher@example.com",
        )
        self.teacher = user.teacher_profile
        self.notification = NotificationModels.objects.create(
            title="Changes",
            message="Schedule updated",
            recipient_teacher=self.teacher,
            event_type=NotificationTypeChoices.SCHEDULE_CHANGED,
        )

    @patch("app.tasks.send_mail")
    def test_process_email_delivery_marks_as_sent(self, mock_send_mail):
        delivery = NotificationDelivery.objects.create(
            notification=self.notification,
            channel=NotificationDeliveryChoices.EMAIL,
            target="teacher@example.com",
            status=NotificationStatusChoices.PENDING,
        )

        result = process_notification_delivery(delivery.id)
        delivery.refresh_from_db()

        self.assertEqual(result["status"], "sent")
        self.assertEqual(delivery.status, NotificationStatusChoices.SENT)
        self.assertEqual(delivery.attempts, 1)
        mock_send_mail.assert_called_once()

    def test_process_delivery_without_target_fails(self):
        delivery = NotificationDelivery.objects.create(
            notification=self.notification,
            channel=NotificationDeliveryChoices.EMAIL,
            target=None,
            status=NotificationStatusChoices.PENDING,
        )

        result = process_notification_delivery(delivery.id)
        delivery.refresh_from_db()

        self.assertEqual(result["status"], "failed")
        self.assertEqual(delivery.status, NotificationStatusChoices.FAILED)
        self.assertEqual(delivery.attempts, 1)
        self.assertIn("Missing email target", delivery.last_error)

    @patch("app.tasks.requests.post")
    def test_process_telegram_delivery_marks_as_sent(self, mock_post):
        mock_response = Mock()
        mock_response.content = b'{"message_id":"123"}'
        mock_response.json.return_value = {"message_id": "123"}
        mock_response.raise_for_status.return_value = None
        mock_post.return_value = mock_response

        delivery = NotificationDelivery.objects.create(
            notification=self.notification,
            channel=NotificationDeliveryChoices.TELEGRAM,
            target="777000",
            status=NotificationStatusChoices.PENDING,
        )

        result = process_notification_delivery(delivery.id)
        delivery.refresh_from_db()

        self.assertEqual(result["status"], "sent")
        self.assertEqual(delivery.status, NotificationStatusChoices.SENT)
        self.assertEqual(delivery.provider_message_id, "123")
        mock_post.assert_called_once_with(
            "http://localhost:8001/send_message",
            json={
                "recipient": 777000,
                "subject": "Changes",
                "message": "Schedule updated",
            },
            timeout=5,
        )

    @patch("app.tasks.process_notification_delivery.delay")
    def test_enqueue_pending_deliveries_dispatches_tasks(self, mock_delay):
        first = NotificationDelivery.objects.create(
            notification=self.notification,
            channel=NotificationDeliveryChoices.IN_APP,
            status=NotificationStatusChoices.PENDING,
        )
        second = NotificationDelivery.objects.create(
            notification=self.notification,
            channel=NotificationDeliveryChoices.EMAIL,
            target="teacher@example.com",
            status=NotificationStatusChoices.PENDING,
        )

        result = enqueue_pending_notification_deliveries(limit=10)

        self.assertEqual(result["enqueued"], 2)
        mock_delay.assert_any_call(first.id)
        mock_delay.assert_any_call(second.id)
