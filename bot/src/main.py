from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.api.router import api_router
from src.core.config import settings
from src.services.telegram import TelegramService


@asynccontextmanager
async def lifespan(app: FastAPI):
    telegram_service = TelegramService(
        token=settings.token_bot,
        enable_polling=settings.enable_polling,
    )
    app.state.telegram_service = telegram_service
    await telegram_service.start()
    try:
        yield
    finally:
        await telegram_service.stop()


def create_app() -> FastAPI:
    app = FastAPI(title=settings.app_name, lifespan=lifespan)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(api_router)
    return app


app = create_app()
