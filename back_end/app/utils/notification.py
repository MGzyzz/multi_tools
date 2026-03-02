from __future__ import annotations

from collections.abc import Iterable
from typing import Any

from accounts.models import TeacherProfile
from app.models import (
    NotificationDelivery,
    NotificationModels,
    NotificationPreference,
    Student,
)
from app.models._choices import (
    NotificationDeliveryChoices,
    NotificationStatusChoices,
    NotificationTypeChoices,
)
from app.utils.realtime_notifications import publish_notification_created


def create_teacher_notifications(
    *,
    teachers: Iterable[TeacherProfile],
    event_type: str,
    title: str,
    message: str,
    payload: dict[str, Any] | None = None,
    channels: Iterable[str] | None = None,
    message_format: str = "TEXT",
) -> list[NotificationModels]:
    """
    Creates notifications for teachers and delivery rows by selected channels.
    """
    normalized_channels = _normalize_channels(channels)
    created_notifications: list[NotificationModels] = []

    for teacher in teachers:
        notification = NotificationModels.objects.create(
            title=title,
            message=message,
            recipient_teacher=teacher,
            event_type=event_type,
            payload=payload,
            message_format=message_format,
        )
        _create_delivery_records(
            notification=notification,
            channels=normalized_channels,
            teacher=teacher,
            student=None,
        )
        publish_notification_created(notification)
        created_notifications.append(notification)

    return created_notifications


def create_student_notification(
    *,
    student: Student,
    event_type: str,
    title: str,
    message: str,
    payload: dict[str, Any] | None = None,
    channels: Iterable[str] | None = None,
    message_format: str = "TEXT",
) -> NotificationModels | None:
    """
    Creates a notification for student if student has enabled preferences.
    """
    allowed_channels = _allowed_student_channels(student=student, requested_channels=channels)
    if not allowed_channels:
        return None

    notification = NotificationModels.objects.create(
        title=title,
        message=message,
        recipient_student=student,
        event_type=event_type,
        payload=payload,
        message_format=message_format,
    )
    _create_delivery_records(
        notification=notification,
        channels=allowed_channels,
        teacher=None,
        student=student,
    )
    publish_notification_created(notification)
    return notification


def should_send_performance_alert(
    *,
    student: Student,
    current_percent: int | float,
    previous_percent: int | float | None = None,
) -> bool:
    """
    Returns True when student's attendance/performance crosses configured threshold.
    """
    preference = NotificationPreference.objects.filter(student=student).first()
    if not preference or not preference.enabled:
        return False

    if current_percent < preference.threshold_percent:
        return True

    if previous_percent is not None:
        return (previous_percent - current_percent) >= preference.drop_delta_percent

    return False


def create_notifications(
    *,
    event_type: str,
    title: str,
    message: str,
    teachers: Iterable[TeacherProfile] | None = None,
    students: Iterable[Student] | None = None,
    payload: dict[str, Any] | None = None,
    teacher_channels: Iterable[str] | None = None,
    student_channels: Iterable[str] | None = None,
    message_format: str = "TEXT",
) -> list[NotificationModels]:
    """
    Unified entrypoint for bulk notification creation.
    """
    created: list[NotificationModels] = []

    if teachers:
        created.extend(
            create_teacher_notifications(
                teachers=teachers,
                event_type=event_type,
                title=title,
                message=message,
                payload=payload,
                channels=teacher_channels,
                message_format=message_format,
            )
        )

    if students:
        for student in students:
            notification = create_student_notification(
                student=student,
                event_type=event_type,
                title=title,
                message=message,
                payload=payload,
                channels=student_channels,
                message_format=message_format,
            )
            if notification is not None:
                created.append(notification)

    return created


def _allowed_student_channels(
    *,
    student: Student,
    requested_channels: Iterable[str] | None,
) -> tuple[str, ...]:
    preference = NotificationPreference.objects.filter(student=student).first()
    if not preference or not preference.enabled:
        return ()

    default_channels = (
        NotificationDeliveryChoices.IN_APP,
        NotificationDeliveryChoices.EMAIL,
        NotificationDeliveryChoices.TELEGRAM,
    )
    requested = _normalize_channels(requested_channels or default_channels)

    allowed = {NotificationDeliveryChoices.IN_APP}
    if preference.allow_email:
        allowed.add(NotificationDeliveryChoices.EMAIL)
    if preference.allow_telegram:
        allowed.add(NotificationDeliveryChoices.TELEGRAM)

    return tuple(channel for channel in requested if channel in allowed)


def _normalize_channels(channels: Iterable[str] | None) -> tuple[str, ...]:
    if not channels:
        return (NotificationDeliveryChoices.IN_APP,)
    # Keep original order, remove duplicates.
    return tuple(dict.fromkeys(channels))


def _create_delivery_records(
    *,
    notification: NotificationModels,
    channels: Iterable[str],
    teacher: TeacherProfile | None,
    student: Student | None,
) -> None:
    for channel in channels:
        target = _resolve_delivery_target(channel=channel, teacher=teacher, student=student)

        if channel != NotificationDeliveryChoices.IN_APP and not target:
            NotificationDelivery.objects.create(
                notification=notification,
                channel=channel,
                status=NotificationStatusChoices.FAILED,
                target=target,
                attempts=1,
                last_error="Target is missing for selected channel.",
            )
            continue

        NotificationDelivery.objects.create(
            notification=notification,
            channel=channel,
            status=NotificationStatusChoices.PENDING,
            target=target,
        )


def _resolve_delivery_target(
    *,
    channel: str,
    teacher: TeacherProfile | None,
    student: Student | None,
) -> str | None:
    if channel == NotificationDeliveryChoices.IN_APP:
        return None

    if channel == NotificationDeliveryChoices.EMAIL:
        if teacher and teacher.user and teacher.user.email:
            return teacher.user.email
        if student and student.email:
            return student.email
        return None

    if channel == NotificationDeliveryChoices.TELEGRAM:
        if student and student.telegram_id:
            return student.telegram_id
        if student and student.telegram_username:
            return student.telegram_username
        return None

    return None


__all__ = [
    "create_notifications",
    "create_student_notification",
    "create_teacher_notifications",
    "should_send_performance_alert",
    "NotificationTypeChoices",
]
