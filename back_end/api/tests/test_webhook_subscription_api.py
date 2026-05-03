"""Tests for webhook subscription management endpoints."""

from django.urls import reverse

from api.tests.utils import BaseJWTAPITestCase
from app.models.webhookModels import WebhookSubscription


class WebhookSubscriptionCreateListTests(BaseJWTAPITestCase):
    def setUp(self):
        super().setUp()
        self.url = reverse("webhook_subscriptions")

    def test_create_returns_201_with_secret(self):
        payload = {
            "platform_name": "Platonus",
            "callback_url": "https://platonus.kz/hook",
            "events": ["attendance.marked"],
        }
        response = self.client.post(self.url, payload, format="json", **self.auth_headers())
        self.assertEqual(response.status_code, 201)
        self.assertIn("secret", response.data)
        self.assertEqual(len(response.data["secret"]), 64)
        self.assertEqual(WebhookSubscription.objects.count(), 1)

    def test_create_returns_400_if_events_empty(self):
        payload = {
            "platform_name": "X",
            "callback_url": "https://x.com/hook",
            "events": [],
        }
        response = self.client.post(self.url, payload, format="json", **self.auth_headers())
        self.assertEqual(response.status_code, 400)

    def test_create_returns_401_without_auth(self):
        payload = {
            "platform_name": "X",
            "callback_url": "https://x.com/hook",
            "events": ["attendance.marked"],
        }
        response = self.client.post(self.url, payload, format="json")
        self.assertEqual(response.status_code, 401)

    def test_list_returns_all_subscriptions(self):
        WebhookSubscription.objects.create(
            platform_name="A",
            callback_url="https://a.com/hook",
            events=["attendance.marked"],
            secret="s1",
        )
        WebhookSubscription.objects.create(
            platform_name="B",
            callback_url="https://b.com/hook",
            events=["attendance.marked"],
            secret="s2",
        )
        response = self.client.get(self.url, **self.auth_headers())
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 2)
        self.assertNotIn("secret", response.data[0])


class WebhookSubscriptionDetailTests(BaseJWTAPITestCase):
    def setUp(self):
        super().setUp()
        self.sub = WebhookSubscription.objects.create(
            platform_name="Platonus",
            callback_url="https://platonus.kz/hook",
            events=["attendance.marked"],
            secret="abc",
        )
        self.url = reverse("webhook_subscription_detail", args=[self.sub.id])

    def test_patch_updates_callback_url(self):
        response = self.client.patch(
            self.url,
            {"callback_url": "https://new.platonus.kz/hook"},
            format="json",
            **self.auth_headers(),
        )
        self.assertEqual(response.status_code, 200)
        self.sub.refresh_from_db()
        self.assertEqual(self.sub.callback_url, "https://new.platonus.kz/hook")

    def test_patch_can_deactivate_subscription(self):
        response = self.client.patch(
            self.url, {"is_active": False}, format="json", **self.auth_headers()
        )
        self.assertEqual(response.status_code, 200)
        self.sub.refresh_from_db()
        self.assertFalse(self.sub.is_active)

    def test_delete_removes_subscription(self):
        response = self.client.delete(self.url, **self.auth_headers())
        self.assertEqual(response.status_code, 204)
        self.assertFalse(WebhookSubscription.objects.filter(id=self.sub.id).exists())

    def test_patch_returns_404_for_missing_id(self):
        url = reverse("webhook_subscription_detail", args=[9999])
        response = self.client.patch(url, {}, format="json", **self.auth_headers())
        self.assertEqual(response.status_code, 404)
