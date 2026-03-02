"""Tests for notification API endpoints."""

from django.urls import reverse

from app.models import Group, NotificationModels, NotificationPreference, Student
from app.models._choices import NotificationTypeChoices

from .utils import BaseJWTAPITestCase


class NotificationAPITests(BaseJWTAPITestCase):
    def setUp(self):
        super().setUp()
        self.teacher = self.user.teacher_profile

        self.group = Group.objects.create(
            name="CS-404",
            course="4",
            group_specialty="SE",
            teacher=self.teacher,
        )
        self.student = Student.objects.create(
            first_name="Tom",
            last_name="Jones",
            email="tom@example.com",
            age=22,
        )
        self.group.students.add(self.student)

        self.teacher_notification = NotificationModels.objects.create(
            title="Teacher notification",
            message="Schedule changed",
            recipient_teacher=self.teacher,
            event_type=NotificationTypeChoices.SCHEDULE_CHANGED,
        )
        self.student_notification = NotificationModels.objects.create(
            title="Student notification",
            message="Performance dropped",
            recipient_student=self.student,
            event_type=NotificationTypeChoices.PERFOMANCE_DROP,
        )

    def test_notifications_list_returns_only_teacher_notifications(self):
        url = reverse("notifications_list")
        response = self.client.get(url, **self.auth_headers())

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["id"], self.teacher_notification.id)

    def test_notifications_mark_read_sets_flags(self):
        url = reverse("notifications_mark_read", args=[self.teacher_notification.id])
        response = self.client.patch(url, {}, format="json", **self.auth_headers())

        self.assertEqual(response.status_code, 200)
        self.teacher_notification.refresh_from_db()
        self.assertTrue(self.teacher_notification.is_read)
        self.assertIsNotNone(self.teacher_notification.readt_at)

    def test_student_notification_preference_get_and_patch(self):
        get_url = reverse("student_notification_preference", args=[self.student.id])
        get_response = self.client.get(get_url, **self.auth_headers())

        self.assertEqual(get_response.status_code, 200)
        self.assertTrue(get_response.data["enabled"])

        patch_response = self.client.patch(
            get_url,
            {"enabled": False, "allow_email": False, "threshold_percent": 70},
            format="json",
            **self.auth_headers(),
        )
        self.assertEqual(patch_response.status_code, 200)

        preference = NotificationPreference.objects.get(student=self.student)
        self.assertFalse(preference.enabled)
        self.assertFalse(preference.allow_email)
        self.assertEqual(preference.threshold_percent, 70)

    def test_student_notifications_list_returns_student_notifications(self):
        url = reverse("student_notifications_list", args=[self.student.id])
        response = self.client.get(url, **self.auth_headers())

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["id"], self.student_notification.id)
