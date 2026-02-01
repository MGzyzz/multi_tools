from django.contrib import admin

from app.utils.face_embedding import trim_face_images

from .models import (
    Attendance,
    AttendanceStat,
    Group,
    Schedule,
    Student,
    StudentFaceImage,
    Subject_study,
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
    list_display = ("id", "group", "subject", "teacher", "time", "date")
    search_fields = ("group__name", "subject__name")
    list_filter = ("date",)
    ordering = ("date",)


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


admin.site.register(Student, StudentAdmin)
admin.site.register(StudentFaceImage)
admin.site.register(Group, GroupAdmin)
admin.site.register(Schedule, ScheduleAdmin)
admin.site.register(Attendance, AttendanceAdmin)
admin.site.register(AttendanceStat, AttendanceStatAdmin)
admin.site.register(Subject_study, SubjectStudyAdmin)
