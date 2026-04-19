from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from api.serializer import AuditoriumSerializer
from api.views.attendanceAPI import IsTeacher
from app.models import Auditorium


class AuditoriumListCreateAPI(APIView):
    permission_classes = [IsAuthenticated, IsTeacher]

    def get(self, request, *args, **kwargs):
        teacher = request.user.teacher_profile
        auditoriums = Auditorium.objects.filter(teacher=teacher).order_by("building", "name", "id")
        serializer = AuditoriumSerializer(auditoriums, many=True)
        return Response({"auditoriums": serializer.data}, status=status.HTTP_200_OK)

    def post(self, request, *args, **kwargs):
        teacher = request.user.teacher_profile
        serializer = AuditoriumSerializer(data=request.data, context={"teacher": teacher})
        serializer.is_valid(raise_exception=True)
        auditorium = serializer.save(teacher=teacher)
        return Response(
            AuditoriumSerializer(auditorium).data,
            status=status.HTTP_201_CREATED,
        )
