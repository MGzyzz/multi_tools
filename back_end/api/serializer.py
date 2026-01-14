from rest_framework import serializers
from rest_framework.serializers import ModelSerializer
from accounts.models import TeacherProfile
from app.models import *
from accounts.models import TeacherProfile, User
from rest_framework.fields import IntegerField
from django.contrib.auth import get_user_model


User = get_user_model()


class GroupSerializer(ModelSerializer):
    # students = StudentSerializer(many=True, read_only=True)
    students_count = IntegerField(read_only=True)

    class Meta:
        model = Group
        fields = [
            "id",
            "name",
            "course",
            "teacher",
            "students_count",
            "group_specialty",
        ]
        read_only_fields = ("teacher",)

    def validate(self, attrs):
        teacher = self.context["teacher"]
        name = attrs.get("name")

        if Group.objects.filter(name=name, teacher=teacher).exists():
            raise serializers.ValidationError(
                {
                    "name": "Группа с таким названием у этого преподавателя уже существует."
                }
            )
        return attrs


class StudentSerializer(serializers.ModelSerializer):
    group_id = serializers.IntegerField(write_only=True)
    groups = GroupSerializer(many=True, read_only=True)

    class Meta:
        model = Student
        fields = (
            "id",
            "first_name",
            "last_name",
            "email",
            "age",
            "telegram_username",
            "telegram_id",
            "platonus_id",
            "face_image",
            "group_id",
            "groups",
        )

    def validate_group_id(self, value):
        request = self.context.get("request")
        if not request or not hasattr(request.user, "teacher_profile"):
            raise serializers.ValidationError("Teacher profile not found")

        teacher = request.user.teacher_profile
        if not Group.objects.filter(id=value, teacher=teacher).exists():
            raise serializers.ValidationError("Group not found or not allowed")
        return value

    def create(self, validated_data):
        group_id = validated_data.pop("group_id")
        request = self.context["request"]
        teacher = request.user.teacher_profile

        group = Group.objects.get(id=group_id, teacher=teacher)

        student = Student.objects.create(**validated_data)

        group.students.add(student)

        return student


class SubjectSerializer(ModelSerializer):
    """
    Serializer for the Subject model.
    """

    # teacher = serializers.PrimaryKeyRelatedField(
    #     queryset=TeacherProfile.objects.all()
    # )

    class Meta:
        model = Subject_study
        fields = "__all__"


class ScheduleSerializer(ModelSerializer):
    group_id = serializers.PrimaryKeyRelatedField(
        queryset=Group.objects.all(), source="group", write_only=True
    )
    subject_id = serializers.PrimaryKeyRelatedField(
        queryset=Subject_study.objects.all(), source="subject", write_only=True
    )

    class Meta:
        model = Schedule
        fields = "__all__"


class StudentAttendanceSerializer(ModelSerializer):
    """
    Serializer for the Student model with attendance details.
    """

    class Meta:
        model = Student
        fields = ("id", "first_name", "last_name", "telegram_username")


class AttendanceRowSerializer(serializers.ModelSerializer):
    student = StudentAttendanceSerializer(read_only=True)

    class Meta:
        model = Attendance
        fields = ("id", "presense", "marked_at", "student")


class GroupMiniSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()


class SubjectMiniSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()


class ScheduleMiniSerializer(serializers.ModelSerializer):
    group = serializers.SerializerMethodField()
    subject = serializers.SerializerMethodField()

    class Meta:
        model = Schedule
        fields = ("id", "date", "time", "group", "subject")

    def get_group(self, obj):
        return {"id": obj.group_id, "name": obj.group.name}

    def get_subject(self, obj):
        return {"id": obj.subject_id, "name": obj.subject.name}


class TeacherProfileSerializer(ModelSerializer):
    """
    Serializer for the TeacherProfile model.
    """

    role = serializers.SerializerMethodField()
    avatar = serializers.SerializerMethodField()
    description = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "role",
            "avatar",
            "description",
        )

    def _get_profile(self, obj):
        try:
            return obj.teacher_profile
        except TeacherProfile.DoesNotExist:
            return None

    def get_role(self, obj):
        p = self._get_profile(obj)
        return p.role if p else None

    def get_avatar(self, obj):
        p = self._get_profile(obj)
        return p.avatar.url if (p and p.avatar) else None

    def get_description(self, obj):
        p = self._get_profile(obj)
        return p.description if p else ""


class MarkAttendanceSerializer(serializers.Serializer):
    schedule_id = serializers.IntegerField(min_value=1)
    present_student_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1), allow_empty=True
    )
