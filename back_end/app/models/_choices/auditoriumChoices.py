from django.db import models


class AuditoriumBuildingChoices(models.TextChoices):
    MAIN = "main", "Главный корпус"
    OTHER = "other", "Другой корпус"
