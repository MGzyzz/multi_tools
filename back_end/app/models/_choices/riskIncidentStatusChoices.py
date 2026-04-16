from django.db.models import TextChoices


class RiskIncidentStatusChoices(TextChoices):
    OPEN = "OPEN", "Открыт"
    ACKNOWLEDGED = "ACKNOWLEDGED", "Подтвержден"
    ESCALATED = "ESCALATED", "Эскалирован"
    RESOLVED = "RESOLVED", "Решен"
