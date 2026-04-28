import logging

import httpx
from aiogram import Router, types
from aiogram.filters import Command, CommandStart

from src.core.config import settings

logger = logging.getLogger(__name__)


def build_router() -> Router:
    router = Router()

    @router.message(CommandStart())
    async def start(message: types.Message) -> None:
        args = message.text.split(maxsplit=1)
        token = args[1].strip() if len(args) > 1 else None

        if not token:
            await message.answer(
                "👋 Привет! Я бот платформы Lectern.\n\n"
                "Чтобы привязать аккаунт, перейдите в настройки на сайте "
                "и получите код привязки. Затем напишите:\n"
                "<code>/start ВАШ_КОД</code>",
                parse_mode="HTML",
            )
            return

        chat_id = str(message.chat.id)
        linked = await _link_teacher(token=token, chat_id=chat_id)

        if linked:
            await message.answer(
                "✅ Telegram успешно привязан! Теперь вы будете получать напоминания об уроках."
            )
        else:
            await message.answer(
                "❌ Код недействителен или истёк. Получите новый код в настройках профиля."
            )

    @router.message(Command("get_id"))
    async def get_topic_id(message: types.Message) -> None:
        if message.message_thread_id:
            await message.answer(f"ID этой темы: {message.message_thread_id}")
            return
        await message.answer("Это сообщение не из темы")

    @router.message(Command("get_chat_id"))
    async def get_chat_id(message: types.Message) -> None:
        await message.answer(f"ID этого чата: {message.chat.id}")

    return router


async def _link_teacher(token: str, chat_id: str) -> bool:
    url = f"{settings.django_api_url}/teacher/telegram/link-callback/"
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.post(
                url,
                json={"token": token, "chat_id": chat_id},
                headers={"X-Bot-Secret": settings.bot_service_secret},
            )
        return resp.status_code == 200
    except Exception:
        logger.exception("Failed to call link-callback endpoint")
        return False
