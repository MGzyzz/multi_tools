from rest_framework.views import APIView
from api.serializer import StudentSerializer
from app.models import Student
from rest_framework.response import Response

class StudentListAPI(APIView):
    """
    API view to retrieve a list of students.
    """
    def get(self, request, *args, **kwargs):
        students = Student.objects.all()
        serializer = StudentSerializer(students, many=True)
        return Response(serializer.data)


class GetStudentPhoto(APIView):
    """
    API view to retrieve a student's photo.
    """
    def get(self, request, student_id, *args, **kwargs):
        try:
            student = Student.objects.get(id=student_id)
            photo_url = student.photo.url if student.photo else None
            return Response({"photo_url": photo_url})
        except Student.DoesNotExist:
            return Response({"error": "Student not found"}, status=404)