# CLAUDE.md — Инструкции для AI-ассистента

## Git-правила (ОБЯЗАТЕЛЬНО)

**Коммиты делаются только от имени разработчика. Никаких упоминаний Claude, AI или Anthropic в авторстве, подписях и теле коммита.**

- НЕ добавлять `Co-Authored-By: Claude` или любые подобные строки
- НЕ добавлять `🤖 Generated with Claude Code` и подобные пометки
- Сообщение коммита должно выглядеть так, будто его написал разработчик
- Формат: `git commit -m "краткое описание изменений"`

---

## Стек технологий

### Frontend (front_end/)
| Категория | Технология | Версия |
|-----------|-----------|--------|
| Framework | React | 19.0.0 |
| Routing | React Router | 7.5.3 |
| Build Tool | Vite + SWC | 6.3.1 |
| Styling | Tailwind CSS | 4.1.18 |
| HTTP Client | Axios | 1.8.4 |
| Face Detection | MediaPipe FaceMesh | 0.4.x |
| Icons | Lucide React | 0.562.0 |
| Animations | Motion | 12.23.26 |
| Charts | Recharts | 3.6.0 |
| Notifications | react-toastify | 11.0.5 |

### AI-модуль (ai/)
| Категория | Технология |
|-----------|-----------|
| Framework | FastAPI + uvicorn (порт 8002) |
| Face Detection | YOLOv8 (ultralytics) |
| Face Recognition | FaceNet (facenet-pytorch, InceptionResnetV1/vggface2) |
| Embedding Compare | PyTorch cosine_similarity |
| Computer Vision | OpenCV |
| Visualization | UMAP + matplotlib |

---

## Структура проекта

```
multi_tools/
├── front_end/                     ← React-приложение
│   ├── CLAUDE.md                  ← этот файл
│   ├── .env                       ← переменные окружения (не коммитить)
│   ├── package.json
│   ├── vite.config.js
│   ├── eslint.config.js
│   ├── index.html
│   ├── public/
│   └── src/
│       ├── main.jsx               ← точка входа React
│       ├── App.jsx                ← корневой компонент с роутингом
│       ├── index.css              ← глобальные стили + Tailwind
│       ├── api/                   ← слой API-запросов
│       │   ├── api.js             ← axios base config + interceptors (401, refresh)
│       │   ├── authAPI.js         ← логин, логаут, refresh token, профиль
│       │   ├── notificationAPI.js ← WebSocket уведомления
│       │   ├── getGroupList.js
│       │   ├── getGroupStudentList.js
│       │   ├── getDetailGroup.js
│       │   ├── getAttendanceGroup.js
│       │   ├── getDetailSchedule.js
│       │   ├── getScheduleGroupId.js
│       │   ├── getScheduleList.js
│       │   ├── getSubjectGroup.js
│       │   ├── createGroup.js
│       │   ├── createStudent.js
│       │   ├── editStudent.js
│       │   ├── editProfile.js
│       │   ├── editAttendance.js
│       │   ├── getAllStudentGroup.js
│       │   ├── getStudentList.js
│       │   ├── getStudentByUsername.js
│       │   ├── sendPhotoAI.js     ← отправка фото на распознавание
│       │   ├── checkAttendanceUseAI.js
│       │   ├── getStatusAI.js
│       │   ├── getResultAttendaceAI.js
│       │   └── statusBotTelegram.js
│       └── components/
│           ├── Auth/              ← страница логина
│           ├── Layout/            ← основной шелл: сайдбар, хедер, уведомления
│           ├── Home/              ← дашборд с расписанием
│           ├── GroupManagement/   ← управление группами и студентами
│           ├── Attendance/        ← AI-распознавание лиц для посещаемости
│           │   ├── Attendance.jsx (710+ строк — нужно дробить)
│           │   ├── AttendanceCamera.jsx
│           │   ├── AttendanceHeader.jsx
│           │   ├── AttendanceStudentsList.jsx
│           │   ├── FuturisticFrameOnly.jsx
│           │   └── attendanceUtils.js
│           ├── Analytics/         ← аналитика (пока на моковых данных)
│           ├── TeacherProfile/    ← редактирование профиля преподавателя
│           ├── Tools/             ← вспомогательные инструменты (placeholder)
│           ├── SubjectGroup/      ← выбор предмета для группы
│           ├── AddGroupModal/
│           ├── AddStudentModal/
│           ├── EditStudentModal/
│           └── Loader/            ← спиннеры и skeleton-карточки
│
├── ai/                            ← Python AI-сервис (FastAPI, порт 8002)
│   ├── main.py                    ← FastAPI app + камера + распознавание
│   ├── generate_embeddings.py     ← генерация .npy из папки faces_db
│   ├── backend_integration.py     ← отправка результата на backend (не используется в main.py)
│   ├── test_camera.py             ← отладочный скрипт камеры
│   ├── requirements.txt
│   ├── detection/
│   │   └── yolo_detector.py       ← обёртка YOLOv8 (детекция лиц, cls==0)
│   ├── recognition/
│   │   ├── facenet_model.py       ← FaceEmbedder (InceptionResnetV1)
│   │   └── matcher.py             ← FaceMatcher (cosine distance, не используется в main.py)
│   ├── utils/
│   │   ├── compare_faces.py       ← find_best_match (cosine similarity через torch)
│   │   ├── image_tools.py         ← crop_face (одна функция)
│   │   ├── log_similarity.py      ← сохранение PNG-графика схожести
│   │   └── visualize_embeddings.py← UMAP-визуализация эмбеддингов
│   └── ai/data/                   ← данные (не коммитить бинарники)
│       ├── embeddings.npy         ← база эмбеддингов
│       ├── faces_db/              ← фото пользователей (user_1/, user_2/, ...)
│       ├── analytics/             ← PNG-логи схожести
│       └── yolo_models/           ← yolov8n.pt
│
└── back_end/                      ← Django backend (порт 8000)
```

---

## Архитектурные решения

### Frontend — Роутинг и авторизация
- `ProtectedRoute` определён **вне** `App` в `App.jsx`, принимает `authenticated` как prop
- Маршруты: `/login`, `/`, `/groups`, `/attendance`, `/analytics`, `/profile`, `/tools`
- Тема (dark/light) хранится в localStorage и применяется к `document.documentElement`

### Frontend — API слой
- Все запросы должны идти через настроенный клиент из `src/api/api.js`
- `api.js`: на 401 автоматически делает refresh и повторяет запрос
- **НЕ использовать** raw `axios` напрямую — только экспортируемые инстансы:
  - `api` (default) — backend Django (порт 8000), с auth-interceptors
  - `aiApi` — AI-сервис FastAPI (порт 8002), без auth
  - `botApi` — Telegram-бот (порт 8001), без auth
- URL сервисов определяется через `.env`:
  - `VITE_DEBUG` + `VITE_NGROK_PATH` — backend
  - `VITE_AI_PATH` — AI-сервис
  - `VITE_BOT_PATH` — бот

### AI-модуль — Поток распознавания
1. POST `/check_attendance_use_ai` → запускает `recognize_faces()` в фоне
2. Камера захватывает кадры → YOLO детектирует лица
3. FaceNet генерирует эмбеддинг → cosine similarity с базой (`embeddings.npy`)
4. При 8 последовательных совпадениях (порог 0.70) → результат сохраняется
5. GET `/get_recognition_result` → отдаёт username → запрашивает ID у backend (localhost:8000)
6. POST `/recognize_from_image` → альтернативный endpoint для фото без камеры

### AI — USERNAME_MAPPING
Жёстко прописан в `main.py`. При добавлении пользователя нужно добавить маппинг:
```python
USERNAME_MAPPING = {
    "user_1": "dmitriy",
    "user_2": "admin",
}
```

---

## Все недостатки проекта

### КРИТИЧЕСКИЕ

| # | Статус | Проблема | Где | Последствие |
|---|--------|---------|-----|-------------|
| 1 | ✅ ИСПРАВЛЕНО | **Захардкоженные URL** `http://localhost:8000` | `getDetailGroup.js`, `getAttendanceGroup.js`, `getStatusAI.js`, `checkAttendanceUseAI.js` — теперь через `api`/`aiApi`/`botApi` + env vars | Сломается в Docker/продакшне |
| 2 | ✅ ИСПРАВЛЕНО | **Нет Error Boundaries** | Добавлен `ErrorBoundary.jsx`, обёрнут в `main.jsx` | Падение одного компонента обрушит всё приложение |
| 3 | ❌ ОТКРЫТО | **USERNAME_MAPPING захардкожен** | `ai/main.py:79` | При добавлении студента нужно вручную редактировать код |
| 4 | ❌ ОТКРЫТО | **`matcher.py` не используется** | `ai/recognition/matcher.py` | Дублирует логику `compare_faces.py`, создаёт путаницу |

### ВЫСОКИЕ

| # | Статус | Проблема | Где |
|---|--------|---------|-----|
| 5 | ✅ ИСПРАВЛЕНО | Часть API-файлов использует сырой `axios` вместо `api` | Все файлы переведены на `api`/`aiApi`/`botApi` из `api.js` |
| 6 | ❌ ОТКРЫТО | `Attendance.jsx` — 710+ строк, всё в одном файле | Сложно поддерживать, тестировать |
| 7 | ❌ ОТКРЫТО | `GroupManagement.jsx` — 600+ строк | Нужно дробить |
| 8 | ❌ ОТКРЫТО | Нет тестов (ни frontend, ни AI) | Весь проект |
| 9 | ❌ ОТКРЫТО | Токены в localStorage уязвимы к XSS | `authAPI.js` |
| 10 | ❌ ОТКРЫТО | WebSocket URL содержит токен в query string | `notificationAPI.js` — токен виден в логах/сниффере |
| 11 | ❌ ОТКРЫТО | `backend_integration.py` не подключён к `main.py` | Мёртвый код с неверным URL (порт 8002 вместо 8000) |
| 12 | ❌ ОТКРЫТО | `image_tools.py` (`crop_face`) нигде не используется | Мёртвый код |

### СРЕДНИЕ

| # | Статус | Проблема | Где |
|---|--------|---------|-----|
| 13 | ❌ ОТКРЫТО | `Analytics.jsx` работает на моковых данных | Не подключена к API |
| 14 | ❌ ОТКРЫТО | `Tools.jsx` — почти пустой placeholder | Большинство функций не реализованы |
| 15 | ❌ ОТКРЫТО | `TeacherProfile.jsx` — большинство полей закомментированы | Неполная реализация |
| 16 | ✅ ИСПРАВЛЕНО | `ProtectedRoute` определён внутри компонента `App` | Вынесен за пределы `App`, принимает `authenticated` как prop |
| 17 | ❌ ОТКРЫТО | Polling уведомлений каждые 3 секунды в `Layout.jsx` | Лишние запросы к серверу |
| 18 | ❌ ОТКРЫТО | `let mounted = true` паттерн устарел | Нужен `AbortController` |
| 19 | ❌ ОТКРЫТО | Нет reconnect-логики для WebSocket | Потеря уведомлений при обрыве |
| 20 | ❌ ОТКРЫТО | `generate_embeddings.py` не предобрабатывает изображения | Могут быть несоответствия с runtime-потоком (resize/RGB делается в main.py, но не при генерации) |
| 21 | ❌ ОТКРЫТО | `log_similarity` сохраняет PNG на каждое распознавание | Диск засоряется при частом использовании |
| 22 | ❌ ОТКРЫТО | Камера захардкожена: `cv2.VideoCapture(1)` | Может не работать на других машинах |
| 23 | ❌ ОТКРЫТО | `console.log` в production-коде | `Home.jsx` и другие |

### НИЗКИЕ

| # | Статус | Проблема | Где |
|---|--------|---------|-----|
| 24 | ❌ ОТКРЫТО | Magic numbers: пороги 0.75, 0.70, 8 кадров | `main.py` — не вынесены в конфиг/env |
| 25 | ❌ ОТКРЫТО | Нет `__init__.py` в `detection/`, `recognition/`, `utils/` | Нет явной пометки Python-пакетов |
| 26 | ❌ ОТКРЫТО | Бинарники в git: `embeddings.npy`, `yolov8n.pt`, PNG-аналитика | Надо добавить в `.gitignore` |
| 27 | ❌ ОТКРЫТО | `vite.config.js`: `allowedHosts: true` | Слишком разрешительно |
| 28 | ❌ ОТКРЫТО | Нет lazy-loading для роутов | Вся бандла грузится сразу |
| 29 | ❌ ОТКРЫТО | Нет debounce на поиске студентов | Лишние ре-рендеры |
| 30 | ✅ ИСПРАВЛЕНО | Дублирующий import `Attendance` в `App.jsx` | Удалён дублирующий импорт `AttendanceScanning` |

---

---

## Замечания — Backend (`back_end/`)

### КРИТИЧЕСКИЕ

| # | Проблема | Файл | Последствие |
|---|---------|------|-------------|
| B1 | **`SECRET_KEY` захардкожен** | `core/settings.py:29` | Любой с доступом к репо может подделать JWT-токен |
| B2 | **`DEBUG = True` статически** | `core/settings.py:32` | В продакшне показывает traceback с внутренностями сервера |
| B3 | **`CORS_ALLOW_ALL_ORIGINS = True`** | `core/settings.py:50` | Любой сайт может делать запросы от имени пользователя (CSRF) |
| B4 | **Пароль БД — `123`** | `.env`, `docker-compose.yml:10` | При открытом порту PostgreSQL — мгновенная компрометация |
| B5 | **Сломанный Excel-экспорт** | `app/utils/tools.py:18` | `mark_set` — несуществующая связь, endpoint упадёт с `AttributeError` |
| B6 | **Нет валидации загружаемых файлов** | `api/views/studentAPI.py:64` | Можно загрузить 500MB или исполняемый файл вместо фото |

### ВЫСОКИЕ

| # | Проблема | Файл |
|---|---------|------|
| B7 | **Опечатка в поле модели:** `face_embadding` → должно быть `face_embedding` | `app/models/studentModels.py:19` |
| B8 | **Опечатка в поле модели:** `presense` → должно быть `presence` | `app/models/аttendanceModels.py:18` |
| B9 | **Опечатка в поле модели:** `readt_at` → должно быть `read_at` | `app/models/notificationModels.py:31` |
| B10 | **Кириллица в именах файлов** | `аttendanceModels.py`, `аttendanceStatModels.py` — буква «а» кириллическая, непереносимо |
| B11 | **Нет rate limiting** | Все endpoints — `/api/token/` можно брутфорсить бесконечно |
| B12 | **Опечатка в ключе кеша: `cahce_key`** | `api/views/groupAPI.py:114` — инвалидация кеша не работает |
| B13 | **Нет пагинации на `/api/get_students_list/`** | `api/views/studentAPI.py:23` — при 500+ студентах OOM/таймаут |
| B14 | **`print()` вместо `logging`** | `api/views/scheduleAPI.py:26,28,35`, `app/views.py:31,36` |
| B15 | **Захардкоженный NGROK домен** | `core/settings.py` — конкретный tunnel ID в коде |

### СРЕДНИЕ

| # | Проблема | Файл |
|---|---------|------|
| B16 | **Signal handlers без `transaction.atomic()`** | `app/signals.py` — Schedule создан, но Attendance не создана при ошибке |
| B17 | **Нет exponential backoff при запросах к Bot/AI** | `app/tasks.py` — 5 сек таймаут, нет retry-стратегии |
| B18 | **Нет валидации порогов в `NotificationPreference`** | `api/serializer.py` — можно установить `threshold_percent = -50` или `999` |
| B19 | **TODO-комментарии в рабочем коде** | `accounts/models/userProfileModels.py`, `roleChoices.py`, `studentAPI.py` |
| B20 | **WebSocket consumer без обработки ошибок** | `api/consumers.py` — `DoesNotExist` на отсутствующем профиле роняет WS |
| B21 | **Нет аудит-лога критических операций** | Нигде — невозможно узнать кто изменил посещаемость |
| B22 | **Смесь русского и английского в комментариях** | По всему проекту |

### НИЗКИЕ

| # | Проблема | Файл |
|---|---------|------|
| B23 | **Нет docstrings на API views** | Все `views/` — нельзя auto-генерировать Swagger |
| B24 | **Тест-файлы есть, но большинство пустые** | `api/tests/` — core-логика не покрыта |
| B25 | **Нет валидации в `StudentSerializer`** | `api/serializer.py` — в отличие от `GroupSerializer` |

---

## Соглашения по коду

### Frontend
- Функциональные компоненты + хуки (без классовых компонентов)
- Каждый компонент в отдельной папке: `ComponentName/ComponentName.jsx`
- CSS-файл рядом с компонентом (если нужны кастомные стили)
- Tailwind — основной способ стилизации
- Все новые API-функции — через `api` из `api.js`, не через сырой axios
- `console.log` убирать перед коммитом

### AI-модуль
- Все пути — через переменные или аргументы, не хардкодить
- Новые пользователи: добавлять папку в `faces_db/`, запускать `generate_embeddings.py`, добавлять в `USERNAME_MAPPING`
- Пороги распознавания (`SIMILARITY_THRESHOLD`, `CONFIDENCE_SAMPLES`) менять только осознанно

### Backend
- Все секреты — только через `os.getenv()`, никаких значений прямо в коде
- `print()` не использовать — только `logger = logging.getLogger(__name__)`
- Мульти-шаговые операции с БД оборачивать в `transaction.atomic()`
- Новые endpoints обязательно с пагинацией если возвращают список
