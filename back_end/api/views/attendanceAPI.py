from rest_framework.views import APIView
from rest_framework.response import Response
from app.models import Attendance
from api.serializer import AttendanceSerializer

class AttendanceAPI(APIView):
    
    def patch(self, request, pk):
        try:
            attendance = Attendance.objects.get(id=pk)
        except Attendance.DoesNotExist:
            return Response({"error": "Attendance not found"}, status=404)

        presense = request.data.get("presense")
        marked_at = request.data.get("marked_at")

        if presense is not None:
            attendance.presense = presense

        if marked_at:
            attendance.marked_at = marked_at

        attendance.save()
        return Response({"message": "Attendance updated successfully"})