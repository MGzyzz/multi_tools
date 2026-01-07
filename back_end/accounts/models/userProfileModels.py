# accounts/models.py
from django.conf import settings
from django.db import models
from ._choices import RoleChoices
from django.contrib.auth.models import AbstractUser


class User(AbstractUser):
    pass

class TeacherProfile(models.Model):

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        related_name="teacher_profile",
        on_delete=models.CASCADE
    )
    role = models.CharField(max_length=20, default=RoleChoices.TEACHER, choices=RoleChoices , verbose_name="Роль пользователя")
    avatar = models.ImageField(upload_to="avatar", null=True, blank=True)
    description = models.TextField(max_length=250, blank=True)

    def __str__(self):
        return f"{self.user.username} ({self.role})"
    
    #TODO: Убрать текущий код. Я думаю вернуть модель учителя обратно. Под вопросом?
    #INFO: Помеял имя и убрал RoleChoices
    # Я устал :d
