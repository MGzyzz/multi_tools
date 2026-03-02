from django.db import models

from ._choices import NotificationDeliveryChoices, NotificationStatusChoices


class NotificationDelivery(models.Model):
    notification = models.ForeignKey(
        "NotificationModels",
        on_delete=models.CASCADE,
        related_name="deliveries",
    )
    channel = models.CharField(
        "Канал доставки",
        max_length=20,
        choices=NotificationDeliveryChoices.choices,
    )
    status = models.CharField(
        "Статус доставки",
        max_length=20,
        choices=NotificationStatusChoices.choices,
        default=NotificationStatusChoices.PENDING,
    )
    target = models.CharField("Цель доставки", max_length=255, null=True, blank=True)
    attempts = models.IntegerField("Количество попыток доставки", default=0)
    last_error = models.TextField("Последняя ошибка доставки", null=True, blank=True)
    sent_at = models.DateTimeField("Дата отправки", null=True, blank=True)
    provider_message_id = models.CharField(
        "ID сообщения от провайдера", max_length=255, null=True, blank=True
    )

    def __str__(self):
        return f"{self.notification.title} - {self.channel} - {self.status}"

    class Meta:
        verbose_name = "Доставка уведомления"
        verbose_name_plural = "Доставки уведомлений"
