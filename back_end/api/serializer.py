from rest_framework.serializers import ModelSerializer
from app.models import *


class StudentSerializer(ModelSerializer):
    """
    Serializer for the Student model.
    """
    class Meta:
        model = Student
        fields = '__all__'

class GroupSerializer(ModelSerializer):
    students = StudentSerializer(many=True, read_only=True)

    class Meta:
        model = Group
        fields = '__all__'
        

class SubjectSerializer(ModelSerializer):
    """
    Serializer for the Subject model.
    """
    class Meta:
        model = Subject_study
        fields = '__all__'
        
    
class ScheduleSerializer(ModelSerializer):
    group = GroupSerializer(read_only=True)
    subject = SubjectSerializer(read_only=True)
    
    class Meta:
        model = Schedule
        fields = '__all__'
        

class AttendanceSerializer(ModelSerializer):
    """
    Serializer for the Attendance model.
    """
    class Meta:
        model = Attendance
        fields = '__all__'