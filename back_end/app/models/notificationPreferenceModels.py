from django.db import models

from .studentModels import Student


class NotificationPreference(models.Model):
    student = models.OneToOneField(
        Student,
        on_delete=models.CASCADE,
        related_name="notification_preference",
    )
    enabled = models.BooleanField("Включены уведомления", default=True)
    allow_email = models.BooleanField("Разрешить email уведомления", default=True)
    allow_telegram = models.BooleanField("Разрешить Telegram уведомления", default=True)
    threshold_percent = models.IntegerField("Порог для уведомлений об успеваемости (%)", default=60)
    drop_delta_percent = models.IntegerField(
        "Порог для уведомлений об ухудшении успеваемости (%)", default=10
    )
    updated_at = models.DateTimeField("Дата обновления", auto_now=True)

    def __str__(self):
        return f"NotificationPreference for {self.student}"

    class Meta:
        verbose_name = "Настройка уведомлений"
        verbose_name_plural = "Настройки уведомлений"
