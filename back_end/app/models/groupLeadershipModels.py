from django.db import models


class GroupLeadership(models.Model):
    group = models.ForeignKey(
        "Group",
        on_delete=models.CASCADE,
        related_name="leaderships",
        verbose_name="Группа",
    )
    student = models.ForeignKey(
        "Student",
        on_delete=models.CASCADE,
        related_name="leadership_roles",
        verbose_name="Студент-Староста",
    )

    def __str__(self):
        return f"{self.student} — Староста {self.group}"

    class Meta:
        verbose_name = "Староста группы"
        verbose_name_plural = "Старосты групп"
        constraints = [
            models.UniqueConstraint(fields=["group", "student"], name="unique_group_leader")
        ]
