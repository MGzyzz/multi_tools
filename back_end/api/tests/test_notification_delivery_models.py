"""Tests for notification delivery model."""

from django.contrib.auth import get_user_model
from django.test import TestCase

from app.models import NotificationDelivery, NotificationModels
from app.models._choices import (
    NotificationDeliveryChoices,
    NotificationStatusChoices,
    NotificationTypeChoices,
)

User = get_user_model()


class NotificationDeliveryTests(TestCase):
    """NotificationDelivery model test cases."""

    def setUp(self):
        """Set up data required for delivery tests."""
        user = User.objects.create_user(username="teacher_for_delivery", password="pass_123")
        teacher = user.teacher_profile

        self.notification = NotificationModels.objects.create(
            title="Обновление",
            message="Изменения успешно применены.",
            recipient_teacher=teacher,
            event_type=NotificationTypeChoices.STUDENT_CHANGED,
        )

    def test_create_delivery_sets_default_status_and_attempts(self):
        """Create delivery and validate default status values."""
        delivery = NotificationDelivery.objects.create(
            notification=self.notification,
            channel=NotificationDeliveryChoices.EMAIL,
            target="teacher@example.com",
        )

        self.assertEqual(delivery.channel, NotificationDeliveryChoices.EMAIL)
        self.assertEqual(delivery.status, NotificationStatusChoices.PENDING)
        self.assertEqual(delivery.attempts, 0)
        self.assertIsNone(delivery.sent_at)
        self.assertIsNone(delivery.provider_message_id)

    def test_notification_supports_multiple_delivery_channels(self):
        """Create multiple deliveries for one notification."""
        NotificationDelivery.objects.create(
            notification=self.notification,
            channel=NotificationDeliveryChoices.IN_APP,
        )
        NotificationDelivery.objects.create(
            notification=self.notification,
            channel=NotificationDeliveryChoices.TELEGRAM,
            target="123456",
        )

        self.assertEqual(self.notification.deliveries.count(), 2)
