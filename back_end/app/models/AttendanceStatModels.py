from django.db import models

"""
Оценка предмета
GPA - 4.0

В таблицу Students добавить GPA поле

GPA - сбор всех оценок которые оцениваются до 4.0

Нужнно таблицу которая будет хранить оценки студента по каждому предмету

class Grade(models.Model):
    student = models.ForeignKey(Stundent, on_delete=models.CASCADE)
    subject = models.ForeignKey(Subject_study, on_delete=models.CASCADE)
    grade = models.FloatField()


"""


class AttendanceStat(models.Model):
    student = models.ForeignKey("Student", on_delete=models.CASCADE, verbose_name="Студент")
    subject = models.ForeignKey("Subject_study", on_delete=models.CASCADE, verbose_name="Предмет")
    group = models.ForeignKey("Group", on_delete=models.CASCADE, verbose_name="Группа")

    total = models.PositiveBigIntegerField("Всего занятий", default=0)
    attended = models.PositiveBigIntegerField("Посещено занятий", default=0)
    updated_at = models.DateTimeField("Обновлено в", auto_now=True)

    class Meta:
        verbose_name = "Статистика посещаемости"
        verbose_name_plural = "Статистика посещаемости"

        constraints = [
            models.UniqueConstraint(
                fields=["student", "subject", "group"],
                name="uniq_stat_student_subject_group",
            )
        ]
        indexes = [
            models.Index(fields=["subject", "group"]),
            models.Index(fields=["student", "subject"]),
        ]
