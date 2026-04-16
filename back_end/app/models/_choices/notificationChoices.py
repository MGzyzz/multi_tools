from django.db.models import TextChoices


class NotificationTypeChoices(TextChoices):
    SCHEDULE_CHANGED = "SCHEDULE", "Расписание"
    GROUP_CHANGED = "GROUP", "Группа"
    STUDENT_CHANGED = "STUDENT", "Студент"
    PERFOMANCE_DROP = "PERFORMANCE", "Успеваемость"
    RISK_INCIDENT = "RISK", "Риск студента"
