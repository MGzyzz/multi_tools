import logging

from django.conf import settings
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from rest_framework import status
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from app.models import Group, Student

logger = logging.getLogger(__name__)

_WEBHOOK_SECRET_HEADER = "HTTP_X_WEBHOOK_SECRET"


def _check_secret(request: Request) -> bool:
    secret = getattr(settings, "WEBHOOK_SECRET", "")
    if not secret:
        return False
    return request.META.get(_WEBHOOK_SECRET_HEADER, "") == secret


class StudentSyncWebhookAPI(APIView):
    """
    Webhook endpoint for external platforms (e.g. Platonus) to sync student data.

    Send `X-Webhook-Secret` header with the configured secret.
    Student is identified by `platonus_id`; created or updated on each call.
    """

    authentication_classes = []
    permission_classes = []

    @swagger_auto_schema(
        operation_summary="Sync student from external platform",
        operation_description=(
            "Creates or updates a student record using `platonus_id` as the external key. "
            "Optionally assigns the student to a group by name. "
            "Requires `X-Webhook-Secret` header."
        ),
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            required=["platonus_id", "first_name", "last_name", "email", "age"],
            properties={
                "platonus_id": openapi.Schema(
                    type=openapi.TYPE_INTEGER, description="Student ID in the external platform"
                ),
                "first_name": openapi.Schema(type=openapi.TYPE_STRING),
                "last_name": openapi.Schema(type=openapi.TYPE_STRING),
                "email": openapi.Schema(type=openapi.TYPE_STRING, format="email"),
                "age": openapi.Schema(type=openapi.TYPE_INTEGER),
                "phone": openapi.Schema(type=openapi.TYPE_STRING),
                "group_name": openapi.Schema(
                    type=openapi.TYPE_STRING,
                    description="Group name to assign student to (optional)",
                ),
            },
        ),
        responses={
            200: openapi.Response(
                "Student updated",
                openapi.Schema(
                    type=openapi.TYPE_OBJECT,
                    properties={
                        "action": openapi.Schema(
                            type=openapi.TYPE_STRING, enum=["created", "updated"]
                        ),
                        "student_id": openapi.Schema(type=openapi.TYPE_INTEGER),
                    },
                ),
            ),
            400: "Validation error",
            403: "Invalid or missing webhook secret",
        },
        security=[],
    )
    def post(self, request: Request) -> Response:
        if not _check_secret(request):
            return Response(
                {"detail": "Invalid or missing webhook secret."}, status=status.HTTP_403_FORBIDDEN
            )

        data = request.data
        platonus_id = data.get("platonus_id")
        first_name = data.get("first_name", "").strip()
        last_name = data.get("last_name", "").strip()
        email = data.get("email", "").strip()
        age = data.get("age")
        phone = data.get("phone", "").strip() or None
        group_name = data.get("group_name", "").strip() or None

        errors = {}
        if not platonus_id:
            errors["platonus_id"] = "Required."
        if not first_name:
            errors["first_name"] = "Required."
        if not last_name:
            errors["last_name"] = "Required."
        if not email:
            errors["email"] = "Required."
        if age is None:
            errors["age"] = "Required."
        if errors:
            return Response(errors, status=status.HTTP_400_BAD_REQUEST)

        student, created = Student.objects.update_or_create(
            platonus_id=platonus_id,
            defaults={
                "first_name": first_name,
                "last_name": last_name,
                "email": email,
                "age": age,
                "phone": phone,
            },
        )

        if group_name:
            group = Group.objects.filter(name__iexact=group_name).first()
            if group:
                group.students.add(student)
            else:
                logger.warning(
                    "Webhook: group '%s' not found, student_id=%s not assigned.",
                    group_name,
                    student.id,
                )

        action = "created" if created else "updated"
        logger.info(
            "Webhook student sync: action=%s platonus_id=%s student_id=%s",
            action,
            platonus_id,
            student.id,
        )
        return Response({"action": action, "student_id": student.id}, status=status.HTTP_200_OK)
