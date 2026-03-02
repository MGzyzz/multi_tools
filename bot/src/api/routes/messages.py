from html import escape

from fastapi import APIRouter, Depends

from src.api.dependencies import get_telegram_service
from src.schemas.messages import (
    MessageResponse,
    SendMessageRequest,
    SendThreadMessageRequest,
)
from src.services.telegram import TelegramService

router = APIRouter()


def build_message(subject: str, message: str, urgent: bool) -> str:
    subject_text = escape(subject)
    message_text = escape(message)
    result = f"Subject: {subject_text}\\nMessage: {message_text}"
    if urgent:
        return f"<b>Urgent!</b>\\n{result}"
    return result


@router.post("/send_message", response_model=MessageResponse)
async def send_message(
    payload: SendMessageRequest,
    telegram_service: TelegramService = Depends(get_telegram_service),
) -> MessageResponse:
    final_message = build_message(payload.subject, payload.message, payload.urgent)
    await telegram_service.send_message(
        chat_id=payload.recipient,
        text=final_message,
        thread_id=payload.thread_id,
    )
    return MessageResponse(status="message sent")


@router.post("/send_message_thread_bot", response_model=MessageResponse)
async def send_message_thread_bot(
    payload: SendThreadMessageRequest,
    telegram_service: TelegramService = Depends(get_telegram_service),
) -> MessageResponse:
    final_message = build_message(payload.subject, payload.message, payload.urgent)
    await telegram_service.send_message(
        chat_id=payload.group_id,
        text=final_message,
        thread_id=payload.thread_id,
    )
    return MessageResponse(status="message sent")
