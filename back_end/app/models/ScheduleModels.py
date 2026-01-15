from django.db import models

from accounts.models import TeacherProfile


"""
Schedule класс - отвечает за модель расписания и подробности о ней

"""


class Schedule(models.Model):
    group = models.ForeignKey("Group", on_delete=models.CASCADE, verbose_name="Группа")
    subject = models.ForeignKey(
        "Subject_study", on_delete=models.CASCADE, verbose_name="Предмет"
    )
    teacher = models.ForeignKey(
        TeacherProfile,
        on_delete=models.CASCADE,
        blank=True,
        null=True,
        verbose_name="Преподаватель",
    )
    time = models.TimeField("Время")
    date = models.DateField("Дата")

    # Думаю при детальной страницы для учителя от сюда получать данные

    def __str__(self):
        return f"{self.group.name} {self.subject.name} {self.time} {self.date}"

    class Meta:
        verbose_name = "Расписание"
        verbose_name_plural = "Расписания"
