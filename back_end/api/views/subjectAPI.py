from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.core.cache import cache
from app.models import Subject_study, Group
from api.serializer import GroupSerializer, SubjectSerializer
import logging

logger = logging.getLogger(__name__)


class GetSubjectGroupListAPI(APIView):
    """
    API view to retrieve a list of Subject_study

    """

    permission_classes = [IsAuthenticated]

    def get(self, request, group_id, *args, **kwargs):
        try:
            teacher = request.user.teacher_profile
        except AttributeError:
            return Response(
                {"error": "User is not a teacher"}, status=status.HTTP_403_FORBIDDEN
            )
        
        cache_key = f"subject_studies_group_{group_id}_teacher_{teacher.id}"
        cached_data = cache.get(cache_key)
        
        if cached_data is not None:
            logger.info("Returning data from cache for teacher %s", teacher.id) 
            return Response(cached_data, status=status.HTTP_200_OK)
        
        subject_studies = Subject_study.objects.filter(
            groups__id=group_id, teacher=teacher
        ).distinct()

        serializer = SubjectSerializer(subject_studies, many=True)
        data = serializer.data
        cache.set(cache_key, data, timeout=300)  # Cache for 5 minutes
        logger.info("Caching data for teacher %s", teacher.id)
        return Response(data, status=status.HTTP_200_OK)

        # SELECT * FROM subject_study WHERE group_id=group_id and subject_id=subject_id
        # return Response(serializer.data, status=status.HTTP_200_OK)
        # Какие предметы есть у этой группы от этого учителя
