from django.db import models

from accounts.models import TeacherProfile
from app.models._choices import AuditoriumBuildingChoices


class Auditorium(models.Model):
    teacher = models.ForeignKey(
        TeacherProfile,
        on_delete=models.CASCADE,
        related_name="auditoriums",
        verbose_name="Преподаватель",
    )
    name = models.CharField("Аудитория", max_length=100)
    building = models.CharField(
        "Корпус",
        max_length=16,
        choices=AuditoriumBuildingChoices.choices,
        default=AuditoriumBuildingChoices.MAIN,
    )

    def __str__(self):
        return f"{self.get_building_display()} · {self.name}"

    class Meta:
        verbose_name = "Аудитория"
        verbose_name_plural = "Аудитории"
        constraints = [
            models.UniqueConstraint(
                fields=["teacher", "building", "name"],
                name="unique_auditorium_per_teacher_and_building",
            )
        ]
        ordering = ["building", "name", "id"]
