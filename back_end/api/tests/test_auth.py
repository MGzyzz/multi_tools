"""Tests for authentication endpoints."""

from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from .utils import BaseJWTAPITestCase


User = get_user_model()

class AuthTests(BaseJWTAPITestCase):
    """Authentication API test cases."""
    
    def test_get_token(self):
        """Return access and refresh tokens with HTTP 200."""
        url = reverse("token_obtain_pair")
        resp = self.client.post(url, {"username": self.username, "password": self.password}, format="json")
        self.assertEqual(resp.status_code, 200)
        self.assertIn("access", resp.data)
        self.assertIn("refresh", resp.data)
