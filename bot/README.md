# Telegram Bot Service (FastAPI)

Отдельный сервис Telegram-бота, вынесенный из `back_end`.

## Запуск

```bash
cd bot
poetry install
poetry run uvicorn src.main:app --host 0.0.0.0 --port 8001
```

Сервис автоматически подхватывает переменные окружения из:

1. `../back_end/.env`
2. `./.env`

Минимально нужен `TOKEN_BOT`.
