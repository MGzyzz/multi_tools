import asyncio
import os

from aiogram import Bot, Dispatcher, Router, types
from aiogram.filters import Command
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env"))

TOKEN = os.getenv("TOKEN_BOT")
bot = Bot(token=TOKEN)
dp = Dispatcher()
router = Router()


@router.message(Command("start"))
async def start(message: types.Message):
    await message.answer(text="Hello, I am your bot!")


@router.message(Command("get_id"))
async def get_topic_id(message: types.Message):
    if message.message_thread_id:
        # Убираем явное указание message_thread_id
        await message.answer(f"ID этой темы: {message.message_thread_id}")
    else:
        await message.answer("Это сообщение не из темы")


dp.include_router(router)


async def main():
    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())
