"""Tests for student-related API endpoints."""

from django.urls import reverse

from .utils import BaseJWTAPITestCase


class StudentAPITests(BaseJWTAPITestCase):
    """Student API test cases."""

    def setUp(self):
        """Set up data required for student tests."""
        super().setUp()

        self.group_data = {"name": "CS-101", "course": 1, "group_specialty": "Computer Science"}
        self.group_url = reverse("create_group")
        self.group_response = self.client.post(
            self.group_url, data=self.group_data, **self.auth_headers(), format="json"
        )

        if self.group_response.status_code == 201:
            self.group = self.group_response.data

        self.student_data = {
            "first_name": "John",
            "last_name": "Doe",
            "email": "12345@iitu.edu.kz",
            "age": 20,
            "group_id": self.group["id"],
        }

        self.student_url = reverse("create_student")

        self.student_response = self.client.post(
            self.student_url, data=self.student_data, **self.auth_headers(), format="json"
        )
        if self.student_response.status_code == 201:
            self.group = self.group_response.data
            self.student = self.student_response.data

    def test_get_detail_student_200(self):
        """Return student detail with HTTP 200."""
        url = reverse("student_information", args=[self.student["first_name"]])
        response = self.client.get(url, **self.auth_headers())
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["data"]["first_name"], self.student_data["first_name"])
        self.assertEqual(response.data["data"]["last_name"], self.student_data["last_name"])
        self.assertEqual(response.data["data"]["email"], self.student_data["email"])
        self.assertEqual(response.data["data"]["age"], self.student_data["age"])

    def test_get_detail_student_404(self):
        """Return 404 when student detail not found."""
        url = reverse("student_information", args=["NonExistent"])
        response = self.client.get(url, **self.auth_headers())
        self.assertEqual(response.status_code, 404)

    def test_edit_student_requires_auth_returns_401(self):
        """Return 401 when editing student without auth."""
        url = reverse("edit_student", args=[self.student["id"]])
        response = self.client.patch(url, {"age": 21}, format="json")
        self.assertEqual(response.status_code, 401)

    def test_edit_student_with_jwt_returns_200_and_updates_data(self):
        """Update student data with JWT and return HTTP 200."""
        url = reverse("edit_student", args=[self.student["id"]])
        new_age = 21
        response = self.client.patch(url, {"age": new_age}, format="json", **self.auth_headers())
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["age"], new_age)
