import secrets
import string

from django.core.cache import cache
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from api.serializer import (
    GroupLeadershipSerializer,
    TeacherBroadcastSerializer,
    TeacherNotificationSettingsSerializer,
)
from api.views.attendanceAPI import IsTeacher
from app.models import Group, GroupLeadership, TeacherNotificationSettings
from app.models._choices import NotificationDeliveryChoices, NotificationTypeChoices
from app.utils.notification import create_notifications

_LINK_TOKEN_TTL = 600  # 10 минут
_LINK_TOKEN_PREFIX = "tg_link:"
_TEACHER_TOKEN_PREFIX = "tg_link_teacher:"


def _generate_link_token() -> str:
    alphabet = string.ascii_uppercase + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(8))


class TeacherNotificationSettingsAPI(APIView):
    permission_classes = [IsAuthenticated, IsTeacher]

    def get(self, request):
        teacher = request.user.teacher_profile
        settings_obj, _ = TeacherNotificationSettings.objects.get_or_create(teacher=teacher)
        serializer = TeacherNotificationSettingsSerializer(settings_obj)
        return Response(serializer.data)

    def patch(self, request):
        teacher = request.user.teacher_profile
        settings_obj, _ = TeacherNotificationSettings.objects.get_or_create(teacher=teacher)
        serializer = TeacherNotificationSettingsSerializer(
            settings_obj, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class TeacherTelegramLinkTokenAPI(APIView):
    """Генерирует одноразовый код для привязки Telegram аккаунта."""

    permission_classes = [IsAuthenticated, IsTeacher]

    def post(self, request):
        teacher = request.user.teacher_profile

        # Инвалидируем предыдущий код если он ещё живой
        prev_token = cache.get(f"{_TEACHER_TOKEN_PREFIX}{teacher.id}")
        if prev_token:
            cache.delete(f"{_LINK_TOKEN_PREFIX}{prev_token}")

        token = _generate_link_token()
        cache.set(f"{_LINK_TOKEN_PREFIX}{token}", teacher.id, timeout=_LINK_TOKEN_TTL)
        cache.set(f"{_TEACHER_TOKEN_PREFIX}{teacher.id}", token, timeout=_LINK_TOKEN_TTL)
        return Response({"token": token, "expires_in_seconds": _LINK_TOKEN_TTL})


class TeacherTelegramLinkCallbackAPI(APIView):
    """Вызывается ботом: принимает токен + chat_id, связывает аккаунт."""

    # Бот вызывает этот endpoint, поэтому аутентификация через секретный ключ сервиса
    permission_classes = []

    def post(self, request):
        from django.conf import settings as django_settings

        secret = request.headers.get("X-Bot-Secret", "")
        expected = getattr(django_settings, "BOT_SERVICE_SECRET", "")
        import logging

        logging.getLogger(__name__).warning(
            "BOT SECRET CHECK: received=%r expected=%r", secret, expected
        )
        if not expected or secret != expected:
            return Response({"detail": "Forbidden."}, status=status.HTTP_403_FORBIDDEN)

        token = request.data.get("token", "").strip().upper()
        chat_id = str(request.data.get("chat_id", "")).strip()

        if not token or not chat_id:
            return Response(
                {"detail": "token and chat_id are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        teacher_id = cache.get(f"{_LINK_TOKEN_PREFIX}{token}")
        if not teacher_id:
            return Response(
                {"detail": "Token expired or invalid."},
                status=status.HTTP_404_NOT_FOUND,
            )

        from accounts.models import TeacherProfile

        try:
            teacher = TeacherProfile.objects.get(id=teacher_id)
        except TeacherProfile.DoesNotExist:
            return Response({"detail": "Teacher not found."}, status=status.HTTP_404_NOT_FOUND)

        teacher.telegram_chat_id = chat_id
        teacher.save(update_fields=["telegram_chat_id"])
        cache.delete(f"{_LINK_TOKEN_PREFIX}{token}")
        cache.delete(f"{_TEACHER_TOKEN_PREFIX}{teacher.id}")

        return Response({"detail": "Linked successfully.", "teacher_id": teacher.id})


class TeacherTelegramStatusAPI(APIView):
    """Возвращает статус привязки Telegram для текущего преподавателя."""

    permission_classes = [IsAuthenticated, IsTeacher]

    def get(self, request):
        teacher = request.user.teacher_profile
        return Response({"connected": bool(teacher.telegram_chat_id)})

    def delete(self, request):
        teacher = request.user.teacher_profile
        teacher.telegram_chat_id = None
        teacher.save(update_fields=["telegram_chat_id"])
        return Response({"detail": "Telegram unlinked."})


# === GROUP LEADERSHIP ===


class GroupLeadershipAPI(APIView):
    """GET список старост группы. POST — назначить старосту. DELETE — снять."""

    permission_classes = [IsAuthenticated, IsTeacher]

    def get(self, request, group_id):
        group = self._get_teacher_group(request, group_id)
        if isinstance(group, Response):
            return group
        leaderships = GroupLeadership.objects.filter(group=group).select_related("student")
        serializer = GroupLeadershipSerializer(leaderships, many=True)
        return Response(serializer.data)

    def post(self, request, group_id):
        group = self._get_teacher_group(request, group_id)
        if isinstance(group, Response):
            return group

        student_id = request.data.get("student_id")
        if not student_id:
            return Response({"detail": "student_id required."}, status=status.HTTP_400_BAD_REQUEST)

        if not group.students.filter(id=student_id).exists():
            return Response(
                {"detail": "Student not in this group."}, status=status.HTTP_400_BAD_REQUEST
            )

        leadership, created = GroupLeadership.objects.get_or_create(
            group=group, student_id=student_id
        )
        serializer = GroupLeadershipSerializer(leadership)
        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    def delete(self, request, group_id):
        group = self._get_teacher_group(request, group_id)
        if isinstance(group, Response):
            return group

        student_id = request.data.get("student_id")
        if not student_id:
            return Response({"detail": "student_id required."}, status=status.HTTP_400_BAD_REQUEST)

        GroupLeadership.objects.filter(group=group, student_id=student_id).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    def _get_teacher_group(self, request, group_id):
        try:
            return Group.objects.get(id=group_id, teacher=request.user.teacher_profile)
        except Group.DoesNotExist:
            return Response({"detail": "Group not found."}, status=status.HTTP_404_NOT_FOUND)


# === BROADCAST ===


class TeacherBroadcastAPI(APIView):
    """Рассылает сообщение старостам выбранных групп через Telegram."""

    permission_classes = [IsAuthenticated, IsTeacher]

    def post(self, request):
        serializer = TeacherBroadcastSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        teacher = request.user.teacher_profile
        group_ids = data["group_ids"]
        message_text = data["message"]

        groups = Group.objects.filter(id__in=group_ids, teacher=teacher)
        if not groups.exists():
            return Response(
                {"detail": "No valid groups found."}, status=status.HTTP_400_BAD_REQUEST
            )

        leaderships = (
            GroupLeadership.objects.filter(group__in=groups).select_related("student").distinct()
        )

        if not leaderships.exists():
            return Response(
                {"detail": "No group leaders found in selected groups."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        students = [ldr.student for ldr in leaderships]

        create_notifications(
            event_type=NotificationTypeChoices.GROUP_CHANGED,
            title="Сообщение от преподавателя",
            message=message_text,
            students=students,
            student_channels=[NotificationDeliveryChoices.TELEGRAM],
        )

        return Response(
            {
                "detail": "Broadcast sent.",
                "recipients": len(students),
                "group_names": [g.name for g in groups],
            }
        )
