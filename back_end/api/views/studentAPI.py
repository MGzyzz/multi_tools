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
    def get(self, request, first_name, *args, **kwargs):
        student = Student.objects.filter(first_name__iexact=first_name).first()
        if not student:
            return Response({"error": "Student not found"}, status=404)
        try:
            photo_url = student.face_image.url if student.face_image else None
            return Response({"photo_url": photo_url})
        except Student.DoesNotExist:
            return Response({"error": "Student not found"}, status=404)
        
    
class CreateStudentAPI(APIView):
    
    """
    API view to create a new student.
    """
    
    def get(self, request, *args, **kwargs):
        return Response({"message": "Use POST method sosunok :d!"})
    
    def post(self, request, *args, **kwargs):
        serializer = StudentSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)
    
    
