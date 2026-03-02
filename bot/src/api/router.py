from fastapi import APIRouter

from src.api.routes import health, messages

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(messages.router, tags=["messages"])
