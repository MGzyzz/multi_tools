"""Tests for risk incident service flows."""

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.test import TestCase

from app.models import (
    Group,
    NotificationModels,
    NotificationPreference,
    RiskIncident,
    Student,
    Subject_study,
)
from app.models._choices import NotificationTypeChoices, RiskIncidentStatusChoices
from app.utils.risk_incidents import sync_attendance_risk_incident

User = get_user_model()


class RiskIncidentServiceTests(TestCase):
    def setUp(self):
        user = User.objects.create_user(
            username="teacher_risk_service",
            password="pass_123",
            email="teacher@example.com",
            first_name="Ada",
            last_name="Lovelace",
        )
        self.teacher = user.teacher_profile
        self.group = Group.objects.create(
            name="CS-501",
            course="5",
            group_specialty="SE",
            teacher=self.teacher,
        )
        self.subject = Subject_study.objects.create(
            name="Algorithms",
            description="Core subject",
            teacher=self.teacher,
        )
        self.subject.groups.add(self.group)
        self.student = Student.objects.create(
            first_name="Tom",
            last_name="Brown",
            email="12345@iitu.edu.kz",
            age=20,
            telegram_id="777000",
        )
        self.group.students.add(self.student)
        NotificationPreference.objects.filter(student=self.student).update(
            threshold_percent=60,
            allow_email=True,
            allow_telegram=True,
        )

    def test_numeric_university_email_is_valid(self):
        student = Student(
            first_name="Alice",
            last_name="Stone",
            email="12345@iitu.edu.kz",
            age=19,
        )

        try:
            student.full_clean()
        except ValidationError as exc:  # pragma: no cover - diagnostic branch
            self.fail(f"Numeric university email should be accepted, got: {exc}")

    def test_attendance_incident_is_created_once_and_notification_is_sent_once(self):
        incident = sync_attendance_risk_incident(
            student=self.student,
            group=self.group,
            subject=self.subject,
            current_percent=45,
            threshold_percent=60,
            assigned_teacher=self.teacher,
        )

        self.assertIsNotNone(incident)
        self.assertEqual(RiskIncident.objects.count(), 1)
        self.assertEqual(NotificationModels.objects.count(), 1)

        notification = NotificationModels.objects.get()
        self.assertEqual(notification.event_type, NotificationTypeChoices.RISK_INCIDENT)
        self.assertEqual(
            notification.title,
            "Важно: нужно восстановить посещаемость по предмету «Algorithms»",
        )
        self.assertIn(
            "Система университета зафиксировала снижение посещаемости",
            notification.message,
        )
        self.assertIn("по предмету «Algorithms» в группе CS-501", notification.message)
        self.assertIn("Текущая посещаемость: 45%", notification.message)
        self.assertIn("Минимально допустимый порог: 60%", notification.message)
        self.assertIn("Срок для исправления ситуации:", notification.message)
        self.assertIn("ответственным преподавателем Ada Lovelace", notification.message)

        second_incident = sync_attendance_risk_incident(
            student=self.student,
            group=self.group,
            subject=self.subject,
            current_percent=40,
            threshold_percent=60,
            assigned_teacher=self.teacher,
        )

        self.assertEqual(incident.id, second_incident.id)
        self.assertEqual(RiskIncident.objects.count(), 1)
        self.assertEqual(NotificationModels.objects.count(), 1)

    def test_attendance_incident_is_resolved_after_metric_recovers(self):
        incident = sync_attendance_risk_incident(
            student=self.student,
            group=self.group,
            subject=self.subject,
            current_percent=49,
            threshold_percent=60,
            assigned_teacher=self.teacher,
        )
        self.assertIsNotNone(incident)

        sync_attendance_risk_incident(
            student=self.student,
            group=self.group,
            subject=self.subject,
            current_percent=75,
            threshold_percent=60,
            assigned_teacher=self.teacher,
        )

        incident.refresh_from_db()
        self.assertEqual(incident.status, RiskIncidentStatusChoices.RESOLVED)
        self.assertIsNotNone(incident.resolved_at)
        self.assertEqual(incident.actions.count(), 2)
