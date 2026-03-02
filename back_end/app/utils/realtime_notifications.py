from __future__ import annotations

import logging

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db import transaction

from app.models import NotificationModels

logger = logging.getLogger(__name__)


def build_teacher_notifications_group(teacher_id: int) -> str:
    return f"notifications_teacher_{teacher_id}"


def build_student_notifications_group(student_id: int) -> str:
    return f"notifications_student_{student_id}"


def publish_notification_created(notification: NotificationModels) -> None:
    """
    Sends notification payload to recipient websocket group after transaction commit.
    """

    def _send() -> None:
        channel_layer = get_channel_layer()
        if channel_layer is None:
            return

        group_name = _resolve_group_name(notification)
        if not group_name:
            return

        payload = _build_payload(notification)
        try:
            async_to_sync(channel_layer.group_send)(
                group_name,
                {
                    "type": "notification.created",
                    "payload": payload,
                },
            )
        except Exception:
            logger.exception(
                "Failed to publish websocket notification: notification_id=%s",
                notification.id,
            )

    transaction.on_commit(_send)


def _resolve_group_name(notification: NotificationModels) -> str | None:
    if notification.recipient_teacher_id:
        return build_teacher_notifications_group(notification.recipient_teacher_id)
    if notification.recipient_student_id:
        return build_student_notifications_group(notification.recipient_student_id)
    return None


def _build_payload(notification: NotificationModels) -> dict:
    return {
        "type": "notification_created",
        "id": notification.id,
        "title": notification.title,
        "message": notification.message,
        "event_type": notification.event_type,
        "payload": notification.payload,
        "is_read": notification.is_read,
        "readt_at": notification.readt_at.isoformat() if notification.readt_at else None,
        "message_format": notification.message_format,
        "image": notification.image.url if notification.image else None,
        "created_at": notification.created_at.isoformat() if notification.created_at else None,
        "recipient_teacher_id": notification.recipient_teacher_id,
        "recipient_student_id": notification.recipient_student_id,
    }
