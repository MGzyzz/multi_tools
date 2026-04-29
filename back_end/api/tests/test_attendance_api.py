"""Tests for attendance-related API endpoints."""

from datetime import time, timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone

from app.models import Attendance, Group, Schedule, Student, Subject_study

from .utils import BaseJWTAPITestCase

User = get_user_model()


class AttendanceAPITests(BaseJWTAPITestCase):
    """Attendance API test cases."""

    def setUp(self):
        """Set up data required for attendance tests."""
        super().setUp()
        self.teacher = self.user.teacher_profile

        self.group = Group.objects.create(
            name="CS-401",
            course="4",
            group_specialty="Systems",
            teacher=self.teacher,
        )
        self.subject = Subject_study.objects.create(
            name="OS",
            description="Operating systems",
            teacher=self.teacher,
        )
        self.subject.groups.add(self.group)

        self.student = Student.objects.create(
            first_name="Bob",
            last_name="Brown",
            email="bob@example.com",
            age=22,
        )
        self.group.students.add(self.student)

        self.schedule = Schedule.objects.create(
            group=self.group,
            subject=self.subject,
            teacher=self.teacher,
            time=time(10, 0),
            date=timezone.localdate(),
        )

        self.attendance = Attendance.objects.create(
            student=self.student,
            schedule=self.schedule,
            status="not_marked",
        )

    def test_attendance_list_returns_200(self):
        """Return attendance list with HTTP 200."""
        url = reverse("attendance_list", args=[self.schedule.id])
        response = self.client.get(url, **self.auth_headers())
        self.assertEqual(response.status_code, 200)
        self.assertIn("schedule", response.data)
        self.assertIn("attendances", response.data)
        self.assertEqual(len(response.data["attendances"]), 1)

    def test_attendance_list_forbidden_for_other_teacher(self):
        """Return 403 when schedule belongs to another teacher."""
        other_user = User.objects.create_user(
            username="other_teacher",
            password="pass_123",
        )
        other_teacher = other_user.teacher_profile
        other_group = Group.objects.create(
            name="CS-999",
            course="5",
            group_specialty="Other",
            teacher=other_teacher,
        )
        other_subject = Subject_study.objects.create(
            name="Other",
            description="Other",
            teacher=other_teacher,
        )
        other_subject.groups.add(other_group)
        other_schedule = Schedule.objects.create(
            group=other_group,
            subject=other_subject,
            teacher=other_teacher,
            time=time(11, 0),
            date=timezone.localdate(),
        )

        url = reverse("attendance_list", args=[other_schedule.id])
        response = self.client.get(url, **self.auth_headers())
        self.assertEqual(response.status_code, 403)

    def test_edit_attendance_updates(self):
        """Update attendance status with HTTP 200."""
        url = reverse("edit_attendance", args=[self.attendance.id])
        response = self.client.patch(
            url,
            {"status": "present", "score": "91.50"},
            format="json",
            **self.auth_headers(),
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.data["message"],
            "Attendance updated successfully",
        )
        self.attendance.refresh_from_db()
        self.assertEqual(self.attendance.status, "present")
        self.assertEqual(self.attendance.score, Decimal("91.50"))
        self.assertIn("attendance", response.data)

    def test_edit_attendance_not_found_returns_404(self):
        """Return 404 when editing a missing attendance."""
        url = reverse("edit_attendance", args=[9999])
        response = self.client.patch(
            url,
            {"status": "present"},
            format="json",
            **self.auth_headers(),
        )
        self.assertEqual(response.status_code, 404)

    def test_mark_attendance_returns_200(self):
        """Mark attendance and return HTTP 200."""
        url = reverse("attendance-mark")
        response = self.client.post(
            url,
            {
                "schedule_id": self.schedule.id,
                "present_student_ids": [self.student.id],
            },
            format="json",
            **self.auth_headers(),
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["schedule_id"], self.schedule.id)
        self.assertEqual(response.data["present_count"], 1)
        self.attendance.refresh_from_db()
        self.assertEqual(self.attendance.status, "present")

    def test_mark_attendance_schedule_without_teacher_returns_400(self):
        """Return 400 when schedule has no teacher assigned."""
        schedule = Schedule.objects.create(
            group=self.group,
            subject=self.subject,
            teacher=None,
            time=time(12, 0),
            date=timezone.localdate(),
        )
        url = reverse("attendance-mark")
        response = self.client.post(
            url,
            {"schedule_id": schedule.id, "present_student_ids": []},
            format="json",
            **self.auth_headers(),
        )
        self.assertEqual(response.status_code, 400)

    def test_mark_attendance_schedule_not_found_returns_404(self):
        """Return 404 when schedule does not exist."""
        url = reverse("attendance-mark")
        response = self.client.post(
            url,
            {"schedule_id": 9999, "present_student_ids": []},
            format="json",
            **self.auth_headers(),
        )
        self.assertEqual(response.status_code, 404)

    def test_student_journal_returns_summary_and_creates_missing_rows(self):
        """Return detailed journal data for a student in the selected group/subject."""
        second_schedule = Schedule.objects.create(
            group=self.group,
            subject=self.subject,
            teacher=self.teacher,
            time=time(12, 0),
            date=timezone.localdate() - timedelta(days=1),
        )

        self.attendance.status = "present"
        self.attendance.score = Decimal("88.00")
        self.attendance.save(update_fields=["status", "score"])

        url = reverse(
            "student_journal_detail",
            args=[self.group.id, self.subject.id, self.student.id],
        )
        response = self.client.get(url, **self.auth_headers())

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["student"]["id"], self.student.id)
        self.assertEqual(response.data["group"]["id"], self.group.id)
        self.assertEqual(response.data["subject"]["id"], self.subject.id)
        self.assertEqual(response.data["summary"]["total_lessons"], 2)
        self.assertEqual(response.data["summary"]["attended_lessons"], 1)
        self.assertEqual(response.data["summary"]["missed_lessons"], 1)
        self.assertEqual(response.data["summary"]["attendance_percent"], 50)
        self.assertEqual(response.data["summary"]["graded_lessons"], 1)
        self.assertEqual(len(response.data["journal"]), 2)
        self.assertTrue(
            Attendance.objects.filter(student=self.student, schedule=second_schedule).exists()
        )

    def test_student_journal_excludes_future_lessons_without_creating_attendance(self):
        """Do not show future lessons or create placeholder attendance for them."""
        future_schedule = Schedule.objects.create(
            group=self.group,
            subject=self.subject,
            teacher=self.teacher,
            time=time(12, 0),
            date=timezone.localdate() + timedelta(days=1),
        )

        url = reverse(
            "student_journal_detail",
            args=[self.group.id, self.subject.id, self.student.id],
        )
        response = self.client.get(url, **self.auth_headers())

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["summary"]["total_lessons"], 1)
        self.assertEqual(len(response.data["journal"]), 1)
        self.assertNotIn(
            future_schedule.id,
            [row["schedule_id"] for row in response.data["journal"]],
        )
        self.assertFalse(
            Attendance.objects.filter(student=self.student, schedule=future_schedule).exists()
        )
