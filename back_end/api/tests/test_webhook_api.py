"""Tests for incoming webhook endpoints."""

from django.test import override_settings
from django.urls import reverse
from rest_framework.test import APITestCase

from app.models import Group, Student


@override_settings(WEBHOOK_SECRET="test-secret")
class StudentBulkSyncWebhookTests(APITestCase):
    def setUp(self):
        self.url = reverse("webhook_students_bulk")
        self.headers = {"HTTP_X_WEBHOOK_SECRET": "test-secret"}

    def test_returns_403_without_secret(self):
        response = self.client.post(self.url, {}, format="json")
        self.assertEqual(response.status_code, 403)

    def test_creates_and_updates_students(self):
        Student.objects.create(
            platonus_id=1,
            first_name="Existing",
            last_name="Student",
            email="existing@uni.kz",
            age=20,
        )
        payload = {
            "students": [
                {
                    "platonus_id": 1,
                    "first_name": "Updated",
                    "last_name": "Student",
                    "email": "existing@uni.kz",
                    "age": 20,
                },
                {
                    "platonus_id": 2,
                    "first_name": "New",
                    "last_name": "Student",
                    "email": "new@uni.kz",
                    "age": 21,
                },
            ]
        }
        response = self.client.post(self.url, payload, format="json", **self.headers)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["created"], 1)
        self.assertEqual(response.data["updated"], 1)
        self.assertEqual(response.data["errors"], [])
        self.assertEqual(Student.objects.get(platonus_id=1).first_name, "Updated")

    def test_returns_errors_for_invalid_entries(self):
        payload = {
            "students": [
                {
                    "platonus_id": 99,
                    "first_name": "",
                    "last_name": "X",
                    "email": "x@uni.kz",
                    "age": 20,
                },
            ]
        }
        response = self.client.post(self.url, payload, format="json", **self.headers)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["errors"][0]["platonus_id"], 99)

    def test_assigns_student_to_existing_group(self):
        group = Group.objects.create(name="CS-101", course="1", group_specialty="CS")
        payload = {
            "students": [
                {
                    "platonus_id": 10,
                    "first_name": "Ali",
                    "last_name": "B",
                    "email": "ali@uni.kz",
                    "age": 20,
                    "group_name": "CS-101",
                },
            ]
        }
        self.client.post(self.url, payload, format="json", **self.headers)
        student = Student.objects.get(platonus_id=10)
        self.assertIn(student, group.students.all())

    def test_returns_400_if_students_key_missing(self):
        response = self.client.post(self.url, {}, format="json", **self.headers)
        self.assertEqual(response.status_code, 400)
