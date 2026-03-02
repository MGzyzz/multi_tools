"""Tests for notification-related models."""

from django.contrib.auth import get_user_model
from django.test import TestCase

from app.models import NotificationModels, Student
from app.models._choices import NotificationTypeChoices

User = get_user_model()


class NotificationModelsTests(TestCase):
    """NotificationModels test cases."""

    def setUp(self):
        """Set up data required for notification model tests."""
        self.user = User.objects.create_user(
            username="teacher_for_notifications", password="pass_123"
        )
        self.teacher = self.user.teacher_profile
        self.student = Student.objects.create(
            first_name="Alice",
            last_name="Smith",
            email="alice@example.com",
            age=20,
        )

    def test_create_teacher_notification_sets_defaults(self):
        """Create teacher notification and validate defaults."""
        notification = NotificationModels.objects.create(
            title="Расписание обновлено",
            message="Пара перенесена на 10:00",
            recipient_teacher=self.teacher,
            event_type=NotificationTypeChoices.SCHEDULE_CHANGED,
        )

        self.assertEqual(notification.recipient_teacher, self.teacher)
        self.assertIsNone(notification.recipient_student)
        self.assertEqual(notification.event_type, NotificationTypeChoices.SCHEDULE_CHANGED)
        self.assertFalse(notification.is_read)
        self.assertIsNone(notification.readt_at)
        self.assertEqual(notification.message_format, "TEXT")
        self.assertIsNotNone(notification.created_at)

    def test_create_student_notification_with_payload(self):
        """Create student notification with payload."""
        payload = {"subject_id": 1, "attendance_percent": 49}
        notification = NotificationModels.objects.create(
            title="Падение успеваемости",
            message="Посещаемость снизилась ниже порога.",
            recipient_student=self.student,
            event_type=NotificationTypeChoices.PERFOMANCE_DROP,
            payload=payload,
        )

        self.assertEqual(notification.recipient_student, self.student)
        self.assertIsNone(notification.recipient_teacher)
        self.assertEqual(notification.payload, payload)

    def test_notification_str_returns_title(self):
        """Return title from notification __str__."""
        notification = NotificationModels(
            title="Изменения в группе",
            message="В группу добавлен студент.",
            event_type=NotificationTypeChoices.GROUP_CHANGED,
        )
        self.assertEqual(str(notification), "Изменения в группе")
