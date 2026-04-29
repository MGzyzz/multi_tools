from django.contrib import admin

from app.utils.face_embedding import trim_face_images

from .models import (
    Attendance,
    AttendanceStat,
    Auditorium,
    Group,
    NotificationDelivery,
    NotificationModels,
    NotificationPreference,
    RiskIncident,
    Schedule,
    Student,
    StudentFaceImage,
    Subject_study,
    TeacherRiskIncidentAction,
)

# Register your models here.


class StudentFaceImageInline(admin.TabularInline):
    model = StudentFaceImage
    extra = 0
    readonly_fields = ("created_at",)


class StudentAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "first_name",
        "last_name",
        "telegram_username",
        "telegram_id",
        "age",
        "email",
        "platonus_id",
        "phone",
        "face_image",
    )
    search_fields = ("first_name", "last_name", "telegram_username")
    list_filter = ("age",)
    ordering = ("first_name",)
    inlines = (StudentFaceImageInline,)

    def save_model(self, request, obj, form, change):
        face_changed = "face_image" in form.changed_data
        super().save_model(request, obj, form, change)

        if face_changed and obj.face_image:
            StudentFaceImage.objects.create(student=obj, image=obj.face_image)
            trim_face_images(obj)


class GroupAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "course")
    search_fields = ("name",)
    list_filter = ("course",)
    ordering = ("name",)


class ScheduleAdmin(admin.ModelAdmin):
    list_display = ("id", "group", "subject", "auditorium", "teacher", "time", "date")
    search_fields = ("group__name", "subject__name", "auditorium__name")
    list_filter = ("date", "auditorium__building")
    ordering = ("date",)


class AuditoriumAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "building", "teacher")
    search_fields = ("name", "teacher__user__username", "teacher__user__first_name")
    list_filter = ("building",)
    ordering = ("building", "name")


class StudentByGroupFilter(admin.SimpleListFilter):
    title = "Студент"
    parameter_name = "student_id"

    def lookups(self, request, _model_admin):
        group_id = request.GET.get("schedule__group__id__exact")
        students = Student.objects.order_by("last_name", "first_name")
        if group_id:
            students = students.filter(groups__id=group_id)
        return [(s.id, f"{s.last_name} {s.first_name}") for s in students]

    def queryset(self, request, queryset):
        if self.value():
            return queryset.filter(student_id=self.value())
        return queryset


@admin.action(description="Отметить присутствие")
def mark_present(modeladmin, request, queryset):
    from app.models._choices.attendanceChoices import AttendanceStatusChoices

    updated = queryset.exclude(status=AttendanceStatusChoices.PRESENT).update(
        status=AttendanceStatusChoices.PRESENT
    )
    modeladmin.message_user(request, f"Отмечено присутствие: {updated} записей.")


@admin.action(description="Отметить отсутствие")
def mark_absent(modeladmin, request, queryset):
    from app.models._choices.attendanceChoices import AttendanceStatusChoices

    updated = queryset.exclude(status=AttendanceStatusChoices.ABSENT).update(
        status=AttendanceStatusChoices.ABSENT
    )
    modeladmin.message_user(request, f"Отмечено отсутствие: {updated} записей.")


class AttendanceAdmin(admin.ModelAdmin):
    actions = [mark_present, mark_absent]
    list_display = (
        "id",
        "student",
        "get_group",
        "get_subject",
        "get_date",
        "get_time",
        "status",
        "marked_at",
    )
    search_fields = (
        "student__first_name",
        "student__last_name",
        "schedule__group__name",
        "schedule__subject__name",
    )
    list_filter = (
        "status",
        "schedule__group",
        StudentByGroupFilter,
        "schedule__subject",
        "schedule__date",
    )
    ordering = ("-schedule__date", "student__last_name")
    date_hierarchy = "schedule__date"
    list_select_related = ("student", "schedule__group", "schedule__subject")

    @admin.display(description="Группа", ordering="schedule__group__name")
    def get_group(self, obj):
        return obj.schedule.group.name

    @admin.display(description="Предмет", ordering="schedule__subject__name")
    def get_subject(self, obj):
        return obj.schedule.subject.name

    @admin.display(description="Дата", ordering="schedule__date")
    def get_date(self, obj):
        return obj.schedule.date

    @admin.display(description="Время", ordering="schedule__time")
    def get_time(self, obj):
        return obj.schedule.time


class AttendanceStatAdmin(admin.ModelAdmin):
    list_display = ("student", "subject", "group", "total", "attended")
    search_fields = ("student__first_name", "subject__name", "group__name")
    list_filter = ("subject", "group")
    ordering = ("student",)


class SubjectStudyAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "description", "teacher")
    search_fields = ("name", "teacher")
    list_filter = ("name",)
    ordering = ("name",)


class NotificationModelsAdmin(admin.ModelAdmin):
    list_display = ("id", "title", "message", "created_at")
    search_fields = ("title",)
    list_filter = ("created_at",)
    ordering = ("-created_at",)


class NotificationPreferenceAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "student",
        "enabled",
        "allow_email",
        "allow_telegram",
        "threshold_percent",
        "drop_delta_percent",
        "updated_at",
    )
    search_fields = ("student__first_name", "student__last_name", "student__email")
    list_filter = ("enabled", "allow_email", "allow_telegram")
    ordering = ("-updated_at",)


class NotificationDeliveryAdmin(admin.ModelAdmin):
    list_display = ("id", "notification", "channel", "status", "target", "attempts", "sent_at")
    search_fields = ("notification__title", "target", "provider_message_id")
    list_filter = ("channel", "status")
    ordering = ("-id",)


class TeacherRiskIncidentActionInline(admin.TabularInline):
    model = TeacherRiskIncidentAction
    extra = 0
    readonly_fields = ("teacher", "action_type", "comment", "payload", "created_at")


class RiskIncidentAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "student",
        "incident_type",
        "reason_code",
        "status",
        "assigned_teacher",
        "escalated_to",
        "due_at",
        "notification_sent_at",
    )
    search_fields = (
        "student__first_name",
        "student__last_name",
        "student__email",
        "problem",
        "reason_code",
    )
    list_filter = ("incident_type", "status")
    ordering = ("-created_at",)
    inlines = (TeacherRiskIncidentActionInline,)


admin.site.register(Student, StudentAdmin)
admin.site.register(StudentFaceImage)
admin.site.register(Group, GroupAdmin)
admin.site.register(Auditorium, AuditoriumAdmin)
admin.site.register(Schedule, ScheduleAdmin)
admin.site.register(Attendance, AttendanceAdmin)
admin.site.register(AttendanceStat, AttendanceStatAdmin)
admin.site.register(Subject_study, SubjectStudyAdmin)
admin.site.register(NotificationModels, NotificationModelsAdmin)
admin.site.register(NotificationPreference, NotificationPreferenceAdmin)
admin.site.register(NotificationDelivery, NotificationDeliveryAdmin)
admin.site.register(RiskIncident, RiskIncidentAdmin)
