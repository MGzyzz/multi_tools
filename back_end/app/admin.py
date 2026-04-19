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


class AttendanceAdmin(admin.ModelAdmin):
    list_display = ("id", "student", "presense")
    search_fields = ("student__first_name", "presense")
    list_filter = ("presense",)
    ordering = ("student",)


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
