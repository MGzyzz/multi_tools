from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import BasePermission, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from api.serializer import (
    AttendanceRowSerializer,
    AttendanceUpdateSerializer,
    MarkAttendanceSerializer,
    RiskIncidentSerializer,
    ScheduleMiniSerializer,
    StudentJournalEntrySerializer,
)
from app.models import Attendance, Group, RiskIncident, Schedule, Student, Subject_study
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
        schedule = get_object_or_404(
            Schedule.objects.select_related("group", "subject", "teacher"),
            id=schedule_id,
        )

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

        return Response(
            {
                "schedule": ScheduleMiniSerializer(schedule).data,
                "attendances": AttendanceRowSerializer(attendances, many=True).data,
            },
            status=status.HTTP_200_OK,
        )


class StudentJournalDetailAPI(APIView):
    permission_classes = [IsAuthenticated, IsTeacher]

    def get(self, request, group_id, subject_id, student_id, *args, **kwargs):
        teacher = request.user.teacher_profile

        group = get_object_or_404(
            Group.objects.only("id", "name", "course", "group_specialty", "teacher_id"),
            id=group_id,
            teacher=teacher,
        )
        subject = get_object_or_404(
            Subject_study.objects.filter(groups=group, teacher=teacher).only(
                "id",
                "name",
                "description",
            ),
            id=subject_id,
        )
        student = get_object_or_404(
            Student.objects.filter(groups=group).only(
                "id",
                "first_name",
                "last_name",
                "email",
                "age",
                "phone",
                "telegram_username",
                "telegram_id",
                "face_image",
            ),
            id=student_id,
        )

        schedules = list(
            Schedule.objects.filter(group_id=group.id, subject_id=subject.id, teacher_id=teacher.id)
            .only("id", "date", "time")
            .order_by("-date", "-time", "-id")
        )
        schedule_ids = [item.id for item in schedules]

        attendance_rows = _sync_student_attendance_rows(
            student_id=student.id,
            schedule_ids=schedule_ids,
        )
        attendance_map = {item.schedule_id: item for item in attendance_rows}

        journal_rows = [
            {
                "id": attendance_map[schedule.id].id,
                "schedule_id": schedule.id,
                "date": schedule.date,
                "time": schedule.time,
                "presense": attendance_map[schedule.id].presense,
                "marked_at": attendance_map[schedule.id].marked_at,
                "score": attendance_map[schedule.id].score,
            }
            for schedule in schedules
        ]

        attended_lessons = sum(1 for row in journal_rows if row["presense"])
        total_lessons = len(journal_rows)
        missed_lessons = total_lessons - attended_lessons
        attendance_percent = round((attended_lessons / total_lessons) * 100) if total_lessons else 0
        scored_rows = [float(row["score"]) for row in journal_rows if row["score"] is not None]
        average_score = round(sum(scored_rows) / len(scored_rows), 2) if scored_rows else None

        risk_incidents = (
            RiskIncident.objects.filter(
                Q(assigned_teacher=teacher)
                | Q(escalated_to=teacher)
                | Q(group__teacher=teacher)
                | Q(subject__teacher=teacher),
                student_id=student.id,
                group_id=group.id,
                subject_id=subject.id,
            )
            .select_related("student", "assigned_teacher__user", "escalated_to__user")
            .prefetch_related("actions__teacher__user")
            .order_by("-created_at")
            .distinct()
        )
        open_risks = sum(1 for item in risk_incidents if item.status != "RESOLVED")

        face_image_url = None
        if student.face_image:
            face_image_url = request.build_absolute_uri(student.face_image.url)

        return Response(
            {
                "student": {
                    "id": student.id,
                    "first_name": student.first_name,
                    "last_name": student.last_name,
                    "full_name": f"{student.first_name} {student.last_name}".strip(),
                    "email": student.email,
                    "age": student.age,
                    "phone": student.phone,
                    "telegram_username": student.telegram_username,
                    "telegram_id": student.telegram_id,
                    "face_image": face_image_url,
                },
                "group": {
                    "id": group.id,
                    "name": group.name,
                    "course": group.course,
                    "specialty": group.group_specialty,
                },
                "subject": {
                    "id": subject.id,
                    "name": subject.name,
                    "description": subject.description,
                },
                "summary": {
                    "attendance_percent": attendance_percent,
                    "total_lessons": total_lessons,
                    "attended_lessons": attended_lessons,
                    "missed_lessons": missed_lessons,
                    "graded_lessons": len(scored_rows),
                    "average_score": average_score,
                    "open_risks": open_risks,
                },
                "journal": StudentJournalEntrySerializer(journal_rows, many=True).data,
                "risk_incidents": RiskIncidentSerializer(risk_incidents, many=True).data,
            },
            status=status.HTTP_200_OK,
        )


class AttendanceAPI(APIView):
    permission_classes = [IsAuthenticated, IsTeacher]

    def patch(self, request, pk):
        attendance = get_object_or_404(
            Attendance.objects.select_related("student", "schedule__teacher", "schedule__group"),
            id=pk,
        )

        if not _teacher_can_manage_attendance(attendance=attendance, teacher_id=request.user.teacher_profile.id):
            return Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)

        serializer = AttendanceUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        validated = serializer.validated_data

        update_fields = []

        if "presense" in validated:
            attendance.presense = validated["presense"]
            update_fields.append("presense")
            if "marked_at" not in validated:
                attendance.marked_at = timezone.now()
                update_fields.append("marked_at")

        if "marked_at" in validated:
            attendance.marked_at = validated["marked_at"]
            if "marked_at" not in update_fields:
                update_fields.append("marked_at")

        if "score" in validated:
            attendance.score = validated["score"]
            update_fields.append("score")

        attendance.save(update_fields=update_fields)
        return Response(
            {
                "message": "Attendance updated successfully",
                "attendance": AttendanceRowSerializer(attendance).data,
            }
        )


class MarkAttendanceAPIView(APIView):
    permission_classes = [IsAuthenticated, IsTeacher]

    def post(self, request, *args, **kwargs):
        serializer = MarkAttendanceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        schedule_id = serializer.validated_data["schedule_id"]
        present_ids = serializer.validated_data["present_student_ids"]

        try:
            schedule = Schedule.objects.select_related("teacher").get(id=schedule_id)
        except Schedule.DoesNotExist:
            return Response({"detail": "Schedule not found"}, status=status.HTTP_404_NOT_FOUND)

        teacher_profile = request.user.teacher_profile

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

        result = mark_attendance(schedule_id, present_ids)
        return Response(result, status=status.HTTP_200_OK)


def _sync_student_attendance_rows(*, student_id: int, schedule_ids: list[int]) -> list[Attendance]:
    if not schedule_ids:
        return []

    attendance_qs = Attendance.objects.filter(
        student_id=student_id,
        schedule_id__in=schedule_ids,
    ).only("id", "student_id", "schedule_id", "presense", "marked_at", "score")

    attendance_map = {item.schedule_id: item for item in attendance_qs}
    missing_ids = [schedule_id for schedule_id in schedule_ids if schedule_id not in attendance_map]

    if missing_ids:
        Attendance.objects.bulk_create(
            [
                Attendance(student_id=student_id, schedule_id=schedule_id, presense=False)
                for schedule_id in missing_ids
            ],
            ignore_conflicts=True,
            batch_size=500,
        )
        attendance_qs = Attendance.objects.filter(
            student_id=student_id,
            schedule_id__in=schedule_ids,
        ).only("id", "student_id", "schedule_id", "presense", "marked_at", "score")

    return list(attendance_qs)


def _teacher_can_manage_attendance(*, attendance: Attendance, teacher_id: int) -> bool:
    schedule = attendance.schedule
    if schedule.teacher_id is not None:
        return schedule.teacher_id == teacher_id
    return schedule.group.teacher_id == teacher_id
