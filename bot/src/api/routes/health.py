from fastapi import APIRouter, Depends

from src.api.dependencies import get_telegram_service
from src.schemas.messages import BotStatusResponse
from src.services.telegram import TelegramService

router = APIRouter()


@router.get("/status", response_model=BotStatusResponse)
async def get_status(
    telegram_service: TelegramService = Depends(get_telegram_service),
) -> BotStatusResponse:
    return BotStatusResponse(status=await telegram_service.status())
