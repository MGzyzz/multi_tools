from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from api.serializer import TeacherProfileSerializer


class ProfileAPI(APIView):
    """API view for handling user profile operations."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Handle GET requests to retrieve user profile information."""
        return Response(TeacherProfileSerializer(request.user).data, status=status.HTTP_200_OK)


class EditProfileAPI(APIView):
    """API view for editing user profile information."""

    permission_classes = [IsAuthenticated]

    def patch(self, request):
        """Handle PATCH requests to update user profile information."""
        serializer = TeacherProfileSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
