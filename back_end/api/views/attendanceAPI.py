from rest_framework import status
from rest_framework.permissions import BasePermission, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from api.serializer import AttendanceRowSerializer, MarkAttendanceSerializer, ScheduleMiniSerializer
from app.models import Attendance, Schedule
from app.utils.attendance_tools import mark_attendance


class IsTeacher(BasePermission):
    message = "Only teachers can perform this action."

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        return hasattr(request.user, "teacher_profile")


class AttendanceScheduleDetailAPI(APIView):
    permission_classes = [IsAuthenticated, IsTeacher]

    def get(self, request, *args, **kwargs):
        schedule_id = kwargs.get("schedule_id")

        schedule = Schedule.objects.select_related("group", "subject", "teacher").get(
            id=schedule_id
        )

        # check ownership
        if schedule.teacher_id != request.user.teacher_profile.id:
            return Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)

        group_student_ids = list(schedule.group.students.values_list("id", flat=True))
        if group_student_ids:
            existing_ids = set(
                Attendance.objects.filter(schedule_id=schedule_id).values_list(
                    "student_id", flat=True
                )
            )
            missing_ids = [sid for sid in group_student_ids if sid not in existing_ids]
            if missing_ids:
                Attendance.objects.bulk_create(
                    [
                        Attendance(student_id=sid, schedule_id=schedule_id, presense=False)
                        for sid in missing_ids
                    ],
                    ignore_conflicts=True,
                    batch_size=1000,
                )

        attendances = (
            Attendance.objects.filter(schedule_id=schedule_id, student_id__in=group_student_ids)
            .select_related("student")
            .order_by("student__last_name", "student__first_name", "student__id")
        )
        print(attendances)

        return Response(
            {
                "schedule": ScheduleMiniSerializer(schedule).data,
                "attendances": AttendanceRowSerializer(attendances, many=True).data,
            },
            status=status.HTTP_200_OK,
        )


class AttendanceAPI(APIView):
    def patch(self, request, pk):
        try:
            attendance = Attendance.objects.get(id=pk)
        except Attendance.DoesNotExist:
            return Response({"error": "Attendance not found"}, status=404)

        presense = request.data.get("presense")
        marked_at = request.data.get("marked_at")

        if presense is not None:
            attendance.presense = presense

        if marked_at:
            attendance.marked_at = marked_at

        attendance.save()
        return Response({"message": "Attendance updated successfully"})


class MarkAttendanceAPIView(APIView):
    permission_classes = [IsAuthenticated, IsTeacher]

    def post(self, request, *args, **kwargs):
        serializer = MarkAttendanceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        schedule_id = serializer.validated_data["schedule_id"]
        present_ids = serializer.validated_data["present_student_ids"]

        # 1) Достаём schedule и проверяем, что он принадлежит этому учителю
        try:
            schedule = Schedule.objects.select_related("teacher").get(id=schedule_id)
        except Schedule.DoesNotExist:
            return Response({"detail": "Schedule not found"}, status=status.HTTP_404_NOT_FOUND)

        teacher_profile = request.user.teacher_profile

        # Если schedule.teacher пустой — запрещаем отмечать (или можешь разрешить по group.teacher)
        if schedule.teacher_id is None:
            return Response(
                {"detail": "Schedule has no teacher assigned."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if schedule.teacher_id != teacher_profile.id:
            return Response(
                {"detail": "You do not have permission to mark attendance for this schedule."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # 2) Запускаем отметку
        result = mark_attendance(schedule_id, present_ids)
        return Response(result, status=status.HTTP_200_OK)
