from __future__ import annotations

from datetime import timedelta
from typing import Any

from django.db import transaction
from django.utils import timezone

from accounts.models import TeacherProfile
from app.models import Group, RiskIncident, Student, Subject_study, TeacherRiskIncidentAction
from app.models._choices import (
    NotificationDeliveryChoices,
    NotificationTypeChoices,
    RiskIncidentActionChoices,
    RiskIncidentStatusChoices,
    RiskIncidentTypeChoices,
)
from app.utils.notification import create_student_notification, create_teacher_notifications

ATTENDANCE_REASON_CODE = "ATTENDANCE_BELOW_THRESHOLD"


def upsert_student_risk_incident(
    *,
    student: Student,
    incident_type: str,
    reason_code: str,
    problem: str,
    reason: str,
    due_at,
    contact: str,
    assigned_teacher: TeacherProfile | None = None,
    group: Group | None = None,
    subject: Subject_study | None = None,
    metric_name: str = "",
    metric_value: float | None = None,
    threshold_value: float | None = None,
    metric_unit: str = "",
    payload: dict[str, Any] | None = None,
    student_channels: tuple[str, ...] | None = None,
    notification_title: str | None = None,
) -> tuple[RiskIncident, bool]:
    now = timezone.now()
    channels = student_channels or (
        NotificationDeliveryChoices.EMAIL,
        NotificationDeliveryChoices.TELEGRAM,
    )

    with transaction.atomic():
        incident = _find_active_incident(
            student=student,
            incident_type=incident_type,
            reason_code=reason_code,
            group=group,
            subject=subject,
            for_update=True,
        )
        created = incident is None

        if incident is None:
            incident = RiskIncident.objects.create(
                student=student,
                assigned_teacher=assigned_teacher,
                group=group,
                subject=subject,
                incident_type=incident_type,
                reason_code=reason_code,
                problem=problem,
                reason=reason,
                contact=contact,
                metric_name=metric_name,
                metric_value=metric_value,
                threshold_value=threshold_value,
                metric_unit=metric_unit,
                payload=payload,
                due_at=due_at,
                last_detected_at=now,
            )
            TeacherRiskIncidentAction.objects.create(
                incident=incident,
                action_type=RiskIncidentActionChoices.OPENED,
                comment="Инцидент создан автоматически системой.",
                payload={"actor": "system"},
            )
        else:
            incident.problem = problem
            incident.reason = reason
            incident.contact = contact
            incident.metric_name = metric_name
            incident.metric_value = metric_value
            incident.threshold_value = threshold_value
            incident.metric_unit = metric_unit
            incident.payload = payload
            incident.due_at = due_at
            incident.last_detected_at = now
            if incident.assigned_teacher is None and assigned_teacher is not None:
                incident.assigned_teacher = assigned_teacher
            incident.save(
                update_fields=[
                    "assigned_teacher",
                    "problem",
                    "reason",
                    "contact",
                    "metric_name",
                    "metric_value",
                    "threshold_value",
                    "metric_unit",
                    "payload",
                    "due_at",
                    "last_detected_at",
                    "updated_at",
                ]
            )

        if incident.notification_sent_at is None:
            due_at_display = _format_due_at(due_at)
            notification = create_student_notification(
                student=student,
                event_type=NotificationTypeChoices.RISK_INCIDENT,
                title=notification_title or problem,
                message=build_student_risk_message(
                    student_name=student.first_name,
                    subject_name=subject.name if subject else "",
                    group_name=group.name if group else "",
                    current_value=metric_value,
                    threshold_value=threshold_value,
                    metric_unit=metric_unit,
                    due_at_display=due_at_display,
                    contact=contact,
                ),
                payload={
                    **(payload or {}),
                    "risk_incident_id": incident.id,
                    "reason_code": reason_code,
                    "incident_type": incident_type,
                    "problem": problem,
                    "reason": reason,
                    "contact": contact,
                    "due_at_display": due_at_display,
                    "student_name": student.first_name,
                    "subject_name": subject.name if subject else "",
                    "group_name": group.name if group else "",
                    "metric_name": metric_name,
                    "metric_value": metric_value,
                    "threshold_value": threshold_value,
                    "metric_unit": metric_unit,
                },
                channels=channels,
            )
            if notification is not None:
                incident.notification_sent_at = now
                incident.save(update_fields=["notification_sent_at", "updated_at"])

    return incident, created


def sync_attendance_risk_incident(
    *,
    student: Student,
    group: Group,
    subject: Subject_study,
    current_percent: int,
    threshold_percent: int,
    schedule_id: int | None = None,
    assigned_teacher: TeacherProfile | None = None,
) -> RiskIncident | None:
    if current_percent < threshold_percent:
        reason = (
            f"Система зафиксировала, что посещаемость по предмету {subject.name} "
            f"в группе {group.name} снизилась до {current_percent}% "
            f"при минимально допустимом значении {threshold_percent}%."
        )
        incident, _ = upsert_student_risk_incident(
            student=student,
            assigned_teacher=assigned_teacher,
            group=group,
            subject=subject,
            incident_type=RiskIncidentTypeChoices.ATTENDANCE,
            reason_code=ATTENDANCE_REASON_CODE,
            problem="Требуется восстановить посещаемость",
            reason=reason,
            due_at=timezone.now() + timedelta(days=7),
            contact=_build_contact(assigned_teacher),
            metric_name="attendance_percent",
            metric_value=float(current_percent),
            threshold_value=float(threshold_percent),
            metric_unit="%",
            payload={
                "student_id": student.id,
                "group_id": group.id,
                "subject_id": subject.id,
                "schedule_id": schedule_id,
                "attendance_percent": current_percent,
                "threshold_percent": threshold_percent,
            },
            notification_title=f"Важно: нужно восстановить посещаемость по предмету «{subject.name}»",
        )
        return incident

    active_incident = _find_active_incident(
        student=student,
        incident_type=RiskIncidentTypeChoices.ATTENDANCE,
        reason_code=ATTENDANCE_REASON_CODE,
        group=group,
        subject=subject,
    )
    if active_incident is not None:
        resolve_risk_incident(
            incident=active_incident,
            teacher=None,
            comment=(
                f"Инцидент закрыт автоматически: посещаемость восстановилась до "
                f"{current_percent}%."
            ),
            payload={
                "actor": "system",
                "attendance_percent": current_percent,
                "threshold_percent": threshold_percent,
            },
        )
    return active_incident


def acknowledge_risk_incident(
    *,
    incident: RiskIncident,
    teacher: TeacherProfile,
    comment: str = "",
) -> RiskIncident:
    now = timezone.now()
    incident.status = RiskIncidentStatusChoices.ACKNOWLEDGED
    incident.acknowledged_at = now
    if incident.assigned_teacher is None:
        incident.assigned_teacher = teacher
    incident.save(update_fields=["status", "acknowledged_at", "assigned_teacher", "updated_at"])

    TeacherRiskIncidentAction.objects.create(
        incident=incident,
        teacher=teacher,
        action_type=RiskIncidentActionChoices.ACKNOWLEDGED,
        comment=comment or "Преподаватель подтвердил, что начал работу с инцидентом.",
    )
    return incident


def escalate_risk_incident(
    *,
    incident: RiskIncident,
    teacher: TeacherProfile,
    escalated_to: TeacherProfile,
    comment: str = "",
) -> RiskIncident:
    now = timezone.now()
    incident.status = RiskIncidentStatusChoices.ESCALATED
    incident.escalated_to = escalated_to
    incident.escalated_at = now
    incident.escalation_level += 1
    incident.save(
        update_fields=[
            "status",
            "escalated_to",
            "escalated_at",
            "escalation_level",
            "updated_at",
        ]
    )

    TeacherRiskIncidentAction.objects.create(
        incident=incident,
        teacher=teacher,
        action_type=RiskIncidentActionChoices.ESCALATED,
        comment=comment or "Инцидент был эскалирован.",
        payload={"escalated_to_id": escalated_to.id},
    )

    create_teacher_notifications(
        teachers=[escalated_to],
        event_type=NotificationTypeChoices.RISK_INCIDENT,
        title=f"Эскалация риск-инцидента: {incident.problem}",
        message=build_teacher_escalation_message(incident=incident, comment=comment, actor=teacher),
        payload={
            "risk_incident_id": incident.id,
            "student_id": incident.student_id,
            "incident_type": incident.incident_type,
            "reason_code": incident.reason_code,
            "escalation_level": incident.escalation_level,
        },
        channels=(NotificationDeliveryChoices.IN_APP, NotificationDeliveryChoices.EMAIL),
    )
    return incident


def resolve_risk_incident(
    *,
    incident: RiskIncident,
    teacher: TeacherProfile | None,
    comment: str = "",
    payload: dict[str, Any] | None = None,
) -> RiskIncident:
    now = timezone.now()
    incident.status = RiskIncidentStatusChoices.RESOLVED
    incident.resolved_at = now
    incident.save(update_fields=["status", "resolved_at", "updated_at"])

    TeacherRiskIncidentAction.objects.create(
        incident=incident,
        teacher=teacher,
        action_type=RiskIncidentActionChoices.RESOLVED,
        comment=comment or "Инцидент был закрыт.",
        payload=payload,
    )
    return incident


def build_student_risk_message(
    *,
    student_name: str,
    subject_name: str,
    group_name: str,
    current_value: float | None,
    threshold_value: float | None,
    metric_unit: str,
    due_at_display: str,
    contact: str,
) -> str:
    current_display = _format_metric(current_value, metric_unit)
    threshold_display = _format_metric(threshold_value, metric_unit)
    greeting_name = student_name or "студент"
    contact_value = contact or "ответственному преподавателю"
    return (
        f"Здравствуйте, {greeting_name}!\n\n"
        f"Система университета зафиксировала снижение посещаемости по предмету "
        f"«{subject_name}» в группе {group_name}.\n\n"
        f"Текущая посещаемость: {current_display}\n"
        f"Минимально допустимый порог: {threshold_display}\n"
        f"Срок для исправления ситуации: {due_at_display}\n\n"
        f"Если у вас есть уважительная причина пропусков или нужна помощь, "
        f"пожалуйста, свяжитесь с: {contact_value}"
    )


def build_teacher_escalation_message(
    *,
    incident: RiskIncident,
    comment: str,
    actor: TeacherProfile,
) -> str:
    actor_name = _teacher_name(actor)
    base_message = (
        f"Студент: {incident.student}\n"
        f"Проблема: {incident.problem}\n"
        f"Причина: {incident.reason}\n"
        f"Срок исправления: "
        f"{timezone.localtime(incident.due_at).strftime('%d.%m.%Y %H:%M') if incident.due_at else 'Не указан'}"
    )
    if comment:
        return f"{base_message}\nКомментарий: {comment}\nЭскалировал: {actor_name}"
    return f"{base_message}\nЭскалировал: {actor_name}"


def _find_active_incident(
    *,
    student: Student,
    incident_type: str,
    reason_code: str,
    group: Group | None,
    subject: Subject_study | None,
    for_update: bool = False,
) -> RiskIncident | None:
    queryset = RiskIncident.objects.filter(
        student=student,
        incident_type=incident_type,
        reason_code=reason_code,
    )
    if for_update:
        queryset = queryset.select_for_update()

    if group is None:
        queryset = queryset.filter(group__isnull=True)
    else:
        queryset = queryset.filter(group=group)

    if subject is None:
        queryset = queryset.filter(subject__isnull=True)
    else:
        queryset = queryset.filter(subject=subject)

    return queryset.exclude(status=RiskIncidentStatusChoices.RESOLVED).order_by("-id").first()


def _build_contact(teacher: TeacherProfile | None) -> str:
    if teacher is None:
        return "ответственным преподавателем"

    name = _teacher_name(teacher)
    email = teacher.user.email if teacher.user and teacher.user.email else ""
    if email:
        return f"ответственным преподавателем {name} ({email})"
    return f"ответственным преподавателем {name}"


def _teacher_name(teacher: TeacherProfile) -> str:
    if teacher.user:
        return teacher.user.get_full_name() or teacher.user.username
    return str(teacher.id)


def _format_metric(value: float | None, metric_unit: str) -> str:
    if value is None:
        return "Не указано"
    if metric_unit:
        if float(value).is_integer():
            return f"{int(value)}{metric_unit}"
        return f"{value:.1f}{metric_unit}"
    return str(value)


def _format_due_at(due_at) -> str:
    return timezone.localtime(due_at).strftime("%d.%m.%Y %H:%M") if due_at else "Не указан"


__all__ = [
    "ATTENDANCE_REASON_CODE",
    "acknowledge_risk_incident",
    "build_student_risk_message",
    "build_teacher_escalation_message",
    "escalate_risk_incident",
    "resolve_risk_incident",
    "sync_attendance_risk_incident",
    "upsert_student_risk_incident",
]
