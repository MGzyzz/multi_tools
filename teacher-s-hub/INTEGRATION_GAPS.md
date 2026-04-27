# Integration Gaps

Этот файл фиксирует, что в новом дизайне `teacher-s-hub` пока сознательно не реализовано при переносе API со старого фронта.

Главный принцип:

- если backend не отдаёт нужные данные или не поддерживает нужное действие, блок не подделывается;
- вместо фейковых значений экран либо упрощается, либо показывает честное уведомление.

## `/groups`

Не реализовано:

- `next lesson`
- school-style `subject` в карточке группы

Почему:

- текущий `GET /api/get_groups_list/` отдаёт `name`, `course`, `group_specialty`, `students_count`;
- endpoint не отдаёт следующую пару и не отдаёт предмет в том формате, который ждёт новый дизайн.

## `/students`

Не реализовано:

- фильтрация по группе из списка `/groups`
- `group`
- `attendance`
- `avg grade`
- `risk`

Почему:

- текущий `GET /api/get_all_students/` не содержит привязку студента к группе в нужном виде для этой страницы;
- endpoint не отдаёт агрегаты посещаемости, среднего балла и risk-статуса для общего списка студентов.

## `/schedule`

Не реализовано:

- точные `hours teaching` по длительности уроков

Почему:

- в доступном контракте нет длительности урока как отдельного поля;
- аудитории теперь вынесены в отдельную таблицу и связаны с `schedule`, но длительность пары backend всё ещё не хранит как отдельное поле.

## `/attendance`

Не реализовано:

- `late`
- `excused`
- `avg grade`
- `% attendance`

Почему:

- текущий attendance detail endpoint для этого экрана отдаёт только `presense`, `marked_at`, `score` и базовую информацию о студенте;
- дополнительных attendance-состояний и агрегированных процентов в этом контракте нет.

## `/scan`

Не реализовано:

- `uncertain review`
- backup camera widgets
- auto-threshold moderation flow
- расширенная accuracy/history аналитика

Почему:

- текущий face recognition API возвращает только поддерживаемые состояния `recognized`, `not_recognized`, `no_face`, `empty_embeddings` и иногда `similarity`;
- backend не даёт полноценный review queue и исторические scan-метрики для dashboard-style UI.

## `/profile`

Не реализовано:

- `phone`
- `office`
- `department`
- `subject`
- notification preferences
- avatar upload

Почему:

- текущие `GET /api/me/` и `PATCH /api/edit_profile/` поддерживают только:
  - `first_name`
  - `last_name`
  - `email`
  - `role`
  - `description`
  - read-only `username`
  - read-only `avatar`
- отдельных endpoint'ов для настроек уведомлений и загрузки аватара в новом экране сейчас нет.

## `/`

Не реализовано:

- `attendance trend`
- `face-scan accuracy history`
- `students at risk`
- `room labels`
- сложные analytics-агрегаты на dashboard

Почему:

- текущий dashboard безопасно собирается из `schedule`, `groups`, `students` и `attendance detail`;
- backend пока не отдаёт нужные агрегированные метрики для этих виджетов в надёжном и прямом виде.

## Что делать дальше

Если появится новый backend endpoint или расширится текущий контракт, этот файл нужно обновить и вернуть соответствующие блоки в UI.
