from django.db import models

from accounts.models import TeacherProfile


class Group(models.Model):
    name = models.CharField("Название группы", max_length=100)
    students = models.ManyToManyField(
        "Student", related_name="groups", verbose_name="Студенты", blank=True
    )
    course = models.CharField("Курс", max_length=50)
    teacher = models.ForeignKey(
        TeacherProfile,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name="Преподаватель",
    )
    group_specialty = models.CharField("Специальность", max_length=100)

    # Специальность нужна?
    def __str__(self):
        return self.name

    class Meta:
        verbose_name = "Группа"
        verbose_name_plural = "Группы"
        constraints = [
            models.UniqueConstraint(
                fields=["name", "teacher"], name="unique_group_name_per_teacher"
            )
        ]
