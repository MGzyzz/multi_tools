"""Tests for profile-related API endpoints."""

from django.contrib.auth import get_user_model
from django.urls import reverse

from .utils import BaseJWTAPITestCase

User = get_user_model()


class ProfileAPITests(BaseJWTAPITestCase):
    """Profile API read test cases."""

    def test_get_auth_token_200(self):
        """Return JWT token with HTTP 200."""
        self.assertEqual(self.response_token.status_code, 200)

    def test_get_requires_auth_returns_401(self):
        """Return 401 when accessing profile without auth."""
        url = reverse("user_profile")
        response = self.client.get(url)
        self.assertEqual(response.status_code, 401)

    def test_get_with_jwt_returns_200_and_profile_data(self):
        """Return profile data with JWT and HTTP 200."""
        url = reverse("user_profile")
        response = self.client.get(url, **self.auth_headers())
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["id"], self.user.id)
        self.assertEqual(response.data["username"], self.user.username)
        self.assertIn("id", response.data)
        self.assertIn("username", response.data)
        self.assertIn("email", response.data)
        self.assertIsNone(response.data["avatar"])
        self.assertEqual(response.data["description"], "")


class EditProfileAPITests(BaseJWTAPITestCase):
    """Profile update test cases."""

    def test_edit_profile_requires_auth_returns_401(self):
        """Return 401 when updating profile without auth."""
        url = reverse("edit_user_profile")
        response = self.client.patch(url, {"description": "New description"}, format="json")
        self.assertEqual(response.status_code, 401)

    def test_edit_profile_with_jwt_returns_200_and_updates_data(self):
        """Update profile data with JWT and HTTP 200."""
        url = reverse("edit_user_profile")
        new_description = "Updated description"
        response = self.client.patch(
            url,
            {"description": new_description, "role": "teacher"},
            format="json",
            **self.auth_headers(),
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["description"], new_description)
        self.assertEqual(response.data["role"], "teacher")

    def test_role_is_read_only_and_cannot_be_changed(self):
        """Role is read-only: any role in the payload is ignored, account stays teacher."""
        url = reverse("edit_user_profile")
        # Even a different *valid* role must not change the account role.
        response = self.client.patch(url, {"role": "student"}, **self.auth_headers())
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["role"], "teacher")
        self.user.teacher_profile.refresh_from_db()
        self.assertEqual(self.user.teacher_profile.role, "teacher")
