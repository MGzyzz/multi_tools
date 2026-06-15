# Lectern — AI-ассистент преподавателя

![CI](https://github.com/MGzyzz/multi_tools/actions/workflows/ci.yml/badge.svg)

**Lectern** — рабочее пространство преподавателя: управление группами, студентами,
расписанием и посещаемостью, в том числе автоматическая отметка по распознаванию лица.
Позиционируется как B2B-плагин, дополняющий существующие образовательные платформы
(например, Platonus).

Дипломный проект. Ключевые цели:

1. Распознавание лиц + автоматическая отметка посещаемости
2. Система уведомлений (email + Telegram)
3. Аналитика — выявление студентов в зоне риска по посещаемости
4. Интеграционный API для внешних платформ (вебхуки)

---

## Структура репозитория

```
multi_tools/
├── back_end/      # Django REST API (порт 8000)
├── front_end/     # Активный фронтенд: React 19 + TanStack Router (порт 8080)
├── ai/            # FastAPI сервис распознавания лиц: YOLOv8 + FaceNet (порт 8002)
├── bot/           # Telegram-бот (порт 8001)
└── docker-compose.yml
```

> Активный фронтенд — **`front_end/`**. (Каталог `old_front_end/` был легаси и удалён.)

---

## Быстрый старт (Docker Compose)

Запускает весь стек: Django, React, AI-сервис, Telegram-бот, PostgreSQL, Redis,
Celery worker и beat.

```bash
git clone git@github.com:MGzyzz/multi_tools.git
cd multi_tools

# Заполните back_end/.env (см. требуемые переменные ниже), затем:
docker compose up -d --build
```

Сервисы после запуска:

| Сервис | URL |
|---|---|
| Backend API | http://localhost:8000 |
| Frontend | http://localhost:8080 |
| AI-сервис | http://localhost:8002 |
| Swagger-документация | http://localhost:8000/swagger |

> Фронтенд собирается в образ (`COPY`, без монтирования исходников) и запускается
> через `vite dev` — после изменений во фронтенде нужен пересбор:
> `docker compose up -d --build frontend`. Бэкенд монтирует `./back_end:/app`,
> но запускается без авто-перезагрузки — после правок перезапустите `app`
> (и `celery`, если меняли задачи): `docker compose restart app celery`.

---

## Демо-данные

```bash
# Расписание на текущую неделю для существующего преподавателя
docker compose exec app python manage.py seed_demo

# Два демо-преподавателя ИТ со студентами, расписанием и статистикой
# (логины it_teacher1 / it_teacher2, пароль demo12345)
docker compose exec app python manage.py seed_demo_teachers
```

---

## Локальный запуск бэкенда (без Docker)

Требуется Python 3.11+ и [Poetry](https://python-poetry.org/docs/#installation).
Нужны запущенные PostgreSQL и Redis.

```bash
cd back_end
poetry install
poetry shell

python manage.py migrate
python manage.py loaddata core/fixtures/dump.json   # опционально: данные из фикстур
python manage.py runserver
```

Создание суперпользователя:

```bash
python manage.py createsuperuser
```

Установка pre-commit хуков (ruff):

```bash
poetry run pre-commit install
```

---

## Поддержка

Вопросы — в [документацию](http://localhost:8000/swagger) или разработчику в
Telegram: [@MGzyzz](https://t.me/MGzyzz)

### QR Telegram

![back_end/media/mgzyzz.png](back_end/media/mgzyzz.png)
