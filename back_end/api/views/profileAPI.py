from rest_framework.views import APIView
from rest_framework import status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from accounts.models import TeacherProfile
from api.serializer import TeacherProfileSerializer


class ProfileAPI(APIView):
    """API view for handling user profile operations."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Handle GET requests to retrieve user profile information."""
        return Response(
            TeacherProfileSerializer(request.user).data, status=status.HTTP_200_OK
        )
