from django.db import models

from accounts.models import TeacherProfile


class TeacherNotificationSettings(models.Model):
    teacher = models.OneToOneField(
        TeacherProfile,
        on_delete=models.CASCADE,
        related_name="notification_settings",
        verbose_name="Преподаватель",
    )
    lesson_reminder_enabled = models.BooleanField("Напоминание об уроке включено", default=True)
    reminder_minutes_before = models.PositiveIntegerField(
        "За сколько минут до урока напоминать", default=30
    )

    def __str__(self):
        return f"Настройки уведомлений: {self.teacher}"

    class Meta:
        verbose_name = "Настройки уведомлений преподавателя"
        verbose_name_plural = "Настройки уведомлений преподавателей"
