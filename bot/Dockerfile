FROM python:3.11-slim
WORKDIR /app

RUN pip install --no-cache-dir poetry

COPY pyproject.toml poetry.lock ./
RUN poetry config virtualenvs.create false && \
    poetry install --only main --no-root

COPY . .

EXPOSE 8001
# Required env vars: TOKEN_BOT, BOT_SERVICE_SECRET
# Optional: DJANGO_API_URL (default: http://localhost:8000/api)
CMD ["python", "run.py"]
