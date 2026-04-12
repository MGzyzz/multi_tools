import logging

from django.core.cache import cache
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from api.serializer import StudentSerializer
from app.models import Student, StudentFaceImage
from app.utils.face_embedding import fetch_embedding_from_file, trim_face_images

logger = logging.getLogger(__name__)


class StudentListAPI(APIView):
    permission_classes = [IsAuthenticated]

    """
    API view to retrieve a list of students.
    """

    def get(self, request, *args, **kwargs):
        students = Student.objects.all()
        serializer = StudentSerializer(students, many=True)
        return Response(serializer.data)


class GetStudentPhoto(APIView):
    permission_classes = [IsAuthenticated]

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
    permission_classes = [IsAuthenticated]

    """
    API view to create a new student.
    """

    def get(self, request, *args, **kwargs):
        return Response({"message": "Use POST method sosunok :d!"})

    def post(self, request, *args, **kwargs):
        serializer = StudentSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        student = serializer.save()

        if "face_image" in request.FILES:
            file_obj = request.FILES.get("face_image")
            if file_obj:
                if file_obj.size > 5 * 1024 * 1024:
                    return Response(
                        {"error": "File size exceeds 5MB limit"}, status=status.HTTP_400_BAD_REQUEST
                    )
                if not file_obj.content_type.startswith("image/"):
                    return Response(
                        {"error": "Only image files are allowed"},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                embedding, error = fetch_embedding_from_file(file_obj)
                if error:
                    logger.warning("Face embedding failed for student_id=%s: %s", student.id, error)
                else:
                    file_obj.seek(0)
                    StudentFaceImage.objects.create(
                        student=student, image=file_obj, embedding=embedding
                    )
                    trim_face_images(student)
                    student.save(update_fields=["face_updated_at"])

        teacher = request.user.teacher_profile
        cache.delete(f"students_by_teacher:{teacher.id}")

        return Response(StudentSerializer(student).data, status=status.HTTP_201_CREATED)


def create_excel_mark_file(APIView):
    pass

    # TODO: Сделать выгрузку данных


class getStudentInformation(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        first_name = kwargs.get("first_name")
        student = Student.objects.filter(first_name__iexact=first_name).first()

        if student:
            serializer = StudentSerializer(student)
            return Response({"data": serializer.data})
        return Response({"error": "student not found"}, status=status.HTTP_404_NOT_FOUND)

    # TODO: Переписать на id. Либо так же закоментировать


class EditStudentAPI(APIView):
    """
    API view to edit student information.
    """

    permission_classes = [IsAuthenticated]

    def patch(self, request, student_id, *args, **kwargs):
        try:
            student = Student.objects.get(id=student_id)
        except Student.DoesNotExist:
            return Response({"error": "Student not found"}, status=status.HTTP_404_NOT_FOUND)

        serializer = StudentSerializer(
            student, data=request.data, partial=True, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        if "face_image" in request.FILES:
            file_obj = request.FILES.get("face_image")
            if file_obj:
                if file_obj.size > 5 * 1024 * 1024:
                    return Response(
                        {"error": "File size exceeds 5MB limit"}, status=status.HTTP_400_BAD_REQUEST
                    )
                if not file_obj.content_type.startswith("image/"):
                    return Response(
                        {"error": "Only image files are allowed"},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                embedding, error = fetch_embedding_from_file(file_obj)
                if error:
                    logger.warning("Face embedding failed for student_id=%s: %s", student.id, error)
                else:
                    file_obj.seek(0)
                    StudentFaceImage.objects.create(
                        student=student, image=file_obj, embedding=embedding
                    )
                    trim_face_images(student)
                    student.save(update_fields=["face_updated_at"])

        teacher = request.user.teacher_profile
        cache.delete(f"students_by_teacher:{teacher.id}")

        return Response(serializer.data, status=status.HTTP_200_OK)
