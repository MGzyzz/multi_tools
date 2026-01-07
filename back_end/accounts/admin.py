from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import User, TeacherProfile


class ProfileInline(admin.StackedInline):
    model = TeacherProfile
    fields = ['avatar', 'description', 'role']


class UserProfileAdmin(UserAdmin):
    list_display = ['id', 'username']
    field = ['is_online']
    inlines = [ProfileInline]


admin.site.register(User, UserProfileAdmin)