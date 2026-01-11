from rest_framework.views import APIView
from api.serializer import StudentSerializer
from app.models import Student
from rest_framework.response import Response
from rest_framework import status
from django.core.cache import cache
import requests

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
        
    # TODO: Убрать это пока или просто закоментировать
        
    
class CreateStudentAPI(APIView):
    
    """
    API view to create a new student.
    """
    
    def get(self, request, *args, **kwargs):
        return Response({"message": "Use POST method sosunok :d!"})
    
    def post(self, request, *args, **kwargs):
        serializer = StudentSerializer(
            data=request.data,
            context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        student = serializer.save()

        teacher = request.user.teacher_profile
        cache.delete(f"students_by_teacher:{teacher.id}")

        return Response(
            StudentSerializer(student).data,
            status=status.HTTP_201_CREATED
        )

    

def create_excel_mark_file(APIView):
    pass


    # TODO: Сделать выгрузку данных


class getStudentInformation(APIView):
    
    
    def get(self, request, *args, **kwargs):
        first_name = kwargs.get('first_name')
        student = Student.objects.filter(first_name__iexact=first_name).first()
        
        if student:
            serializer = StudentSerializer(student)
            return Response({'data': serializer.data})
        return Response({'error': 'student not found'})
    
    # TODO: Переписать на id. Либо так же закоментировать