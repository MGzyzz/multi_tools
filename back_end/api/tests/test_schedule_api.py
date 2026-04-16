"""Tests for schedule-related API endpoints."""

from datetime import date, time, timedelta

from django.contrib.auth import get_user_model

from django.urls import reverse

from app.models import Attendance, Group, Schedule, Student, Subject_study

from .utils import BaseJWTAPITestCase

User = get_user_model()


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

    def test_schedule_planner_returns_entries_and_available_subjects(self):
        """Return planner payload with own and foreign schedules for the group."""
        own_second_subject = Subject_study.objects.create(
            name="Algorithms",
            description="Algorithms course",
            teacher=self.teacher,
        )
        own_second_subject.groups.add(self.group)

        other_user = User.objects.create_user(username="other_sched", password="pass_123")
        other_teacher = other_user.teacher_profile
        other_subject = Subject_study.objects.create(
            name="Physics",
            description="Physics",
            teacher=other_teacher,
        )
        other_subject.groups.add(self.group)
        locked_schedule = Schedule.objects.create(
            group=self.group,
            subject=other_subject,
            teacher=other_teacher,
            time=time(11, 0),
            date=date.today(),
        )

        url = reverse("schedule_planner")
        response = self.client.get(
            url,
            {
                "group_id": self.group.id,
                "start_date": date.today().isoformat(),
                "end_date": date.today().isoformat(),
            },
            **self.auth_headers(),
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["group"]["id"], self.group.id)
        self.assertEqual(len(response.data["available_subjects"]), 2)
        returned_ids = {item["id"] for item in response.data["entries"]}
        self.assertIn(self.schedule.id, returned_ids)
        self.assertIn(locked_schedule.id, returned_ids)
        locked_entry = next(item for item in response.data["entries"] if item["id"] == locked_schedule.id)
        self.assertFalse(locked_entry["can_edit"])

    def test_schedule_planner_without_group_returns_accessible_groups(self):
        """Return groups available for planning, including groups linked through teacher subjects."""
        other_user = User.objects.create_user(username="group_owner", password="pass_123")
        other_teacher = other_user.teacher_profile
        foreign_group = Group.objects.create(
            name="CS-401",
            course="4",
            group_specialty="Data Science",
            teacher=other_teacher,
        )
        foreign_subject = Subject_study.objects.create(
            name="NLP",
            description="Natural language processing",
            teacher=self.teacher,
        )
        foreign_subject.groups.add(foreign_group)

        url = reverse("schedule_planner")
        response = self.client.get(url, **self.auth_headers())

        self.assertEqual(response.status_code, 200)
        returned_ids = {item["id"] for item in response.data["groups"]}
        self.assertIn(self.group.id, returned_ids)
        self.assertIn(foreign_group.id, returned_ids)
        foreign_item = next(item for item in response.data["groups"] if item["id"] == foreign_group.id)
        self.assertFalse(foreign_item["is_owner"])

    def test_schedule_planner_save_creates_new_schedule(self):
        """Create a new schedule slot through planner save."""
        next_date = date.today() + timedelta(days=1)
        url = reverse("schedule_planner")
        response = self.client.post(
            url,
            {
                "group_id": self.group.id,
                "start_date": next_date.isoformat(),
                "end_date": next_date.isoformat(),
                "create": [
                    {
                        "date": next_date.isoformat(),
                        "time": "12:00",
                        "subject_id": self.subject.id,
                    }
                ],
            },
            format="json",
            **self.auth_headers(),
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(
            Schedule.objects.filter(
                group=self.group,
                subject=self.subject,
                teacher=self.teacher,
                date=next_date,
                time=time(12, 0),
            ).exists()
        )

    def test_schedule_semester_apply_creates_future_lessons(self):
        """Create semester schedule copies in bulk and seed attendance rows."""
        start_date = date.today() + timedelta(days=7)
        while start_date.weekday() != 0:
            start_date += timedelta(days=1)
        end_date = start_date + timedelta(days=13)

        preview_url = reverse("schedule_semester_preview")
        preview_response = self.client.post(
            preview_url,
            {
                "group_id": self.group.id,
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
                "pattern": [
                    {
                        "weekday": 0,
                        "time": "08:00",
                        "subject_id": self.subject.id,
                    }
                ],
            },
            format="json",
            **self.auth_headers(),
        )
        self.assertEqual(preview_response.status_code, 200)
        self.assertEqual(preview_response.data["creatable_count"], 2)

        apply_url = reverse("schedule_semester_apply")
        apply_response = self.client.post(
            apply_url,
            {
                "group_id": self.group.id,
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
                "pattern": [
                    {
                        "weekday": 0,
                        "time": "08:00",
                        "subject_id": self.subject.id,
                    }
                ],
            },
            format="json",
            **self.auth_headers(),
        )

        self.assertEqual(apply_response.status_code, 201)
        self.assertEqual(apply_response.data["created_count"], 2)
        self.assertEqual(
            Schedule.objects.filter(
                group=self.group,
                subject=self.subject,
                teacher=self.teacher,
                date__range=(start_date, end_date),
                time=time(8, 0),
            ).count(),
            2,
        )
