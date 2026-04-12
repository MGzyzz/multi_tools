from django.db.models import TextChoices


class RiskIncidentTypeChoices(TextChoices):
    ATTENDANCE = "ATTENDANCE", "Посещаемость"
    ACADEMIC = "ACADEMIC", "Успеваемость"
    PAYMENT = "PAYMENT", "Оплата"
    GENERAL = "GENERAL", "Общий риск"
