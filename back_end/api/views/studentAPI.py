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