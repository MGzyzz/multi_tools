from rest_framework import serializers
from rest_framework.fields import IntegerField
from rest_framework.serializers import ModelSerializer

from accounts.models import TeacherProfile, User
from accounts.models._choices import RoleChoices
from app.models import (
    Attendance,
    Auditorium,
    Group,
    GroupLeadership,
    NotificationDelivery,
    NotificationModels,
    NotificationPreference,
    RiskIncident,
    Schedule,
    Student,
    Subject_study,
    TeacherNotificationSettings,
    TeacherRiskIncidentAction,
)


class AuditoriumSerializer(ModelSerializer):
    building_label = serializers.CharField(source="get_building_display", read_only=True)

    class Meta:
        model = Auditorium
        fields = ["id", "name", "building", "building_label"]

    def validate(self, attrs):
        teacher = self.context["teacher"]
        name = attrs.get("name", "").strip()
        building = attrs.get("building")

        if not name:
            raise serializers.ValidationError({"name": "Auditorium name is required."})

        if Auditorium.objects.filter(teacher=teacher, name=name, building=building).exists():
            raise serializers.ValidationError(
                {"name": "This auditorium already exists for the selected building."}
            )

        attrs["name"] = name
        return attrs


class GroupSerializer(ModelSerializer):
    # students = StudentSerializer(many=True, read_only=True)
    students_count = IntegerField(read_only=True)
    marks_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Group
        fields = [
            "id",
            "name",
            "course",
            "teacher",
            "students_count",
            "group_specialty",
            "marks_count",
        ]
        read_only_fields = ("teacher",)

    def validate(self, attrs):
        teacher = self.context["teacher"]
        name = attrs.get("name")

        if Group.objects.filter(name=name, teacher=teacher).exists():
            raise serializers.ValidationError(
                {"name": "Группа с таким названием у этого преподавателя уже существует."}
            )
        return attrs


class StudentSerializer(serializers.ModelSerializer):
    group_id = serializers.IntegerField(write_only=True)
    groups = serializers.SerializerMethodField()
    attendance = serializers.SerializerMethodField()

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
            "attendance",
        )

    def get_groups(self, obj):
        return [{"id": g.id, "name": g.name} for g in obj.groups.all()]

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

    def get_attendance(self, obj):
        """
        Возвращает посещаемость именно по (group, subject), который пришёл в query params.
        """
        stats_map = self.context.get("stats_map") or {}
        row = stats_map.get(obj.id)

        if not row:
            return {"total": 0, "attended": 0, "percent": 0}

        total = row["total"] or 0
        attended = row["attended"] or 0
        percent = round((attended / total) * 100) if total > 0 else 0

        return {"total": total, "attended": attended, "percent": percent}


class SubjectSerializer(ModelSerializer):
    """
    Serializer for the Subject model.
    """

    # teacher = serializers.PrimaryKeyRelatedField(
    #     queryset=TeacherProfile.objects.all()
    # )

    class Meta:
        model = Subject_study
        fields = ["id", "name", "description"]


class ScheduleSerializer(ModelSerializer):
    group_id = serializers.PrimaryKeyRelatedField(
        queryset=Group.objects.all(), source="group", write_only=True
    )
    subject_id = serializers.PrimaryKeyRelatedField(
        queryset=Subject_study.objects.all(), source="subject", write_only=True
    )
    auditorium_id = serializers.PrimaryKeyRelatedField(
        queryset=Auditorium.objects.all(),
        source="auditorium",
        write_only=True,
        required=False,
        allow_null=True,
    )
    subject_name = serializers.CharField(source="subject.name", read_only=True)
    auditorium_name = serializers.CharField(source="auditorium.name", read_only=True)
    auditorium_building = serializers.CharField(source="auditorium.building", read_only=True)
    auditorium_building_label = serializers.CharField(
        source="auditorium.get_building_display",
        read_only=True,
    )
    is_mine = serializers.SerializerMethodField()

    class Meta:
        model = Schedule
        fields = "__all__"

    def get_is_mine(self, obj) -> bool:
        teacher_id = self.context.get("teacher_id")
        if teacher_id is None:
            return True
        return obj.teacher_id == teacher_id


class SchedulePlannerEntrySerializer(serializers.ModelSerializer):
    subject = serializers.SerializerMethodField()
    teacher = serializers.SerializerMethodField()
    can_edit = serializers.SerializerMethodField()

    class Meta:
        model = Schedule
        fields = ("id", "date", "time", "subject", "teacher", "can_edit")

    def get_subject(self, obj):
        return {"id": obj.subject_id, "name": obj.subject.name}

    def get_teacher(self, obj):
        if obj.teacher and obj.teacher.user:
            return {
                "id": obj.teacher_id,
                "name": obj.teacher.user.get_full_name() or obj.teacher.user.username,
            }
        return {"id": obj.teacher_id, "name": "Преподаватель не указан"}

    def get_can_edit(self, obj):
        current_teacher_id = self.context.get("current_teacher_id")
        return obj.teacher_id == current_teacher_id


class SchedulePlannerMutationItemSerializer(serializers.Serializer):
    id = serializers.IntegerField(required=False)
    date = serializers.DateField()
    time = serializers.TimeField(input_formats=["%H:%M", "%H:%M:%S"])
    subject_id = serializers.IntegerField(min_value=1)


class SchedulePlannerSaveSerializer(serializers.Serializer):
    group_id = serializers.IntegerField(min_value=1)
    start_date = serializers.DateField()
    end_date = serializers.DateField()
    create = SchedulePlannerMutationItemSerializer(many=True, required=False)
    update = SchedulePlannerMutationItemSerializer(many=True, required=False)
    delete = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        required=False,
        allow_empty=True,
    )

    def validate(self, attrs):
        if attrs["end_date"] < attrs["start_date"]:
            raise serializers.ValidationError("End date must not be earlier than start date.")

        range_days = (attrs["end_date"] - attrs["start_date"]).days
        if range_days > 45:
            raise serializers.ValidationError("Planner save range is too large.")

        if not attrs.get("create") and not attrs.get("update") and not attrs.get("delete"):
            raise serializers.ValidationError("Nothing to save.")

        return attrs


class ScheduleSemesterPatternItemSerializer(serializers.Serializer):
    weekday = serializers.IntegerField(min_value=0, max_value=6)
    time = serializers.TimeField(input_formats=["%H:%M", "%H:%M:%S"])
    subject_id = serializers.IntegerField(min_value=1)


class ScheduleSemesterPlanSerializer(serializers.Serializer):
    group_id = serializers.IntegerField(min_value=1)
    start_date = serializers.DateField()
    end_date = serializers.DateField()
    pattern = ScheduleSemesterPatternItemSerializer(many=True)

    def validate(self, attrs):
        if attrs["end_date"] < attrs["start_date"]:
            raise serializers.ValidationError("End date must not be earlier than start date.")

        range_days = (attrs["end_date"] - attrs["start_date"]).days
        if range_days > 220:
            raise serializers.ValidationError(
                "Semester planning range is too large. Split it into smaller periods."
            )

        pattern = attrs.get("pattern") or []
        if not pattern:
            raise serializers.ValidationError("Pattern must contain at least one lesson.")

        seen_slots = set()
        for item in pattern:
            slot = (item["weekday"], item["time"])
            if slot in seen_slots:
                raise serializers.ValidationError("Pattern contains duplicate weekday/time slots.")
            seen_slots.add(slot)

        return attrs


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
        fields = ("id", "status", "marked_at", "score", "student")


class AttendanceUpdateSerializer(serializers.Serializer):
    from app.models._choices.attendanceChoices import AttendanceStatusChoices

    status = serializers.ChoiceField(
        choices=AttendanceStatusChoices.choices, required=False
    )
    marked_at = serializers.DateTimeField(required=False)
    score = serializers.DecimalField(
        max_digits=5,
        decimal_places=2,
        required=False,
        allow_null=True,
    )

    def validate(self, attrs):
        if not attrs:
            raise serializers.ValidationError("At least one field must be provided.")
        return attrs


class StudentJournalEntrySerializer(serializers.Serializer):
    id = serializers.IntegerField()
    schedule_id = serializers.IntegerField()
    date = serializers.DateField()
    time = serializers.TimeField()
    status = serializers.CharField()
    marked_at = serializers.DateTimeField(allow_null=True)
    score = serializers.DecimalField(max_digits=5, decimal_places=2, allow_null=True)


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


class NotificationDeliverySerializer(ModelSerializer):
    class Meta:
        model = NotificationDelivery
        fields = (
            "id",
            "channel",
            "status",
            "target",
            "attempts",
            "last_error",
            "sent_at",
            "provider_message_id",
        )


class NotificationSerializer(ModelSerializer):
    deliveries = NotificationDeliverySerializer(many=True, read_only=True)

    class Meta:
        model = NotificationModels
        fields = (
            "id",
            "title",
            "message",
            "event_type",
            "payload",
            "is_read",
            "readt_at",
            "message_format",
            "image",
            "created_at",
            "deliveries",
        )


class NotificationPreferenceSerializer(ModelSerializer):
    class Meta:
        model = NotificationPreference
        fields = (
            "enabled",
            "allow_email",
            "allow_telegram",
            "threshold_percent",
            "drop_delta_percent",
            "updated_at",
        )
        read_only_fields = ("updated_at",)


class TeacherRiskIncidentActionSerializer(ModelSerializer):
    teacher_name = serializers.SerializerMethodField()

    class Meta:
        model = TeacherRiskIncidentAction
        fields = (
            "id",
            "action_type",
            "comment",
            "payload",
            "created_at",
            "teacher",
            "teacher_name",
        )

    def get_teacher_name(self, obj):
        if obj.teacher and obj.teacher.user:
            return obj.teacher.user.get_full_name() or obj.teacher.user.username
        return None


class RiskIncidentSerializer(ModelSerializer):
    actions = TeacherRiskIncidentActionSerializer(many=True, read_only=True)
    student_name = serializers.SerializerMethodField()
    assigned_teacher_name = serializers.SerializerMethodField()
    escalated_to_name = serializers.SerializerMethodField()

    class Meta:
        model = RiskIncident
        fields = (
            "id",
            "student",
            "student_name",
            "assigned_teacher",
            "assigned_teacher_name",
            "escalated_to",
            "escalated_to_name",
            "group",
            "subject",
            "incident_type",
            "reason_code",
            "status",
            "problem",
            "reason",
            "contact",
            "metric_name",
            "metric_value",
            "threshold_value",
            "metric_unit",
            "payload",
            "first_detected_at",
            "last_detected_at",
            "due_at",
            "notification_sent_at",
            "acknowledged_at",
            "escalated_at",
            "resolved_at",
            "escalation_level",
            "created_at",
            "updated_at",
            "actions",
        )

    def get_student_name(self, obj):
        return str(obj.student)

    def get_assigned_teacher_name(self, obj):
        if obj.assigned_teacher and obj.assigned_teacher.user:
            return obj.assigned_teacher.user.get_full_name() or obj.assigned_teacher.user.username
        return None

    def get_escalated_to_name(self, obj):
        if obj.escalated_to and obj.escalated_to.user:
            return obj.escalated_to.user.get_full_name() or obj.escalated_to.user.username
        return None


class RiskIncidentAcknowledgeSerializer(serializers.Serializer):
    comment = serializers.CharField(required=False, allow_blank=True)


class RiskIncidentResolveSerializer(serializers.Serializer):
    comment = serializers.CharField(required=False, allow_blank=True)


class RiskIncidentEscalateSerializer(serializers.Serializer):
    teacher_id = serializers.IntegerField()
    comment = serializers.CharField(required=False, allow_blank=True)


class TeacherProfileSerializer(ModelSerializer):
    """
    Serializer for the TeacherProfile model.
    """

    role = serializers.ChoiceField(
        source="teacher_profile.role", choices=RoleChoices, required=False, allow_blank=True
    )
    avatar = serializers.SerializerMethodField()
    description = serializers.CharField(
        source="teacher_profile.description", required=False, allow_blank=True
    )

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

    def update(self, instance, validated_data):
        profile_data = validated_data.pop("teacher_profile", {})

        instance = super().update(instance, validated_data)

        if profile_data:
            profile, _ = TeacherProfile.objects.get_or_create(user=instance)
            for attr, value in profile_data.items():
                setattr(profile, attr, value)
            profile.save()

        return instance

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


class TeacherNotificationSettingsSerializer(ModelSerializer):
    class Meta:
        model = TeacherNotificationSettings
        fields = ["lesson_reminder_enabled", "reminder_minutes_before"]


class GroupLeadershipSerializer(ModelSerializer):
    student_id = serializers.IntegerField(source="student.id", read_only=True)
    first_name = serializers.CharField(source="student.first_name", read_only=True)
    last_name = serializers.CharField(source="student.last_name", read_only=True)
    telegram_connected = serializers.SerializerMethodField()

    class Meta:
        model = GroupLeadership
        fields = ["id", "student_id", "first_name", "last_name", "telegram_connected"]

    def get_telegram_connected(self, obj) -> bool:
        return bool(obj.student.telegram_id)


class TeacherBroadcastSerializer(serializers.Serializer):
    group_ids = serializers.ListField(child=serializers.IntegerField(min_value=1), min_length=1)
    message = serializers.CharField(min_length=1, max_length=4096)
