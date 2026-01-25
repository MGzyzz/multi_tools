from django.core.exceptions import ObjectDoesNotExist
from django.db import models

from accounts.models import TeacherProfile

from .GroupModels import Group


class Subject_study(models.Model):
    name = models.CharField("Название предмета", max_length=100)
    description = models.TextField("Описание")
    teacher = models.ForeignKey(
        TeacherProfile, on_delete=models.CASCADE, verbose_name="Преподаватель"
    )
    groups = models.ManyToManyField(
        Group, related_name="subjects", verbose_name="Группы", blank=True
    )

    def __str__(self):
        teacher_name = ""
        try:
            tp = self.teacher  # может кинуть DoesNotExist если teacher_id битый
            if tp and tp.user:
                teacher_name = tp.user.get_full_name() or tp.user.username
        except ObjectDoesNotExist:
            teacher_name = "(teacher missing)"
        return f"{self.name} {teacher_name}".strip()

    class Meta:
        verbose_name = "Предмет"
        verbose_name_plural = "Предметы"
