"""Tests for notification preference model."""

from django.db import IntegrityError
from django.test import TestCase

from app.models import NotificationPreference, Student


class NotificationPreferenceTests(TestCase):
    """NotificationPreference model test cases."""

    def setUp(self):
        """Set up data required for preference tests."""
        self.student = Student.objects.create(
            first_name="John",
            last_name="Doe",
            email="john@example.com",
            age=19,
        )

    def test_create_preference_sets_default_values(self):
        """Student creation should auto-create preference with sensible defaults."""
        preference = NotificationPreference.objects.get(student=self.student)

        self.assertTrue(preference.enabled)
        self.assertTrue(preference.allow_email)
        self.assertTrue(preference.allow_telegram)
        self.assertEqual(preference.threshold_percent, 60)
        self.assertEqual(preference.drop_delta_percent, 10)
        self.assertIsNotNone(preference.updated_at)

    def test_preference_is_unique_per_student(self):
        """Return IntegrityError when creating second preference for student."""
        with self.assertRaises(IntegrityError):
            NotificationPreference.objects.create(student=self.student)
