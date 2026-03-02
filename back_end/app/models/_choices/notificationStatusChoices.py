from django.db import models


class NotificationStatusChoices(models.TextChoices):
    PENDING = "PENDING", "Ожидается"
    SENT = "SENT", "Отправлено"
    FAILED = "FAILED", "Ошибка отправки"
