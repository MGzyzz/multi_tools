from django.db.models import TextChoices


class RiskIncidentActionChoices(TextChoices):
    OPENED = "OPENED", "Инцидент создан"
    ACKNOWLEDGED = "ACKNOWLEDGED", "Подтвержден"
    ESCALATED = "ESCALATED", "Эскалирован"
    RESOLVED = "RESOLVED", "Решен"
