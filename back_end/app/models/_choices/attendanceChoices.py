from django.db import models


class AttendanceStatusChoices(models.TextChoices):
    NOT_MARKED = "not_marked", "Не отмечено"
    PRESENT = "present", "Присутствовал"
    LATE = "late", "Опоздал"
    ABSENT = "absent", "Отсутствовал"
