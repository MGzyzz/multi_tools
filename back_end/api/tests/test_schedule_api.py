"""Tests for schedule-related API endpoints."""

from datetime import date, time

from django.urls import reverse

from app.models import Attendance, Group, Schedule, Student, Subject_study

from .utils import BaseJWTAPITestCase


class ScheduleAPITests(BaseJWTAPITestCase):
    """Schedule API test cases."""

    def setUp(self):
        """Set up data required for schedule tests."""
        super().setUp()
        self.teacher = self.user.teacher_profile

        self.group = Group.objects.create(
            name="CS-301",
            course="3",
            group_specialty="AI",
            teacher=self.teacher,
        )
        self.subject = Subject_study.objects.create(
            name="ML",
            description="Machine learning",
            teacher=self.teacher,
        )
        self.subject.groups.add(self.group)

        self.student = Student.objects.create(
            first_name="Alice",
            last_name="Smith",
            email="alice@example.com",
            age=21,
        )
        self.group.students.add(self.student)

        self.schedule = Schedule.objects.create(
            group=self.group,
            subject=self.subject,
            teacher=self.teacher,
            time=time(9, 0),
            date=date.today(),
        )

    def test_schedule_list_returns_200(self):
        """Return schedule list for today with HTTP 200."""
        url = reverse("schedule_list")
        response = self.client.get(url, **self.auth_headers())
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["id"], self.schedule.id)

    def test_schedule_and_attendance_returns_students(self):
        """Return attendance list for a schedule with HTTP 200."""
        url = reverse("test", args=[self.schedule.id])
        response = self.client.get(url, **self.auth_headers())
        self.assertEqual(response.status_code, 200)
        self.assertIn("students", response.data)
        self.assertEqual(len(response.data["students"]), 1)
        self.assertEqual(
            response.data["students"][0]["student_id"],
            self.student.id,
        )
        self.assertTrue(
            Attendance.objects.filter(
                schedule=self.schedule,
                student=self.student,
            ).exists()
        )

    def test_schedule_group_id_returns_group(self):
        """Return group data for a schedule with HTTP 200."""
        url = reverse("schedule_group_id", args=[self.schedule.id])
        response = self.client.get(url, **self.auth_headers())
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["id"], self.group.id)
        self.assertEqual(response.data["name"], self.group.name)
