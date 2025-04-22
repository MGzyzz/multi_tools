import os
from multiprocessing import Process
from dotenv import load_dotenv
import asyncio
from fastapi import FastAPI, Request
import uvicorn
from aiogram import Bot, Dispatcher, types, Router
from aiogram.filters import Command
from contextlib import asynccontextmanager

# Загрузка переменных окружения
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ENV_PATH = os.path.join(BASE_DIR, '..', '.env')
load_dotenv(dotenv_path=ENV_PATH)

TOKEN = os.getenv("TOKEN_BOT")

# Функция для запуска бота в отдельном процессе
def run_bot():
    async def bot_main():
        bot = Bot(token=TOKEN)
        dp = Dispatcher()
        router = Router()

        @router.message(Command('start'))
        async def start(message: types.Message):
            await message.answer(text="Hello, I am your bot!")

        @router.message(Command('get_id'))
        async def get_topic_id(message: types.Message):
            if message.message_thread_id:
                await message.answer(f"ID этой темы: {message.message_thread_id}")
            else:
                await message.answer("Это сообщение не из темы")
        @router.message(Command('get_chat_id'))
        async def get_chat_id(message: types.Message):
            if message.chat.id:
                await message.answer(f"ID этого чата: {message.chat.id}")
            else:
                await message.answer("Это сообщение не из чата")

        dp.include_router(router)
        
        try:
            print("Bot started!")
            await dp.start_polling(bot)
        finally:
            await bot.session.close()
            print("Bot stopped!")

    asyncio.run(bot_main())

# Создание контекста жизненного цикла для FastAPI
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Код выполняется при запуске
    bot = Bot(token=TOKEN)
    yield
    # Код выполняется при завершении
    await bot.session.close()
    print("FastAPI bot session closed")

# Создание FastAPI приложения с использованием lifespan
app = FastAPI(lifespan=lifespan)
bot = Bot(token=TOKEN)

@app.post('/send_message')
async def send_message(request: Request):
    data = await request.json()
    recipient = data.get("recipient")
    subject = data.get('subject')
    message = data.get('message')
    urgent = data.get('urgent', False)
    thread_id = data.get('thread_id')  # ID темы

    final_message = f"Subject: {subject}\nMessage: {message}"
    if urgent:
        final_message = f"<b>Urgent!</b>\n{final_message}"

    print('Final', recipient)
    
    if thread_id:
        await bot.send_message(
            chat_id=int(recipient), 
            text=final_message, 
            message_thread_id=int(thread_id)
        )
    else:
        await bot.send_message(chat_id=int(recipient), text=final_message)

    return {"status": "message sent"}

@app.get('/status')
async def check_bot_status():
    try:
        await bot.get_me()
        return {"status": "active"}
    except Exception as e:
        print(f"[check_bot_status] Ошибка подключения к боту: {e}")
        return {"status": "inactive"}

@app.post('/send_message_thread_bot')
async def send_message_thread_bot(request: Request):
    data = await request.json()
    group_id = data.get("group_id")
    subject = data.get('subject')
    message = data.get('message')
    thread_id = data.get('thread_id')
    final_message = f"Subject: {subject}\nMessage: {message}"
    await bot.send_message(
        chat_id=int(group_id), 
        text=final_message, 
        message_thread_id=int(thread_id)
    )
    return {"status": "message sent"}
    


# Запуск приложения
if __name__ == "__main__":
    # Запуск бота в отдельном процессе
    bot_process = Process(target=run_bot)
    bot_process.start()
    
    # Запуск FastAPI в основном процессе
    try:
        uvicorn.run(app, host="0.0.0.0", port=8001)
    finally:
        # При завершении FastAPI останавливаем процесс бота
        if bot_process.is_alive():
            bot_process.terminate()
            bot_process.join()
            print("Bot process terminated")