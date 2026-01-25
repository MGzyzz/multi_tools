"""Tests for subject-related API endpoints."""

from django.urls import reverse

from app.models import Group, Subject_study

from .utils import BaseJWTAPITestCase


class SubjectAPITests(BaseJWTAPITestCase):
    """Subject API test cases."""

    def setUp(self):
        """Set up data required for subject tests."""
        super().setUp()
        self.teacher = self.user.teacher_profile

        self.group = Group.objects.create(
            name="CS-201",
            course="2",
            group_specialty="Data Science",
            teacher=self.teacher,
        )

        self.subject = Subject_study.objects.create(
            name="Statistics",
            description="Basics of stats",
            teacher=self.teacher,
        )
        self.subject.groups.add(self.group)

    def test_group_subjects_returns_200(self):
        """Return subjects for a group with HTTP 200."""
        url = reverse("group_subjects", args=[self.group.id])
        response = self.client.get(url, **self.auth_headers())
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["id"], self.subject.id)
        self.assertEqual(response.data[0]["name"], self.subject.name)
