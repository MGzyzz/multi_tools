from rest_framework.views import APIView
from app.models import Group
from api.serializer import GroupSerializer
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.db.models import Count
from django.core.cache import cache
from ..serializer import StudentSerializer
import logging

logger = logging.getLogger(__name__)

class GroupListAPI(APIView):
    
    """
    API view to retrive a list group
    
    """
    permission_classes = [IsAuthenticated]
        
    def get(self, request, *args, **kwargs):
        teacher = request.user.teacher_profile
        print(teacher)
        qs = Group.objects.filter(teacher=teacher).annotate(
            students_count=Count('students', distinct=True)
        )

        total_students = qs.aggregate(
            total=Count('students', distinct=True)
        )['total'] or 0

        return Response({
            "total_students": total_students,
            "groups": GroupSerializer(qs, many=True).data
        })
            # return Response({"error': 'Can't send groups list"}, status=status.HTTP_404_NOT_FOUND)
            # TO-DO разобраться со статус кодом
        

class GroupStudentAPI(APIView):
    
    """
    API view to retrive a group with students
    
    """
    
    def get(self, request, pk, *args, **kwargs):
        group = get_object_or_404(Group, id=pk)

        qs = group.students.all()  # или Student.objects.filter(group_id=pk)

        search = request.query_params.get("search")
        if search:
            qs = qs.filter(name__icontains=search)

        page = int(request.query_params.get("page", 1))
        page_size = int(request.query_params.get("page_size", 20))
        start = (page - 1) * page_size
        end = start + page_size

        return Response({
            "group": pk,
            "count": qs.count(),
            "results": StudentSerializer(qs[start:end], many=True).data
        }, status=status.HTTP_200_OK)
        
        
class GetAllStudents(APIView):
    
    """
    API view to retrive all students in all groups
    
    """
    def get(self, request, *args, **kwargs):
        teacher = request.user.teacher_profile
        groups = Group.objects.filter(teacher=teacher).prefetch_related('students')
        all_student = []
        
        cahce_key = f"students_by_teacher:{teacher.id}"
        cached_data = cache.get(cahce_key)
        
        if cached_data is not None:
            logger.info("Returning data from cache for teacher %s", teacher.id)
            return Response(cached_data, status=status.HTTP_200_OK)
        
        logger.info("Fetching data from DB for teacher %s", teacher.id)
        
        for group in groups:
            student = group.students.all()
            serializer = StudentSerializer(student, many=True)
            all_student.extend(serializer.data)
            
        cache.set(cahce_key, all_student, timeout=120)
        return Response(all_student, status=status.HTTP_200_OK)
    
class GroupDetailAPI(APIView):
    
    """
    API view to retrive a group by id
    
    """
    
    def get(self, request, pk, *args, **kwargs):
        try:
            group = Group.objects.get(id=pk)
        except Group.DoesNotExist:
            return Response({"error": "Group not found"}, status=status.HTTP_404_NOT_FOUND)
        
        serializer = GroupSerializer(group)
        return Response(serializer.data)