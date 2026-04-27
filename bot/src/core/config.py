from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

PROJECT_ROOT = Path(__file__).resolve().parents[3]
BACKEND_ENV_FILE = PROJECT_ROOT / "back_end" / ".env"
BOT_ENV_FILE = PROJECT_ROOT / "bot" / ".env"

for env_file in (BACKEND_ENV_FILE, BOT_ENV_FILE):
    if env_file.exists():
        load_dotenv(env_file, override=False)


class Settings(BaseSettings):
    app_name: str = "Telegram Bot Service"
    app_host: str = "0.0.0.0"
    app_port: int = 8001
    cors_origins: list[str] = Field(default_factory=lambda: ["http://localhost:5173"])
    token_bot: str = Field(..., alias="TOKEN_BOT")
    enable_polling: bool = Field(default=True, alias="ENABLE_POLLING")
    django_api_url: str = Field(
        default="http://localhost:8000/api", alias="DJANGO_API_URL"
    )
    bot_service_secret: str = Field(default="", alias="BOT_SERVICE_SECRET")

    model_config = SettingsConfigDict(extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
