import secrets

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from app.models.webhookModels import WebhookSubscription


class WebhookSubscriptionListCreateAPI(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        subs = WebhookSubscription.objects.all().order_by("-created_at")
        data = [
            {
                "id": s.id,
                "platform_name": s.platform_name,
                "callback_url": s.callback_url,
                "events": s.events,
                "is_active": s.is_active,
                "created_at": s.created_at,
            }
            for s in subs
        ]
        return Response(data)

    def post(self, request: Request) -> Response:
        platform_name = (request.data.get("platform_name") or "").strip()
        callback_url = (request.data.get("callback_url") or "").strip()
        events = request.data.get("events", [])

        errors = {}
        if not platform_name:
            errors["platform_name"] = "Required."
        if not callback_url:
            errors["callback_url"] = "Required."
        if not isinstance(events, list) or not events:
            errors["events"] = "Must be a non-empty list."
        if errors:
            return Response(errors, status=status.HTTP_400_BAD_REQUEST)

        generated_secret = secrets.token_hex(32)
        sub = WebhookSubscription.objects.create(
            platform_name=platform_name,
            callback_url=callback_url,
            events=events,
            secret=generated_secret,
        )
        return Response(
            {
                "id": sub.id,
                "platform_name": sub.platform_name,
                "callback_url": sub.callback_url,
                "events": sub.events,
                "secret": generated_secret,
            },
            status=status.HTTP_201_CREATED,
        )


class WebhookSubscriptionDetailAPI(APIView):
    permission_classes = [IsAuthenticated]

    def _get_sub(self, pk: int):
        try:
            return WebhookSubscription.objects.get(pk=pk)
        except WebhookSubscription.DoesNotExist:
            return None

    def patch(self, request: Request, pk: int) -> Response:
        sub = self._get_sub(pk)
        if not sub:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        if "callback_url" in request.data:
            sub.callback_url = request.data["callback_url"]
        if "events" in request.data:
            sub.events = request.data["events"]
        if "is_active" in request.data:
            sub.is_active = bool(request.data["is_active"])
        sub.save()

        return Response(
            {
                "id": sub.id,
                "platform_name": sub.platform_name,
                "callback_url": sub.callback_url,
                "events": sub.events,
                "is_active": sub.is_active,
            }
        )

    def delete(self, request: Request, pk: int) -> Response:
        sub = self._get_sub(pk)
        if not sub:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        sub.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
