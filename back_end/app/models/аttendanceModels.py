from django.db import models


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
    presense = models.BooleanField("Присутствие", default=False)
    marked_at = models.DateTimeField("Отмечено в", null=True, blank=True)

    def __str__(self):
        return f"{self.student} - {self.schedule.subject} - {self.presense} - {self.schedule.time}"

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
