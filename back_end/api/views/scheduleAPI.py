from rest_framework.views import APIView
from api.serializer import ScheduleSerializer, StudentSerializer
from app.models import Schedule, Student, Attendance
from rest_framework.response import Response
from rest_framework import status
from datetime import date

class ScheduleListAPI(APIView):
    
    def get(self, request, *args, **kwargs):
        """
        API view to retrieve a list of schedules.
        """
        schedules = Schedule.objects.all().filter(date=date.today())
        serializer = ScheduleSerializer(schedules, many=True)
        return Response(serializer.data)
    
    

class GetScheduleWithAttendens(APIView):
    def get(self, request, *args, **kwargs):
        schedule_id = kwargs.get('pk')

        try:
            schedule = Schedule.objects.get(id=schedule_id)
        except Schedule.DoesNotExist:
            return Response({"error": "Schedule not found"}, status=status.HTTP_404_NOT_FOUND)

        students = schedule.group.students.all()  # Получаем всех студентов из группы

        data = []
        for student in students:
            # Находим посещаемость для студента по расписанию
            attendance = student.attendance.filter(schedule=schedule).first()

            # Если записи нет — создаём новую
            if not attendance:
                attendance = Attendance.objects.create(
                    student=student,
                    schedule=schedule,
                    presense=False
                )

            data.append({
                "id": attendance.id,
                "student_id": student.id,
                "first_name": student.first_name,
                "last_name": student.last_name,
                "presense": attendance.presense,
                "marked_at": attendance.marked_at  # добавим дату отметки
            })

        return Response({"students": data}, status=status.HTTP_200_OK)

