from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from app.models._choices.attendanceChoices import AttendanceStatusChoices


class Attendance(models.Model):
    student = models.ForeignKey(
        "Student",
        on_delete=models.CASCADE,
        related_name="attendance",
        verbose_name="Студент",
    )
    schedule = models.ForeignKey(
        "Schedule",
        on_delete=models.CASCADE,
        null=False,
        related_name="attendances",
        verbose_name="Занятие",
    )
    status = models.CharField(
        "Статус",
        max_length=20,
        choices=AttendanceStatusChoices.choices,
        default=AttendanceStatusChoices.NOT_MARKED,
    )
    marked_at = models.DateTimeField("Отмечено в", null=True, blank=True)
    score = models.DecimalField(
        "Оценка",
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
    )

    def __str__(self):
        return f"{self.student} - {self.schedule.subject} - {self.status} - {self.schedule.time}"

    class Meta:
        verbose_name = "Посещаемость"
        verbose_name_plural = "Посещаемости"

        constraints = [
            models.UniqueConstraint(
                fields=["student", "schedule"],
                name="uniq_attendance_student_schedule",
            )
        ]

        indexes = [
            models.Index(fields=["schedule"]),
            models.Index(fields=["student"]),
        ]
