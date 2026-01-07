from django.contrib import admin
from .models import Student, Group, Schedule, Attendance, Subject_study
# Register your models here.




class StudentAdmin(admin.ModelAdmin):

    list_display = ('first_name', 'last_name', 'telegram_username', 'telegram_id', 'age', 'email', "platonus_id", 'phone', 'face_image')
    search_fields = ('first_name', 'last_name', 'telegram_username')
    list_filter = ('age',)
    ordering = ('first_name',)

class GroupAdmin(admin.ModelAdmin):
    list_display = ('name', 'course')
    search_fields = ('name',)
    list_filter = ('course',)
    ordering = ('name',)
    

class ScheduleAdmin(admin.ModelAdmin):
    list_display = ('group', 'subject', 'teacher', 'time', 'date')
    search_fields = ('group__name', 'subject__name')
    list_filter = ('date',)
    ordering = ('date',)

class AttendanceAdmin(admin.ModelAdmin):
    list_display = ('id','student', 'presense')
    search_fields = ('student__first_name', 'presense')
    list_filter = ('presense',)
    ordering = ('student',)
    

class SubjectStudyAdmin(admin.ModelAdmin):
    list_display = ('name', "description", 'teacher')
    search_fields = ('name', 'teacher')
    list_filter = ('name',)
    ordering = ('name',)
    

admin.site.register(Student, StudentAdmin)
admin.site.register(Group, GroupAdmin)
admin.site.register(Schedule, ScheduleAdmin)
admin.site.register(Attendance, AttendanceAdmin)
admin.site.register(Subject_study, SubjectStudyAdmin)
