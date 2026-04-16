# Handoff: System Of Risk Notifications

## Контекст

Задача: построить систему рассылок для студентов с упором не на "просто уведомления", а на управляемые риск-инциденты.

Ключевые требования, которые были заложены в реализацию:

- риск студента должен быть отдельной доменной сущностью, а не только текстом письма;
- уведомление студенту должно отправляться один раз при первом срабатывании порога;
- после этого система должна хранить состояние реакции преподавателя;
- преподаватель должен иметь возможность подтвердить реакцию, эскалировать инцидент и закрыть его;
- формат email вида `12345@iitu.edu.kz` должен поддерживаться;
- факт отправки уведомления должен продолжать фиксироваться через существующий слой `NotificationModels` + `NotificationDelivery`.

## Почему архитектура изменена именно так

До изменений в проекте уже были:

- `NotificationModels`
- `NotificationDelivery`
- `NotificationPreference`
- локальная логика оповещения по посещаемости

Но этого было недостаточно для нового бизнес-процесса, потому что:

- уведомление было "событием", а не "инцидентом";
- защита от дублей была только "не отправлять второй раз сегодня";
- не было аудита действий преподавателя;
- не было статусов `OPEN / ACKNOWLEDGED / ESCALATED / RESOLVED`;
- не было сущности, на которую можно безопасно навесить эскалацию.

Поэтому была выбрана схема:

1. `RiskIncident` как источник истины для риска.
2. `TeacherRiskIncidentAction` как журнал действий по инциденту.
3. `NotificationModels` и `NotificationDelivery` остаются транспортным/историческим слоем доставки.

Идея: письмо студенту не является главным объектом. Главный объект теперь риск-инцидент, а письмо только первый внешний сигнал об этом инциденте.

## Что реализовано

### 1. Новые choices

Добавлены новые перечисления:

- `app/models/_choices/riskIncidentChoices.py`
- `app/models/_choices/riskIncidentStatusChoices.py`
- `app/models/_choices/riskIncidentActionChoices.py`

Назначение:

- типы риска: `ATTENDANCE`, `ACADEMIC`, `PAYMENT`, `GENERAL`
- статусы: `OPEN`, `ACKNOWLEDGED`, `ESCALATED`, `RESOLVED`
- действия: `OPENED`, `ACKNOWLEDGED`, `ESCALATED`, `RESOLVED`

Также расширен `NotificationTypeChoices` значением `RISK_INCIDENT`.

### 2. Новые модели

Добавлен файл:

- `app/models/riskIncidentModels.py`

Модели:

#### `RiskIncident`

Хранит:

- студента;
- ответственного преподавателя;
- преподавателя, на которого сделана эскалация;
- группу и предмет;
- тип инцидента;
- код причины;
- проблему и текст причины;
- метрику, текущее значение, порог, единицу измерения;
- `payload`;
- дату первого и последнего обнаружения;
- срок исправления;
- факт первой отправки уведомления;
- даты подтверждения, эскалации и решения;
- уровень эскалации.

#### `TeacherRiskIncidentAction`

Хранит:

- инцидент;
- преподавателя;
- тип действия;
- комментарий;
- дополнительные данные;
- дату действия.

### 3. Сервис риск-инцидентов

Добавлен файл:

- `app/utils/risk_incidents.py`

Основные функции:

- `upsert_student_risk_incident(...)`
- `sync_attendance_risk_incident(...)`
- `acknowledge_risk_incident(...)`
- `escalate_risk_incident(...)`
- `resolve_risk_incident(...)`

Что делает сервис:

- ищет уже открытый инцидент того же типа/причины/контекста;
- не создаёт дубль, если проблема уже открыта;
- отправляет студенту первое уведомление только если `notification_sent_at` ещё пустой;
- автоматически закрывает attendance-инцидент, если метрика вернулась выше порога;
- пишет историю действий преподавателя.

### 4. Новое бизнес-правило для посещаемости

Изменены:

- `app/utils/attendance_tools.py`
- `app/signals.py`

Теперь логика посещаемости работает так:

- если процент ниже порога, создаётся или обновляется `RiskIncident`;
- студент получает первое письмо один раз на открытый инцидент;
- если показатель дальше ухудшается, инцидент обновляется, но письмо не дублируется;
- если показатель восстанавливается, инцидент закрывается автоматически.

Это заменяет старое правило "не отправлять повторно в тот же день".

### 5. API для преподавателя

Добавлен файл:

- `api/views/riskIncidentAPI.py`

Подключены сериализаторы и роуты:

- `api/serializer.py`
- `api/views/__init__.py`
- `api/urls.py`

Новые endpoint:

- `GET /risk-incidents/`
- `GET /students/<student_id>/risk-incidents/`
- `POST /risk-incidents/<incident_id>/acknowledge/`
- `POST /risk-incidents/<incident_id>/resolve/`
- `POST /risk-incidents/<incident_id>/escalate/`

Назначение:

- получить очередь риск-инцидентов преподавателя;
- получить историю инцидентов по конкретному студенту;
- подтвердить реакцию;
- закрыть инцидент;
- эскалировать инцидент другому преподавателю.

### 6. Исправлен Telegram-контракт между backend и bot

Изменены:

- `app/tasks.py`
- `bot/src/api/routes/messages.py`
- `bot/src/schemas/messages.py`
- `bot/src/services/telegram.py`

Что было не так:

- backend отправлял payload, который не соответствовал контракту FastAPI bot-сервиса;
- provider `message_id` не возвращался в нормализованном виде.

Что теперь:

- backend отправляет в bot запрос на `/send_message`;
- используется поле `recipient`, а не старый конфликтный формат;
- поддерживаются и `telegram_id`, и username;
- bot возвращает `message_id`, который сохраняется в `NotificationDelivery.provider_message_id`.

### 7. Переработан student email

Изменены:

- `app/tasks.py`
- `app/utils/risk_incidents.py`
- `app/templates/emails/student_risk_notification.html`
- `app/templates/emails/generic_notification.html`

Что было не так:

- студенту уходил слишком сухой и технический plain-text;
- письмо выглядело как служебный лог, а не как уведомление системы;
- формулировки были недостаточно понятными и человечными.

Что сделано:

- добавлен HTML email-шаблон для risk-инцидентов;
- добавлен общий HTML fallback-шаблон для остальных email;
- student message переписан в более понятный и мягкий тон;
- в payload уведомления добавлены данные для рендера письма: предмет, группа, срок, показатель, порог, контакт.

### 8. Автосоздание NotificationPreference для новых студентов

Изменён:

- `app/signals.py`

Что сделано:

- при создании `Student` автоматически создаётся `NotificationPreference`;
- `allow_email` включается сразу;
- `allow_telegram` включается только если у студента есть `telegram_id` или `telegram_username`.

Почему так:

- чтобы не заводить preference вручную;
- чтобы email-канал начинал работать сразу после добавления студента;
- чтобы не плодить лишние Telegram-failures у студентов без Telegram.

Важно:

- это покрывает только новых студентов;
- для уже существующих студентов добавлена команда:
  `python manage.py backfill_notification_preferences`

### 9. Admin-поддержка

Изменён:

- `app/admin.py`

Добавлено:

- отображение `RiskIncident` в Django admin;
- inline-история `TeacherRiskIncidentAction`.

Это нужно, чтобы система была операбельна даже без отдельного фронтового экрана.

### 10. Тесты

Добавлены:

- `api/tests/test_risk_incident_service.py`
- `api/tests/test_risk_incident_api.py`

Обновлён:

- `api/tests/test_notification_delivery_tasks.py`

Что покрыто:

- создание одного attendance-инцидента без дублей;
- одноразовая отправка студенту на открытый инцидент;
- автоматическое закрытие после восстановления метрики;
- API подтверждения, эскалации и закрытия;
- новый контракт Telegram-доставки;
- допустимость email вида `12345@iitu.edu.kz`.

## Поддержка email формата `12345@university-domain`

Отдельной жёсткой валидации под этот формат не добавлялось, потому что текущий `EmailField` уже корректно принимает такой адрес.

Пример:

- `12345@iitu.edu.kz`

Что важно понимать:

- это синтаксически валидный email;
- система принимает его;
- фактическая доставляемость зависит уже от SMTP/почтовой инфраструктуры университета.

Если в будущем потребуется разрешать только университетские домены, это нужно делать отдельным allowlist-валидатором.

## Что специально НЕ делалось

### 1. Миграции не редактировались вручную

По прямому требованию пользователя миграции не трогались.

Важно:

- модели и код под них уже добавлены;
- итоговые миграции должен сгенерировать и применить пользователь локально.

В рабочем дереве уже может лежать untracked миграция:

- `app/migrations/0035_alter_notificationmodels_event_type_riskincident_and_more.py`

Она не редактировалась в рамках этой реализации. Следующему агенту нельзя предполагать, что она корректна автоматически. Её нужно проверить после локального `makemigrations`.

### 2. Academic и payment risk как автоматические потоки пока не реализованы

В choices типы уже есть:

- `ACADEMIC`
- `PAYMENT`

Но автоматическое выявление для них ещё не встроено.

Причина:

- в текущем проекте нет полноценной рабочей модели платежей;
- текущая модель оценок не участвует в рабочем процессе и по сути отключена.

Иными словами:

- доменный каркас уже готов;
- attendance уже переведён;
- academic/payment можно добавить поверх того же сервиса, когда появятся реальные источники данных.

### 3. Magic MCP в текущей сессии недоступен

Пользователь просил посмотреть `magic mcp` для email-дизайна.

Факт:

- в текущей сессии доступен `figma` MCP;
- `magic mcp` недоступен.

Поэтому email-дизайн был реализован напрямую кодом через Django templates.

## Что важно следующему агенту

### 1. Не возвращать старую модель "уведомление = инцидент"

Вся ценность текущей реализации в том, что:

- инцидент живёт отдельно от письма;
- письмо студенту одноразовое;
- действия преподавателя ведутся по инциденту.

Если снова начать строить логику прямо на `NotificationModels`, дубли и слом бизнес-процесса вернутся.

### 2. Attendance-инциденты завязаны на контекст `(student, incident_type, reason_code, group, subject)`

Это важно для антидублирования.

Именно по этому набору ищется уже существующий открытый инцидент.

Если менять это правило, можно случайно начать:

- плодить дубли по одному предмету;
- или наоборот склеивать разные проблемы в один инцидент.

### 3. Telegram-контракт уже исправлен, его не надо "откатывать"

Актуальная логика:

- backend вызывает `/send_message`;
- bot принимает `recipient`;
- `recipient` может быть `int` или `str`;
- bot возвращает `message_id`.

Если кто-то потом вернёт старый контракт через `chat_id/group_id` в неподходящей форме, доставки снова будут вести себя нестабильно.

### 4. Проверки и прогоны не были финализированы

По инструкции пользователя в конце проверки были пропущены.

Ранее было установлено:

- синтаксически изменённые файлы компилируются через `compile(...)`;
- полноценный `manage.py check` в среде упирался в локальную зависимость `colorlog` ещё до загрузки проекта;
- полноценный запуск тестов не выполнялся.

Следующему агенту после генерации миграций желательно сделать:

1. `makemigrations`
2. `migrate`
3. запуск целевых тестов по risk-incident API/service
4. smoke-test Telegram и email доставки

### 5. Email-шаблон теперь часть продукта

Сейчас логика такая:

- plain text остаётся как fallback;
- HTML-версия собирается в `app/tasks.py`;
- для risk-писем используется отдельный шаблон `emails/student_risk_notification.html`.

Если дальше менять коммуникацию со студентом, менять нужно:

- `app/utils/risk_incidents.py` для смысла и текста;
- `app/templates/emails/student_risk_notification.html` для внешнего вида.

## Что ещё логично сделать дальше

### Приоритет 1

- добавить front-end экран риск-инцидентов;
- отобразить статусы `OPEN / ACKNOWLEDGED / ESCALATED / RESOLVED`;
- показать историю действий преподавателя.

### Приоритет 2

- встроить `ACADEMIC`-risk через реальные данные по оценкам;
- встроить `PAYMENT`-risk через модель задолженности/оплаты.

### Приоритет 3

- сделать backfill для существующих студентов без `NotificationPreference`;
- при необходимости добавить management command для массового создания preference.

### Приоритет 4

- добавить автоматическую плановую эскалацию по SLA:
  если преподаватель не подтвердил инцидент за N часов/дней, поднимать выше автоматически.

### Приоритет 5

- при необходимости ввести allowlist доменов email;
- вынести шаблоны писем в отдельный слой;
- добавить idempotency/rate-limiting на уровне межсервисной отправки, если бот будет вынесен отдельно в production.

## Список затронутых файлов

### Новые файлы

- `app/models/_choices/riskIncidentActionChoices.py`
- `app/models/_choices/riskIncidentChoices.py`
- `app/models/_choices/riskIncidentStatusChoices.py`
- `app/models/riskIncidentModels.py`
- `app/utils/risk_incidents.py`
- `app/management/commands/backfill_notification_preferences.py`
- `app/templates/emails/student_risk_notification.html`
- `app/templates/emails/generic_notification.html`
- `api/views/riskIncidentAPI.py`
- `api/tests/test_risk_incident_service.py`
- `api/tests/test_risk_incident_api.py`
- `RISK_NOTIFICATION_HANDOFF.md`

### Изменённые файлы

- `app/models/_choices/__init__.py`
- `app/models/_choices/notificationChoices.py`
- `app/models/__init__.py`
- `app/utils/attendance_tools.py`
- `app/signals.py`
- `app/tasks.py`
- `app/admin.py`
- `api/serializer.py`
- `api/views/__init__.py`
- `api/urls.py`
- `api/tests/test_notification_delivery_tasks.py`
- `bot/src/api/routes/messages.py`
- `bot/src/schemas/messages.py`
- `bot/src/services/telegram.py`

## Краткий итог

Система переведена с модели "разовое уведомление о проблеме" на модель "управляемый риск-инцидент с жизненным циклом".

Уже работает основа:

- единичная отправка студенту на первый риск;
- фиксация инцидента;
- подтверждение преподавателя;
- эскалация;
- закрытие;
- журнал действий;
- исправленный Telegram-канал;
- поддержка университетских email формата `12345@iitu.edu.kz`.

Основной недоделанный блок: автоматические потоки для `ACADEMIC` и `PAYMENT`, плюс пользовательские миграции и фактический прогон после них.
## 2026-04-16 Docker / Poetry Handoff

This section documents the Docker bring-up fixes made on April 16, 2026 for `back_end`.

### What was broken

- `docker compose build` failed at `poetry install --no-root`.
- The image was installing `Poetry 1.7.1`, but `back_end/poetry.lock` had Poetry 2.x metadata (`lock-version = 2.1`).
- The local lock file was also stale relative to `back_end/pyproject.toml` and did not contain `channels` / `channels-redis`.
- `back_end/pyproject.toml` declares `readme = "README.md"`, but `back_end/README.md` did not exist, so `poetry check` failed locally.
- `back_end/docker-compose.yml` overrode database settings with `DB_*` variables, but Django reads `DATABASE_*`.
- `app` used `bash -c` in Compose, while `python:3.11-slim` does not guarantee `bash`.
- Celery and Channels defaults in `back_end/core/settings.py` pointed at `127.0.0.1`, which is wrong for container-to-container traffic.

### Files changed in this session

- `back_end/docker/Dockerfile`
- `back_end/docker-compose.yml`
- `back_end/core/settings.py`
- `back_end/README.md`

### Exact changes

1. `back_end/docker/Dockerfile`
- Upgraded in-container Poetry from `1.7.1` to `2.0.1`.
- Changed install to `poetry install --no-root --only main`.

2. `back_end/docker-compose.yml`
- Removed the obsolete top-level `version` key.
- Added `env_file: .env` for `app`, `celery`, and `celery-beat`.
- Removed incorrect `DB_*` overrides so Django can use `DATABASE_*` from `.env`.
- Changed `app` startup from `bash -c` to `sh -c`.
- Added `CELERY_BROKER_URL`, `CELERY_RESULT_BACKEND`, `CHANNEL_LAYER_BACKEND=redis`, and `CHANNEL_REDIS_URL`.

3. `back_end/core/settings.py`
- Replaced hardcoded localhost Redis settings with env-aware defaults.
- Added `DEFAULT_REDIS_URL`.
- `CELERY_BROKER_URL`, `CELERY_RESULT_BACKEND`, and `CHANNEL_REDIS_URL` now read from env first.

4. `back_end/README.md`
- Added a minimal README so Poetry no longer fails on the declared `readme` path.

### Important lock-file note

- `back_end/poetry.lock` was refreshed locally on April 16, 2026 and now contains both `channels` and `channels-redis`.
- The repository root `.gitignore` ignores `*.lock`, so `back_end/poetry.lock` is not tracked by git in this repo.
- The current workspace builds correctly, but another fresh checkout will not automatically receive this refreshed lock file unless the ignore policy is changed or the lock is regenerated there.

### What was verified on April 16, 2026

- `poetry check` in `back_end` no longer fails on missing `README.md` or stale lock mismatch.
- `docker compose up -d --build` completed successfully for the full stack.
- `docker compose ps` showed `app`, `celery`, `celery-beat`, `postgres`, and `redis` in `Up`.
- `http://127.0.0.1:8000` returned HTTP `200`.
- `celery` and `celery-beat` logs showed successful startup against `redis://redis:6379/0`.

### Known remaining warnings / non-blockers

- Poetry still emits deprecation warnings because `pyproject.toml` uses legacy `[tool.poetry]` fields instead of the newer `[project]` layout.
- Celery logs still warn about running as `root`.
- Celery also warns that `CELERY_RESULT_BACKEND` is deprecated on the path toward Celery 6.

### Current git-visible state after this session

- Modified: `back_end/docker/Dockerfile`
- Modified: `back_end/docker-compose.yml`
- Modified: `back_end/core/settings.py`
- Untracked: `back_end/README.md`

## 2026-04-16 Student Journal / Grade Detail Handoff

This section documents the teacher-facing student detail page work completed on April 16, 2026.

### What was implemented

- Added an optional `score` field to `Attendance`, so the attendance journal can temporarily act as the grade journal as well.
- Generated migration `back_end/app/migrations/0036_attendance_score.py` strictly via `manage.py makemigrations`.
- Added teacher-only API endpoint:
  `GET /api/get_group/<group_id>/subjects/<subject_id>/students/<student_id>/journal/`
- The new endpoint returns:
  - student profile data;
  - group + subject context;
  - summary metrics (attendance percent, attended/missed lessons, graded lessons, average score, open risks);
  - full journal rows by lesson;
  - risk incidents for the same student/group/subject context.
- Added safe attendance update support for both presence and score through the existing `edit_attendance` endpoint.
- Tightened permissions on attendance editing so another teacher cannot update чужие записи.
- Front-end now has a dedicated React page for the student detail journal with:
  - attendance toggles;
  - editable grade field;
  - per-row save/reset actions;
  - summary cards;
  - student info sidebar;
  - risk incident sidebar.
- Student cards in group management now open this detailed page directly.
- The `tools` page was simplified to match the teacher workflow:
  - removed import;
  - removed export;
  - removed “Последние действия”;
  - left journal/group/analytics oriented entries only.

### Query / performance notes

- The student journal endpoint intentionally does **not** use cache because this is a write-heavy teacher screen and stale data would hurt UX.
- Instead, the endpoint keeps DB work bounded with targeted filters and batched row creation:
  - group / subject / student ownership is validated up front;
  - schedules are loaded once for the selected group+subject;
  - missing `Attendance` rows for that one student are created in bulk only when needed;
  - risk incidents are loaded with `select_related` / `prefetch_related`.

### Verification in this session

- `python -m py_compile api/serializer.py api/views/attendanceAPI.py api/tests/test_attendance_api.py app/models/аttendanceModels.py`
  completed successfully.
- `npm run build` for `front_end` completed successfully.
- `manage.py makemigrations` completed successfully and generated `0036_attendance_score.py`.
- `manage.py test api.tests.test_attendance_api` could **not** complete in this session because Django is configured for PostgreSQL host `postgres`, and that host was not reachable from the current environment.

### Explicit forbidden / do-not-touch rules

Add these rules explicitly for the next agent if they were only implicit before:

- Do not do an automatic git push without explicit user confirmation or a final review checkpoint.
- Do not hand-edit migrations and do not create custom/manual migrations.
  Use `manage.py makemigrations` only.
- Do not duplicate business logic or break DRY just to ship faster.
- Do not add blanket caching to mutable teacher screens without validating freshness risks first.

### Important engineering rules to preserve

- Keep the code clean and readable.
- Always optimize DB access for teacher dashboards and journals so large groups do not degrade the page.
- Use caching only where it is clearly needed and safe.
  If there is doubt, ask before introducing it broadly.

## 2026-04-16 Schedule Planner / Cache Freshness Handoff

This section documents the schedule-planning work completed on April 16, 2026.

### What was implemented

- Removed stale-data behavior for teacher schedule reads by making the schedule list and planner responses explicitly `no-store`.
- Front-end schedule requests now also send a timestamp query param so changed schedules are fetched fresh immediately after edits.
- Added a new teacher planner flow:
  - `GET /api/schedule-planner/` without `group_id` returns groups available for schedule planning;
  - `GET /api/schedule-planner/?group_id=...&start_date=...&end_date=...` returns week payload with:
    - visible days;
    - time slots;
    - all occupied schedule entries for the group;
    - only the current teacher's available subjects for placement.
- Planner access is no longer limited only to `group.teacher`.
  A teacher can plan for groups that are reachable through their subject-to-group assignment as well.
- Added week save endpoint behavior on `POST /api/schedule-planner/`:
  - create draft lessons;
  - move existing editable lessons;
  - delete editable lessons;
  - reject duplicate slot assignments in one request;
  - reject occupied time slots, including slots already taken by another teacher;
  - intentionally reject changing the subject of an existing lesson in place.
- Added semester planning support:
  - `POST /api/schedule-planner/semester/preview/`
  - `POST /api/schedule-planner/semester/apply/`
- Semester apply uses bulk creation plus batched attendance/stat seeding through `app/utils/schedule_planner.py` so mass generation does not rely on per-row signals only.
- Front-end now has a dedicated page for schedule planning:
  - route: `/schedule-planner`
  - group selector;
  - week navigation;
  - subject palette;
  - drag-and-drop placement;
  - tap-to-place fallback for touch/mobile behavior;
  - locked display for slots owned by another teacher;
  - save/reset draft controls;
  - semester preview/apply panel.
- Navigation and teacher tools were updated to expose the new planner page directly.

### Safety / performance notes

- The planner is intentionally draft-first:
  no DB write happens until the teacher presses save.
- Semester generation is intentionally preview-first:
  the intended workflow is preview -> resolve conflicts -> apply.
- Conflict checks are group-wide on `(group, date, time)`, so another teacher's slot blocks the cell.
- Bulk semester creation manually seeds `Attendance` and `AttendanceStat` in batches to keep the operation bounded and avoid excessive per-object overhead.
- Existing lessons cannot switch subject in place because attendance statistics are subject-scoped and that mutation would risk corrupting counters.

### Verification in this session

- `python -m py_compile api/serializer.py api/views/scheduleAPI.py api/tests/test_schedule_api.py app/utils/schedule_planner.py`
  completed successfully from `back_end/.venv`.
- `npm run build` for `front_end` completed successfully after running outside the sandbox.
- `manage.py test api.tests.test_schedule_api` could not complete in this environment because PostgreSQL host `postgres` was not resolvable here.

### Notes for the next agent

- The explicit forbidden/do-not-touch rules already exist above and remain valid:
  no automatic push, no manual/custom migrations, do not break DRY, do not add unsafe blanket caching.
- The important engineering rules also already exist above and remain valid:
  code cleanliness, DB query optimization, and cautious targeted caching only.
