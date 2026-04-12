"""Tests for risk incident API endpoints."""

from django.contrib.auth import get_user_model
from django.urls import reverse

from app.models import Group, NotificationModels, RiskIncident, Student, Subject_study
from app.models._choices import (
    NotificationTypeChoices,
    RiskIncidentStatusChoices,
    RiskIncidentTypeChoices,
)

from .utils import BaseJWTAPITestCase

User = get_user_model()


class RiskIncidentAPITests(BaseJWTAPITestCase):
    def setUp(self):
        super().setUp()
        self.teacher = self.user.teacher_profile
        second_user = User.objects.create_user(
            username="teacher_target",
            password="pass_123",
            email="target@example.com",
        )
        self.escalation_target = second_user.teacher_profile

        self.group = Group.objects.create(
            name="CS-600",
            course="6",
            group_specialty="SE",
            teacher=self.teacher,
        )
        self.subject = Subject_study.objects.create(
            name="Databases",
            description="Databases course",
            teacher=self.teacher,
        )
        self.subject.groups.add(self.group)
        self.student = Student.objects.create(
            first_name="Eva",
            last_name="Green",
            email="54321@iitu.edu.kz",
            age=21,
        )
        self.group.students.add(self.student)
        self.incident = RiskIncident.objects.create(
            student=self.student,
            assigned_teacher=self.teacher,
            group=self.group,
            subject=self.subject,
            incident_type=RiskIncidentTypeChoices.ATTENDANCE,
            reason_code="ATTENDANCE_BELOW_THRESHOLD",
            problem="Низкая посещаемость",
            reason="Посещаемость ниже порога.",
            contact="Куратор группы",
            metric_name="attendance_percent",
            metric_value=45,
            threshold_value=60,
            metric_unit="%",
        )

    def test_list_returns_teacher_incidents(self):
        url = reverse("risk_incident_list")
        response = self.client.get(url, **self.auth_headers())

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["id"], self.incident.id)

    def test_acknowledge_endpoint_updates_status(self):
        url = reverse("risk_incident_acknowledge", args=[self.incident.id])
        response = self.client.post(
            url,
            {"comment": "Связался со студентом."},
            format="json",
            **self.auth_headers(),
        )

        self.assertEqual(response.status_code, 200)
        self.incident.refresh_from_db()
        self.assertEqual(self.incident.status, RiskIncidentStatusChoices.ACKNOWLEDGED)
        self.assertIsNotNone(self.incident.acknowledged_at)
        self.assertEqual(self.incident.actions.count(), 1)

    def test_escalate_endpoint_assigns_target_and_creates_notification(self):
        url = reverse("risk_incident_escalate", args=[self.incident.id])
        response = self.client.post(
            url,
            {"teacher_id": self.escalation_target.id, "comment": "Нужна помощь деканата."},
            format="json",
            **self.auth_headers(),
        )

        self.assertEqual(response.status_code, 200)
        self.incident.refresh_from_db()
        self.assertEqual(self.incident.status, RiskIncidentStatusChoices.ESCALATED)
        self.assertEqual(self.incident.escalated_to_id, self.escalation_target.id)
        self.assertEqual(self.incident.escalation_level, 1)

        teacher_notification = NotificationModels.objects.get(
            recipient_teacher=self.escalation_target
        )
        self.assertEqual(teacher_notification.event_type, NotificationTypeChoices.RISK_INCIDENT)

    def test_resolve_endpoint_closes_incident(self):
        url = reverse("risk_incident_resolve", args=[self.incident.id])
        response = self.client.post(
            url,
            {"comment": "Проблема устранена."},
            format="json",
            **self.auth_headers(),
        )

        self.assertEqual(response.status_code, 200)
        self.incident.refresh_from_db()
        self.assertEqual(self.incident.status, RiskIncidentStatusChoices.RESOLVED)
        self.assertIsNotNone(self.incident.resolved_at)
