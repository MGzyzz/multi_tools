from django.db import models


class NotificationModels(models.Model):
    # Пока без пользователя
    title = models.CharField("Заголовок", max_length=255)
    message = models.TextField("Сообщение")
    created_at = models.DateTimeField("Дата создания", auto_now_add=True)

    def __str__(self):
        return self.title

    class Meta:
        verbose_name = "Уведомление"
        verbose_name_plural = "Уведомления"
