from rest_framework.views import APIView
from app.models import Group
from api.serializer import GroupSerializer
from rest_framework.response import Response
from rest_framework import status

class GroupListAPI(APIView):
    
    """
    API view to retrive a list group
    
    """
    
    def get(request, *args, **kwargs):
        group = Group.objects.all()
        serializer = GroupSerializer(group, many=True)
        return Response(serializer.data)
            # return Response({"error': 'Can't send groups list"}, status=status.HTTP_404_NOT_FOUND)
            # TO-DO разобраться со статус кодом
        
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
