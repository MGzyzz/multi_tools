from aiogram import Router, types
from aiogram.filters import Command


def build_router() -> Router:
    router = Router()

    @router.message(Command("start"))
    async def start(message: types.Message) -> None:
        await message.answer(text="Hello, I am your bot!")

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
