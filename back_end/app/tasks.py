import datetime
import logging
import os

import requests
from celery import shared_task
from django.conf import settings
from django.core.cache import cache
from django.core.mail import send_mail
from django.db import transaction
from django.db.models import Count, Q
from django.template.loader import render_to_string
from django.utils import timezone

from app.models._choices import NotificationDeliveryChoices, NotificationStatusChoices

MAX_RETRY_ATTEMPTS = 3

logger = logging.getLogger(__name__)


# Данная задача предназначена для тестирования работы Celery.
@shared_task(name="hello_world_task")
def hello_world():
    return "Hello, World!"


@shared_task(name="reconcile_attendance_stats")
def reconcile_attendance_stats():
    """
    Пересчитывает AttendanceStat из Attendance (источник истины).
    Делает:
    - totals = count(attendance)
    - attended = count(attendance where presense=True)
    - затем обновляет/создаёт AttendanceStat
    - и опционально обнуляет/удаляет устаревшие stats, которых нет в источнике
    """
    from .models import Attendance, AttendanceStat

    started_at = timezone.now()

    # 1) Агрегируем по (student, group, subject)
    # subject и group берем через schedule
    from app.models._choices.attendanceChoices import AttendanceStatusChoices

    _attended = (AttendanceStatusChoices.PRESENT, AttendanceStatusChoices.LATE)

    rows = Attendance.objects.exclude(
        status=AttendanceStatusChoices.NOT_MARKED
    ).values(
        "student_id", "schedule__group_id", "schedule__subject_id"
    ).annotate(
        total=Count("id"),
        attended=Count("id", filter=Q(status__in=_attended)),
    )

    # Преобразуем в удобный dict для сравнения/обновления
    aggregated = {}
    for r in rows:
        key = (r["student_id"], r["schedule__subject_id"], r["schedule__group_id"])
        aggregated[key] = (r["total"], r["attended"])

    keys = list(aggregated.keys())

    with transaction.atomic():
        # 2) Забираем ВСЕ существующие AttendanceStat — нужно для корректного удаления orphans
        all_existing = {
            (s.student_id, s.subject_id, s.group_id): s
            for s in AttendanceStat.objects.all()
        }

        to_update = []
        to_create = []

        for (student_id, subject_id, group_id), (total, attended) in aggregated.items():
            stat = all_existing.get((student_id, subject_id, group_id))
            if stat is None:
                to_create.append(
                    AttendanceStat(
                        student_id=student_id,
                        subject_id=subject_id,
                        group_id=group_id,
                        total=total,
                        attended=attended,
                    )
                )
            else:
                if stat.total != total or stat.attended != attended:
                    stat.total = total
                    stat.attended = attended
                    to_update.append(stat)

        if to_create:
            AttendanceStat.objects.bulk_create(to_create, batch_size=1000)

        if to_update:
            AttendanceStat.objects.bulk_update(to_update, ["total", "attended"], batch_size=1000)

        # 3) Удаляем orphan stats — те, для которых нет ни одной отмеченной записи Attendance
        aggregated_keys = set(aggregated.keys())
        orphan_ids = [
            s.id for key, s in all_existing.items() if key not in aggregated_keys
        ]
        deleted = 0
        if orphan_ids:
            deleted, _ = AttendanceStat.objects.filter(id__in=orphan_ids).delete()

    finished_at = timezone.now()
    return {
        "started_at": started_at.isoformat(),
        "finished_at": finished_at.isoformat(),
        "aggregated_rows": len(aggregated),
        "created": len(to_create),
        "updated": len(to_update),
        "deleted_orphans": deleted,
    }


@shared_task(name="process_notification_delivery")
def process_notification_delivery(delivery_id: int) -> dict:
    from app.models import NotificationDelivery

    try:
        delivery = NotificationDelivery.objects.select_related("notification").get(id=delivery_id)
    except NotificationDelivery.DoesNotExist:
        return {"delivery_id": delivery_id, "status": "missing"}

    if delivery.status == NotificationStatusChoices.SENT:
        return {"delivery_id": delivery_id, "status": "already_sent"}

    attempt_number = delivery.attempts + 1

    try:
        provider_message_id: str | None = None
        if delivery.channel == NotificationDeliveryChoices.IN_APP:
            provider_message_id = f"in_app:{delivery.notification_id}:{delivery.id}"
        elif delivery.channel == NotificationDeliveryChoices.EMAIL:
            _send_delivery_email(
                delivery.target,
                delivery.notification.title,
                delivery.notification.message,
                delivery.notification,
            )
        elif delivery.channel == NotificationDeliveryChoices.TELEGRAM:
            provider_message_id = _send_delivery_telegram(
                delivery.target,
                delivery.notification.title,
                delivery.notification.message,
            )
        else:
            raise ValueError(f"Unsupported delivery channel: {delivery.channel}")

        delivery.status = NotificationStatusChoices.SENT
        delivery.sent_at = timezone.now()
        delivery.provider_message_id = provider_message_id
        delivery.last_error = None
        delivery.attempts = attempt_number
        delivery.save(
            update_fields=["status", "sent_at", "provider_message_id", "last_error", "attempts"]
        )
        return {"delivery_id": delivery_id, "status": "sent"}
    except Exception as exc:  # noqa: BLE001
        logger.exception("Notification delivery failed: delivery_id=%s", delivery_id)
        delivery.status = NotificationStatusChoices.FAILED
        delivery.attempts = attempt_number
        delivery.last_error = str(exc)
        delivery.save(update_fields=["status", "attempts", "last_error"])
        return {"delivery_id": delivery_id, "status": "failed", "error": str(exc)}


@shared_task(name="enqueue_pending_notification_deliveries")
def enqueue_pending_notification_deliveries(limit: int = 200) -> dict:
    from app.models import NotificationDelivery

    ids = list(
        NotificationDelivery.objects.filter(
            Q(status=NotificationStatusChoices.PENDING)
            | Q(status=NotificationStatusChoices.FAILED, attempts__lt=MAX_RETRY_ATTEMPTS)
        )
        .order_by("id")
        .values_list("id", flat=True)[:limit]
    )

    for delivery_id in ids:
        process_notification_delivery.delay(delivery_id)

    return {"enqueued": len(ids), "limit": limit}


def _send_delivery_email(target: str | None, subject: str, message: str, notification) -> None:
    if not target:
        raise ValueError("Missing email target.")

    from_email = getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@example.com")
    html_message = _build_email_html(notification=notification, fallback_subject=subject)
    send_mail(
        subject=subject,
        message=message,
        from_email=from_email,
        recipient_list=[target],
        fail_silently=False,
        html_message=html_message,
    )


def _send_delivery_telegram(target: str | None, subject: str, message: str) -> str | None:
    if not target:
        raise ValueError("Missing telegram target.")

    bot_service_url = getattr(
        settings, "BOT_SERVICE_URL", os.getenv("BOT_SERVICE_URL", "http://localhost:8001")
    )
    normalized_target = _normalize_telegram_target(target)
    response = requests.post(
        f"{bot_service_url}/send_message",
        json={
            "recipient": normalized_target,
            "subject": subject or "Уведомление",
            "message": message,
        },
        timeout=5,
    )
    response.raise_for_status()
    payload = response.json() if response.content else {}
    return (
        str(payload.get("message_id"))
        if isinstance(payload, dict) and payload.get("message_id")
        else None
    )


def _normalize_telegram_target(target: str) -> int | str:
    value = str(target).strip()
    if value.lstrip("-").isdigit():
        return int(value)
    return value if value.startswith("@") else f"@{value}"


@shared_task(name="send_lesson_reminders")
def send_lesson_reminders() -> dict:
    """
    Runs every 5 minutes. Sends Telegram reminders to teachers whose lessons
    start within their configured reminder window.
    """
    from app.models import Schedule, TeacherNotificationSettings

    now = timezone.localtime(timezone.now())
    today = now.date()

    schedules_today = (
        Schedule.objects.filter(date=today)
        .select_related("teacher__notification_settings", "group", "subject")
        .exclude(teacher__isnull=True)
        .exclude(teacher__telegram_chat_id__isnull=True)
        .exclude(teacher__telegram_chat_id="")
    )

    sent = 0
    skipped = 0

    for schedule in schedules_today:
        teacher = schedule.teacher
        try:
            ns = teacher.notification_settings
        except TeacherNotificationSettings.DoesNotExist:
            continue

        if not ns.lesson_reminder_enabled:
            continue

        lesson_dt = datetime.datetime.combine(today, schedule.time)
        lesson_dt = timezone.make_aware(lesson_dt)
        remind_dt = lesson_dt - datetime.timedelta(minutes=ns.reminder_minutes_before)

        # Only send if we are within the 5-minute window starting at remind_dt
        window_end = remind_dt + datetime.timedelta(minutes=5)
        if not (remind_dt <= now < window_end):
            skipped += 1
            continue

        dedup_key = f"lesson_reminder:{schedule.id}:{teacher.id}"
        if cache.get(dedup_key):
            skipped += 1
            continue

        text = (
            f"⏰ Напоминание об уроке\n\n"
            f"Группа: {schedule.group.name}\n"
            f"Предмет: {schedule.subject.name}\n"
            f"Время: {schedule.time.strftime('%H:%M')}\n"
            f"Через {ns.reminder_minutes_before} мин."
        )

        try:
            _send_delivery_telegram(
                target=teacher.telegram_chat_id,
                subject="Напоминание об уроке",
                message=text,
            )
            cache.set(dedup_key, 1, timeout=60 * 60)
            sent += 1
        except Exception:
            logger.exception(
                "Failed to send lesson reminder: schedule_id=%s teacher_id=%s",
                schedule.id,
                teacher.id,
            )

    return {"sent": sent, "skipped": skipped}


def _build_email_html(notification, fallback_subject: str) -> str:
    payload = notification.payload or {}
    if notification.event_type == "RISK":
        student_name = payload.get("student_name") or (
            notification.recipient_student.first_name
            if notification.recipient_student
            else "студент"
        )
        return render_to_string(
            "emails/student_risk_notification.html",
            {
                "title": notification.title or fallback_subject,
                "student_name": student_name,
                "subject_name": payload.get("subject_name") or "предмет не указан",
                "group_name": payload.get("group_name") or "группа не указана",
                "problem": payload.get("problem") or notification.title,
                "reason": payload.get("reason") or notification.message,
                "metric_name": payload.get("metric_name") or "",
                "metric_value": _format_metric_value(
                    payload.get("metric_value"), payload.get("metric_unit")
                ),
                "threshold_value": _format_metric_value(
                    payload.get("threshold_value"), payload.get("metric_unit")
                ),
                "due_at_display": payload.get("due_at_display") or "Не указан",
                "contact": payload.get("contact") or "ответственному преподавателю",
            },
        )

    return render_to_string(
        "emails/generic_notification.html",
        {
            "title": notification.title or fallback_subject,
            "message": notification.message,
        },
    )


def _format_metric_value(value, unit: str | None) -> str:
    if value is None:
        return "Не указано"
    if unit:
        numeric_value = float(value)
        if numeric_value.is_integer():
            return f"{int(numeric_value)}{unit}"
        return f"{numeric_value:.1f}{unit}"
    return str(value)
