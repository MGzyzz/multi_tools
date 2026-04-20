import logging

from django.core.cache import cache
from django.db.models import Count, Prefetch, Q, Sum
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from api.serializer import GroupSerializer
from api.views.attendanceAPI import IsTeacher
from app.models import AttendanceStat, Group, Student, Subject_study

from ..serializer import StudentSerializer

logger = logging.getLogger(__name__)


class GroupListAPI(APIView):
    """
    API view to retrive a list group

    """

    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        teacher = request.user.teacher_profile
        qs = Group.objects.filter(teacher=teacher).annotate(
            students_count=Count("students", distinct=True)
        )

        total_students = qs.aggregate(total=Count("students", distinct=True))["total"] or 0

        return Response(
            {
                "total_students": total_students,
                "groups": GroupSerializer(qs, many=True).data,
            }
        )
        # return Response({"error': 'Can't send groups list"}, status=status.HTTP_404_NOT_FOUND)
        # TO-DO разобраться со статус кодом


class GroupStudentAPI(APIView):
    permission_classes = [IsAuthenticated, IsTeacher]

    def get(self, request, group_id, subject_id, *args, **kwargs):
        teacher = request.user.teacher_profile
        group = get_object_or_404(Group, id=group_id, teacher=teacher)
        subject = get_object_or_404(Subject_study, id=subject_id, teacher=teacher, groups=group)

        qs = group.students.all()

        search = request.query_params.get("search")
        if search:
            qs = qs.filter(
                Q(first_name__icontains=search)
                | Q(last_name__icontains=search)
                | Q(telegram_username__icontains=search)
            )

        page = int(request.query_params.get("page", 1))
        page_size = int(request.query_params.get("page_size", 20))
        start = (page - 1) * page_size
        end = start + page_size

        page_students = list(qs.order_by("last_name", "first_name", "id")[start:end])
        student_ids = [s.id for s in page_students]

        stats_qs = AttendanceStat.objects.filter(
            group_id=group.id, subject_id=subject.id, student_id__in=student_ids
        ).values("student_id", "total", "attended")

        stats_map = {r["student_id"]: r for r in stats_qs}

        agg = AttendanceStat.objects.filter(group_id=group.id, subject_id=subject.id).aggregate(
            total=Sum("total"), attended=Sum("attended")
        )

        total = agg["total"] or 0
        attended = agg["attended"] or 0
        group_avg = round((attended / total) * 100) if total > 0 else 0

        serializer = StudentSerializer(
            page_students, many=True, context={"request": request, "stats_map": stats_map}
        )

        return Response(
            {
                "group": group.id,
                "subject_id": subject.id,
                "group_average_attendance_percent": group_avg,
                "count": qs.count(),
                "results": serializer.data,
            }
        )


class GetAllStudents(APIView):
    """
    API view to retrieve all students in teacher's groups, with optional ?group=name filter.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        teacher = request.user.teacher_profile
        group_name = request.query_params.get("group", "").strip()

        if not group_name:
            cache_key = f"students_by_teacher:{teacher.id}"
            cached_data = cache.get(cache_key)
            if cached_data is not None:
                logger.info("Returning data from cache for teacher %s", teacher.id)
                return Response(cached_data, status=status.HTTP_200_OK)

        logger.info("Fetching data from DB for teacher %s", teacher.id)

        teacher_groups_qs = Group.objects.filter(teacher=teacher)
        qs = Student.objects.filter(groups__teacher=teacher)

        if group_name:
            qs = qs.filter(groups__name__iexact=group_name, groups__teacher=teacher)

        qs = qs.distinct().prefetch_related(
            Prefetch("groups", queryset=teacher_groups_qs, to_attr="teacher_groups")
        )

        data = []
        for student in qs:
            s_data = StudentSerializer(student).data
            s_data["groups"] = [{"id": g.id, "name": g.name} for g in student.teacher_groups]
            data.append(s_data)

        if not group_name:
            cache.set(cache_key, data, timeout=120)

        return Response(data, status=status.HTTP_200_OK)


class GroupDetailAPI(APIView):
    """
    API view to retrive a group by id

    """

    permission_classes = [IsAuthenticated]

    def get(self, request, pk, *args, **kwargs):
        try:
            group = Group.objects.get(id=pk)
        except Group.DoesNotExist:
            return Response({"error": "Group not found"}, status=status.HTTP_404_NOT_FOUND)

        serializer = GroupSerializer(group)
        return Response(serializer.data)


class GroupCreateAPI(APIView):
    """
    API view to create a group

    """

    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        teacher = request.user.teacher_profile
        serializer = GroupSerializer(data=request.data, context={"teacher": teacher})
        if serializer.is_valid(raise_exception=True):
            serializer.save(teacher=teacher)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
