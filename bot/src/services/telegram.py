import asyncio
import logging
from contextlib import suppress

from aiogram import Bot, Dispatcher

from src.bot.handlers import build_router

logger = logging.getLogger(__name__)


class TelegramService:
    def __init__(self, token: str, enable_polling: bool = True) -> None:
        self._enable_polling = enable_polling
        self.bot = Bot(token=token)
        self.dispatcher = Dispatcher()
        self.dispatcher.include_router(build_router())
        self._polling_task: asyncio.Task[None] | None = None

    async def start(self) -> None:
        if not self._enable_polling:
            logger.info("Telegram polling disabled by configuration.")
            return

        if self._polling_task and not self._polling_task.done():
            return

        self._polling_task = asyncio.create_task(
            self.dispatcher.start_polling(self.bot)
        )
        logger.info("Telegram polling started.")

    async def stop(self) -> None:
        if self._polling_task:
            self._polling_task.cancel()
            with suppress(asyncio.CancelledError):
                await self._polling_task
        await self.bot.session.close()
        logger.info("Telegram bot session closed.")

    async def send_message(
        self,
        chat_id: int,
        text: str,
        thread_id: int | None = None,
    ) -> None:
        payload: dict[str, int | str] = {
            "chat_id": chat_id,
            "text": text,
            "parse_mode": "HTML",
        }
        if thread_id is not None:
            payload["message_thread_id"] = thread_id
        await self.bot.send_message(**payload)

    async def status(self) -> str:
        try:
            await self.bot.get_me()
            return "online"
        except Exception:
            logger.exception("Telegram bot is offline.")
            return "offline"
