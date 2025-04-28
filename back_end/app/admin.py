from django.contrib import admin
from .models import Student, Group, Schedule, Mark, Teacher
# Register your models here.




class StudentAdmin(admin.ModelAdmin):

    list_display = ('first_name', 'last_name', 'telegram_username', 'telegram_id', 'age', 'email', 'phone', 'address', 'gpa', 'face_image')
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
    search_fields = ('group__name', 'subject', 'teacher')
    list_filter = ('date',)
    ordering = ('date',)

class MarksAdmin(admin.ModelAdmin):
    list_display = ('student', 'subject', 'presense', 'time')
    search_fields = ('student__first_name', 'subject')
    list_filter = ('presense',)
    ordering = ('student',)
    

class TeacherAdmin(admin.ModelAdmin):
    list_display = ('first_name', 'last_name', 'email', 'phone')
    search_fields = ('first_name', 'last_name')
    ordering = ('first_name',)
    

admin.site.register(Student, StudentAdmin)
admin.site.register(Group, GroupAdmin)
admin.site.register(Schedule, ScheduleAdmin)
admin.site.register(Mark, MarksAdmin)
admin.site.register(Teacher, TeacherAdmin)