from django.db.models import TextChoices


class NotificationDeliveryChoices(TextChoices):
    IN_APP = "IN_APP", "В приложении"
    EMAIL = "EMAIL", "Email"
    TELEGRAM = "TELEGRAM", "Telegram"
