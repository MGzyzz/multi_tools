from django.conf import settings
from pgvector.django import CosineDistance
from rest_framework import status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from app.models import Student, StudentFaceImage
from app.utils.face_embedding import fetch_embedding_from_file, trim_face_images


class UpdateStudentFaceEmbedding(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser)

    def post(self, request, student_id, *args, **kwargs):
        file_obj = request.FILES.get("file")
        if not file_obj:
            return Response({"error": "file_required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            student = Student.objects.get(id=student_id)
        except Student.DoesNotExist:
            return Response({"error": "student_not_found"}, status=status.HTTP_404_NOT_FOUND)

        embedding, error = fetch_embedding_from_file(file_obj)
        if error:
            return Response(error, status=status.HTTP_400_BAD_REQUEST)

        file_obj.seek(0)
        face_image = StudentFaceImage.objects.create(
            student=student, image=file_obj, embedding=embedding
        )
        trim_face_images(student)
        student.save(update_fields=["face_updated_at"])

        return Response(
            {
                "status": "saved",
                "student_id": student.id,
                "face_image_id": face_image.id,
                "dimensions": len(embedding),
            },
            status=status.HTTP_200_OK,
        )


class RecognizeStudentByFace(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser)

    def post(self, request, *args, **kwargs):
        file_obj = request.FILES.get("file")
        if not file_obj:
            return Response({"error": "file_required"}, status=status.HTTP_400_BAD_REQUEST)

        embedding, error = fetch_embedding_from_file(file_obj)
        if error:
            return Response(error, status=status.HTTP_400_BAD_REQUEST)

        faces_qs = StudentFaceImage.objects.exclude(embedding=None)
        if not faces_qs.exists():
            return Response(
                {"status": "empty_embeddings"},
                status=status.HTTP_404_NOT_FOUND,
            )

        best = (
            faces_qs.annotate(distance=CosineDistance("embedding", embedding))
            .order_by("distance")
            .select_related("student")
            .first()
        )

        if not best or best.distance is None:
            return Response(
                {"status": "not_recognized"},
                status=status.HTTP_200_OK,
            )

        similarity = 1 - float(best.distance)
        threshold = float(getattr(settings, "FACE_RECOGNITION_THRESHOLD", 0.7))

        if similarity < threshold:
            return Response(
                {"status": "not_recognized", "similarity": round(similarity, 4)},
                status=status.HTTP_200_OK,
            )

        return Response(
            {
                "status": "recognized",
                "student_id": best.student_id,
                "similarity": round(similarity, 4),
            },
            status=status.HTTP_200_OK,
        )
