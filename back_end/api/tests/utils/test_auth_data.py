"""Shared JWT test helpers and fixtures."""

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APITestCase

User = get_user_model()


class BaseJWTAPITestCase(APITestCase):
    """Base test case that provides JWT helpers."""

    username = "test"
    password = "test_123"

    @classmethod
    def setUpTestData(cls):
        """Create a user for token-based auth tests."""
        cls.user = User.objects.create_user(
            username=cls.username,
            password=cls.password,
        )

    def setUp(self):
        """Obtain JWT tokens for each test case."""
        url = reverse("token_obtain_pair")
        response = self.client.post(
            url,
            {
                "username": self.username,
                "password": self.password,
            },
            format="json",
        )
        self.response_token = response
        if response.status_code == 200:
            self.access_token = response.data["access"]
            self.refresh_token = response.data["refresh"]
        else:
            self.access_token = None
            self.refresh_token = None

    def auth_headers(self):
        """Return authorization headers with the access token."""
        return {"HTTP_AUTHORIZATION": f"Bearer {self.access_token}"}

    # def test_teacher_profile_created_on_user_creation(self):
    #     user = User.objects.create_user(
    #         username="signal_test",
    #         password="12345"
    #     )

    #     self.assertTrue(
    #         TeacherProfile.objects.filter(user=user).exists()
    #     )
