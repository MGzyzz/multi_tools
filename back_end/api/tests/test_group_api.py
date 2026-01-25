"""Tests for group-related API endpoints."""

from django.urls import reverse

from app.models import Group, Student, Subject_study
from .utils import BaseJWTAPITestCase


class GroupAPITests(BaseJWTAPITestCase):
    """Group API test cases."""

    def setUp(self):
        """Set up data required for group tests."""
        super().setUp()
        self.teacher = self.user.teacher_profile

        self.group = Group.objects.create(
            name="CS-101",
            course="1",
            group_specialty="Computer Science",
            teacher=self.teacher,
        )

        self.student = Student.objects.create(
            first_name="John",
            last_name="Doe",
            email="john@example.com",
            age=20,
        )
        self.group.students.add(self.student)

        self.subject = Subject_study.objects.create(
            name="Math",
            description="Algebra",
            teacher=self.teacher,
        )
        self.subject.groups.add(self.group)

    def test_group_list_returns_200_and_groups(self):
        """Return group list with student totals."""
        url = reverse("group_list")
        response = self.client.get(url, **self.auth_headers())
        self.assertEqual(response.status_code, 200)
        self.assertIn("total_students", response.data)
        self.assertIn("groups", response.data)
        self.assertEqual(response.data["total_students"], 1)
        self.assertEqual(len(response.data["groups"]), 1)
        self.assertEqual(response.data["groups"][0]["id"], self.group.id)

    def test_group_detail_returns_200(self):
        """Return group detail for an existing group."""
        url = reverse("group_detail", args=[self.group.id])
        response = self.client.get(url, **self.auth_headers())
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["id"], self.group.id)
        self.assertEqual(response.data["name"], self.group.name)

    def test_group_detail_returns_404(self):
        """Return 404 for a missing group detail."""
        url = reverse("group_detail", args=[9999])
        response = self.client.get(url, **self.auth_headers())
        self.assertEqual(response.status_code, 404)

    def test_group_create_returns_201(self):
        """Create a new group and return HTTP 201."""
        url = reverse("create_group")
        data = {
            "name": "CS-102",
            "course": "2",
            "group_specialty": "Software Engineering",
        }
        response = self.client.post(
            url,
            data=data,
            **self.auth_headers(),
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["name"], data["name"])

    def test_get_all_students_returns_200(self):
        """Return all students for the teacher with HTTP 200."""
        url = reverse("all_groups_students")
        response = self.client.get(url, **self.auth_headers())
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["id"], self.student.id)

    def test_group_students_returns_200(self):
        """Return group students for subject and group."""
        url = reverse("group_students", args=[self.group.id, self.subject.id])
        response = self.client.get(url, **self.auth_headers())
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["group"], self.group.id)
        self.assertEqual(response.data["subject_id"], self.subject.id)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(len(response.data["results"]), 1)
        self.assertIn("attendance", response.data["results"][0])
