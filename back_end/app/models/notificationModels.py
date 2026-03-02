from django.db import models

from accounts.models import TeacherProfile

from ._choices import NotificationTypeChoices
from .studentModels import Student


class NotificationModels(models.Model):
    title = models.CharField("Заголовок", max_length=255)
    message = models.TextField("Сообщение")
    recipient_teacher = models.ForeignKey(
        TeacherProfile,
        on_delete=models.CASCADE,
        related_name="notifications",
        null=True,
        blank=True,
    )
    recipient_student = models.ForeignKey(
        Student,
        on_delete=models.CASCADE,
        related_name="notifications",
        null=True,
        blank=True,
    )
    event_type = models.CharField(
        "Тип события", max_length=20, choices=NotificationTypeChoices.choices
    )
    payload = models.JSONField("Данные события", null=True, blank=True)
    is_read = models.BooleanField("Прочитано", default=False)
    readt_at = models.DateTimeField("Дата прочтения", null=True, blank=True)
    message_format = models.CharField("Формат сообщения", max_length=20, default="TEXT")
    image = models.ImageField("Изображение", upload_to="notifications/", null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title

    class Meta:
        verbose_name = "Уведомление"
        verbose_name_plural = "Уведомления"
