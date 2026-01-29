FROM python:3.11-slim

WORKDIR /app

ENV POETRY_VERSION=1.7.1 \
    POETRY_VIRTUALENVS_CREATE=false \
    POETRY_NO_INTERACTION=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN pip install --no-cache-dir "poetry==$POETRY_VERSION"

# Сначала только файлы зависимостей (для кеша слоёв)
COPY pyproject.toml poetry.lock* ./

# Если у тебя есть группы (dev/test), можно ставить только main:
# RUN poetry install --no-root --only main
RUN poetry install --no-root

# Потом код
COPY . .

EXPOSE 8000

CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]