from fastapi import Request

from src.services.telegram import TelegramService


def get_telegram_service(request: Request) -> TelegramService:
    return request.app.state.telegram_service
