from django.db import models
from django.utils import timezone

from accounts.models import TeacherProfile

from ._choices import (
    RiskIncidentActionChoices,
    RiskIncidentStatusChoices,
    RiskIncidentTypeChoices,
)


class RiskIncident(models.Model):
    student = models.ForeignKey(
        "Student",
        on_delete=models.CASCADE,
        related_name="risk_incidents",
        verbose_name="Студент",
    )
    assigned_teacher = models.ForeignKey(
        TeacherProfile,
        on_delete=models.SET_NULL,
        related_name="assigned_risk_incidents",
        verbose_name="Ответственный преподаватель",
        null=True,
        blank=True,
    )
    escalated_to = models.ForeignKey(
        TeacherProfile,
        on_delete=models.SET_NULL,
        related_name="escalated_risk_incidents",
        verbose_name="Эскалировано к",
        null=True,
        blank=True,
    )
    group = models.ForeignKey(
        "Group",
        on_delete=models.SET_NULL,
        related_name="risk_incidents",
        verbose_name="Группа",
        null=True,
        blank=True,
    )
    subject = models.ForeignKey(
        "Subject_study",
        on_delete=models.SET_NULL,
        related_name="risk_incidents",
        verbose_name="Предмет",
        null=True,
        blank=True,
    )
    incident_type = models.CharField(
        "Тип инцидента",
        max_length=20,
        choices=RiskIncidentTypeChoices.choices,
    )
    reason_code = models.CharField("Код причины", max_length=64)
    status = models.CharField(
        "Статус",
        max_length=20,
        choices=RiskIncidentStatusChoices.choices,
        default=RiskIncidentStatusChoices.OPEN,
    )
    problem = models.CharField("Проблема", max_length=255)
    reason = models.TextField("Причина")
    contact = models.CharField("Контакт для обращения", max_length=255, blank=True)
    metric_name = models.CharField("Название метрики", max_length=100, blank=True)
    metric_value = models.FloatField("Текущее значение", null=True, blank=True)
    threshold_value = models.FloatField("Пороговое значение", null=True, blank=True)
    metric_unit = models.CharField("Единица измерения", max_length=20, blank=True)
    payload = models.JSONField("Данные инцидента", null=True, blank=True)
    first_detected_at = models.DateTimeField("Первое выявление", auto_now_add=True)
    last_detected_at = models.DateTimeField("Последнее выявление", default=timezone.now)
    due_at = models.DateTimeField("Срок исправления", null=True, blank=True)
    notification_sent_at = models.DateTimeField(
        "Первое уведомление отправлено",
        null=True,
        blank=True,
    )
    acknowledged_at = models.DateTimeField("Подтверждено преподавателем", null=True, blank=True)
    escalated_at = models.DateTimeField("Дата эскалации", null=True, blank=True)
    resolved_at = models.DateTimeField("Дата решения", null=True, blank=True)
    escalation_level = models.PositiveSmallIntegerField("Уровень эскалации", default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.student} - {self.incident_type} - {self.reason_code}"

    class Meta:
        verbose_name = "Риск-инцидент"
        verbose_name_plural = "Риск-инциденты"
        indexes = [
            models.Index(fields=["student", "incident_type", "status"]),
            models.Index(fields=["assigned_teacher", "status"]),
            models.Index(fields=["escalated_to", "status"]),
            models.Index(fields=["group", "subject", "status"]),
        ]


class TeacherRiskIncidentAction(models.Model):
    incident = models.ForeignKey(
        RiskIncident,
        on_delete=models.CASCADE,
        related_name="actions",
        verbose_name="Инцидент",
    )
    teacher = models.ForeignKey(
        TeacherProfile,
        on_delete=models.SET_NULL,
        related_name="risk_incident_actions",
        verbose_name="Преподаватель",
        null=True,
        blank=True,
    )
    action_type = models.CharField(
        "Тип действия",
        max_length=20,
        choices=RiskIncidentActionChoices.choices,
    )
    comment = models.TextField("Комментарий", blank=True)
    payload = models.JSONField("Дополнительные данные", null=True, blank=True)
    created_at = models.DateTimeField("Дата действия", auto_now_add=True)

    def __str__(self):
        return f"{self.incident_id} - {self.action_type}"

    class Meta:
        verbose_name = "Действие по риск-инциденту"
        verbose_name_plural = "Действия по риск-инцидентам"
        indexes = [
            models.Index(fields=["incident", "created_at"]),
            models.Index(fields=["teacher", "created_at"]),
        ]
