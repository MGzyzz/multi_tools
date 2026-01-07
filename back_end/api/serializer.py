from rest_framework import serializers
from rest_framework.serializers import ModelSerializer
from accounts.models import TeacherProfile
from app.models import *
from rest_framework.fields import IntegerField


class StudentSerializer(ModelSerializer):
    """
    Serializer for the Student model.
    """
    class Meta:
        model = Student
        fields = '__all__'

class GroupSerializer(ModelSerializer):
    # students = StudentSerializer(many=True, read_only=True)
    students_count = IntegerField(read_only=True)

    class Meta:
        model = Group
        fields = ['id', 'name', 'course', 'teacher', 'students_count']
        

class SubjectSerializer(ModelSerializer):
    """
    Serializer for the Subject model.
    """
    # teacher = serializers.PrimaryKeyRelatedField(
    #     queryset=TeacherProfile.objects.all()
    # )
    
    class Meta:
        model = Subject_study
        fields = '__all__'
        
    
class ScheduleSerializer(ModelSerializer):
    group_id = serializers.PrimaryKeyRelatedField(
        queryset=Group.objects.all(),
        source="group",
        write_only=True
    )
    subject_id = serializers.PrimaryKeyRelatedField(
        queryset=Subject_study.objects.all(),
        source="subject",
        write_only=True
    )

    class Meta:
        model = Schedule
        fields = "__all__"
        

class AttendanceSerializer(ModelSerializer):
    """
    Serializer for the Attendance model.
    """
    class Meta:
        model = Attendance
        fields = '__all__'