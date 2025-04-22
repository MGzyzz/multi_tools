from django.contrib import admin
from .models import Student, Group, Schedule
# Register your models here.




class StudentAdmin(admin.ModelAdmin):

    list_display = ('first_name', 'last_name', 'telegram_username', 'telegram_id', 'age', 'email', 'phone', 'address')
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
    

admin.site.register(Student, StudentAdmin)
admin.site.register(Group, GroupAdmin)
admin.site.register(Schedule, ScheduleAdmin)