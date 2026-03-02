from django.http import Http404
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from api.serializer import NotificationPreferenceSerializer, NotificationSerializer
from api.views.attendanceAPI import IsTeacher
from app.models import Group, NotificationModels, NotificationPreference, Student


class NotificationListAPI(APIView):
    permission_classes = [IsAuthenticated, IsTeacher]

    def get(self, request, *args, **kwargs):
        teacher = request.user.teacher_profile
        qs = NotificationModels.objects.filter(recipient_teacher=teacher).order_by("-created_at")

        event_type = request.query_params.get("event_type")
        if event_type:
            qs = qs.filter(event_type=event_type)

        is_read = request.query_params.get("is_read")
        if is_read is not None:
            if is_read.lower() in {"true", "1"}:
                qs = qs.filter(is_read=True)
            elif is_read.lower() in {"false", "0"}:
                qs = qs.filter(is_read=False)

        limit = int(request.query_params.get("limit", 50))
        offset = int(request.query_params.get("offset", 0))
        qs = qs[offset : offset + limit]

        serializer = NotificationSerializer(qs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class NotificationMarkReadAPI(APIView):
    permission_classes = [IsAuthenticated, IsTeacher]

    def patch(self, request, notification_id, *args, **kwargs):
        teacher = request.user.teacher_profile
        notification = get_object_or_404(
            NotificationModels,
            id=notification_id,
            recipient_teacher=teacher,
        )

        if not notification.is_read:
            notification.is_read = True
            notification.readt_at = timezone.now()
            notification.save(update_fields=["is_read", "readt_at"])

        return Response(NotificationSerializer(notification).data, status=status.HTTP_200_OK)


class StudentNotificationPreferenceAPI(APIView):
    permission_classes = [IsAuthenticated, IsTeacher]

    def get(self, request, student_id, *args, **kwargs):
        self._check_teacher_owns_student(request.user.teacher_profile.id, student_id)

        student = get_object_or_404(Student, id=student_id)
        preference, _ = NotificationPreference.objects.get_or_create(student=student)
        serializer = NotificationPreferenceSerializer(preference)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request, student_id, *args, **kwargs):
        self._check_teacher_owns_student(request.user.teacher_profile.id, student_id)

        student = get_object_or_404(Student, id=student_id)
        preference, _ = NotificationPreference.objects.get_or_create(student=student)
        serializer = NotificationPreferenceSerializer(preference, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)

    @staticmethod
    def _check_teacher_owns_student(teacher_id: int, student_id: int) -> None:
        belongs = Group.objects.filter(teacher_id=teacher_id, students__id=student_id).exists()
        if not belongs:
            raise Http404("Student not found.")


class StudentNotificationListAPI(APIView):
    permission_classes = [IsAuthenticated, IsTeacher]

    def get(self, request, student_id, *args, **kwargs):
        teacher_id = request.user.teacher_profile.id
        belongs = Group.objects.filter(teacher_id=teacher_id, students__id=student_id).exists()
        if not belongs:
            return Response({"detail": "Student not found."}, status=status.HTTP_404_NOT_FOUND)

        qs = NotificationModels.objects.filter(recipient_student_id=student_id).order_by(
            "-created_at"
        )
        serializer = NotificationSerializer(qs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
