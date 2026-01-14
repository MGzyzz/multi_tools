from rest_framework.views import APIView
from api.serializer import ScheduleSerializer, GroupSerializer
from app.models import Schedule, Student, Attendance
from rest_framework.response import Response
from rest_framework import status
from django.core.cache import cache
from datetime import date
import logging


logger = logging.getLogger(__name__)


class ScheduleListAPI(APIView):

    def get(self, request, *args, **kwargs):
        """
        API view to retrieve a list of schedules.
        """
        teacher = request.user.teacher_profile

        cache_key = f"schedules_teacher_{teacher.id}_date_{date.today()}"
        cached_data = cache.get(cache_key)

        if cached_data is not None:
            print("Returning cached schedule data")
            return Response(cached_data, status=status.HTTP_200_OK)
        print("Fetching schedule data from database")

        schedules = Schedule.objects.all().filter(teacher=teacher, date=date.today())
        # Не забудь добавить фильтрацию по дате, когда фронт будет готов к этому
        serializer = ScheduleSerializer(schedules, many=True)
        cache.set(cache_key, serializer.data, timeout=300)  # Кэшируем на 5 минут
        return Response(serializer.data)


class GetScheduleWithAttendens(APIView):
    def get(self, request, *args, **kwargs):
        schedule_id = kwargs.get("pk")

        try:
            schedule = Schedule.objects.get(id=schedule_id)
        except Schedule.DoesNotExist:
            return Response(
                {"error": "Schedule not found"}, status=status.HTTP_404_NOT_FOUND
            )

        students = schedule.group.students.all()  # Получаем всех студентов из группы

        data = []
        for student in students:
            # Находим посещаемость для студента по расписанию
            attendance = student.attendance.filter(schedule=schedule).first()

            # Если записи нет — создаём новую
            if not attendance:
                attendance = Attendance.objects.create(
                    student=student, schedule=schedule, presense=False
                )

            data.append(
                {
                    "id": attendance.id,
                    "student_id": student.id,
                    "first_name": student.first_name,
                    "last_name": student.last_name,
                    "presense": attendance.presense,
                    "marked_at": attendance.marked_at,  # добавим дату отметки
                }
            )

        return Response({"students": data}, status=status.HTTP_200_OK)


class GetScheduleGroupId(APIView):
    def get(self, request, pk, *args, **kwargs):

        try:
            schedule = Schedule.objects.get(id=pk)
            group = schedule.group
        except Schedule.DoesNotExist:
            return Response(
                {"error": "Schedule not found"}, status=status.HTTP_404_NOT_FOUND
            )

        serializer = GroupSerializer(group)
        return Response(serializer.data)
