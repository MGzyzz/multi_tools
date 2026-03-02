# ТЗ: Микросервис уведомлений (FastAPI) для интеграции с `back_end`

## 1. Цель
Реализовать отдельный FastAPI-сервис (`bot`), который принимает команды от `back_end` на отправку уведомлений студентам по каналам:
- `TELEGRAM`
- `EMAIL`

Сервис должен возвращать детальный результат доставки по каждому каналу, а `back_end` должен сохранять эти результаты в `NotificationDelivery`.

---

## 2. Бизнес-правила
1. `back_end` является единственной точкой входа от `front_end`.
2. Студент может отключить Telegram-уведомления через `NotificationPreference.allow_telegram`.
3. Email считается разрешенным по умолчанию (учебная почта), но адрес должен быть валидным и не пустым.
4. Если канал недоступен для конкретного студента, это не авария всего запроса: фиксируется `FAILED` для канала с причиной.
5. Один запрос может содержать несколько каналов; итоговый статус вычисляется из статусов каналов.

---

## 3. Контракт интеграции `back_end -> bot` (основной API)

## 3.1 Endpoint
- `POST /api/v1/notifications/send`

## 3.2 Request (JSON)
```json
{
  "idempotency_key": "notif-123-student-45-v1",
  "notification_id": 123,
  "student_id": 45,
  "event_type": "PERFORMANCE",
  "subject": "Предупреждение о посещаемости",
  "message": "У вас 3 пропуска. Пожалуйста, свяжитесь с куратором.",
  "channels": ["TELEGRAM", "EMAIL"],
  "meta": {
    "source": "attendance_job",
    "initiator": "system"
  }
}
```

## 3.3 Response (JSON)
```json
{
  "notification_id": 123,
  "overall_status": "PARTIAL",
  "delivery_results": [
    {
      "channel": "TELEGRAM",
      "status": "SENT",
      "target": "123456789",
      "provider_message_id": "tg:987654321",
      "attempts": 1,
      "error": null,
      "sent_at": "2026-02-24T10:15:00Z"
    },
    {
      "channel": "EMAIL",
      "status": "FAILED",
      "target": "student@university.edu",
      "provider_message_id": null,
      "attempts": 3,
      "error": "SMTP timeout",
      "sent_at": null
    }
  ]
}
```

## 3.4 HTTP-коды
- `200` - запрос обработан, есть результаты по каналам (включая `FAILED` для отдельных каналов).
- `400` - ошибка валидации payload.
- `401/403` - невалидный сервисный токен.
- `409` - повторный запрос с тем же `idempotency_key` и конфликтом payload.
- `500` - внутренняя ошибка сервиса.

---

## 4. Модель статусов

## 4.1 Статусы канала (`NotificationDelivery.status`)
- `PENDING` - создана попытка отправки, обработка начата.
- `SENT` - успешно отправлено в канал.
- `FAILED` - канал не отправил сообщение или невалидные данные канала.

## 4.2 Итоговый статус ответа `overall_status` (в `bot`)
- `SENT` - все запрошенные каналы `SENT`.
- `PARTIAL` - хотя бы один `SENT`, хотя бы один `FAILED`.
- `FAILED` - все каналы `FAILED`.

---

## 5. Идемпотентность и ретраи
1. `idempotency_key` обязателен для запросов из `back_end`.
2. При повторе того же ключа и того же payload сервис возвращает тот же результат без повторной отправки.
3. При повторе ключа с другим payload сервис возвращает `409`.
4. Ретраи только для временных ошибок (сеть/timeout/5xx провайдера), максимум 3 попытки.
5. Каждая попытка увеличивает `attempts` в `NotificationDelivery`.

---

## 6. Безопасность
1. Межсервисная авторизация: заголовок `X-Service-Token`.
2. Токен хранится в `.env`:
   - `back_end`: `BOT_SERVICE_TOKEN`, `BOT_SERVICE_URL`
   - `bot`: `SERVICE_TOKEN`
3. Логи не должны содержать полный текст персональных данных и токены.
4. CORS в `bot` для межсервисных вызовов не критичен, но внешний доступ должен быть ограничен сетью/ingress.

---

## 7. Чек-лист реализации по файлам

## 7.1 `back_end`
1. Создать сервис-клиент для вызова `bot`:
   - `back_end/app/services/notification_bot_client.py` (новый файл)
2. Создать оркестратор отправки уведомлений:
   - `back_end/app/services/notification_dispatcher.py` (новый файл)
3. Перенести прямые вызовы из вьюхи в сервисный слой:
   - `/Users/madi_gaziz/Desktop/alter_work/multi_tools/back_end/app/views.py`
4. Использовать существующие модели для журналирования:
   - `/Users/madi_gaziz/Desktop/alter_work/multi_tools/back_end/app/models/notificationModels.py`
   - `/Users/madi_gaziz/Desktop/alter_work/multi_tools/back_end/app/models/notificationDeliveryModels.py`
   - `/Users/madi_gaziz/Desktop/alter_work/multi_tools/back_end/app/models/notificationPreferenceModels.py`
5. Добавить/проверить env-настройки:
   - `/Users/madi_gaziz/Desktop/alter_work/multi_tools/back_end/core/settings.py`
6. Добавить тесты:
   - `back_end/api/tests/test_notification_dispatcher.py` (новый)
   - `back_end/api/tests/test_notification_bot_client.py` (новый)

## 7.2 `bot` (FastAPI)
1. Ввести новый контракт API:
   - `bot/src/api/routes/notifications.py` (новый файл)
   - подключить в `/Users/madi_gaziz/Desktop/alter_work/multi_tools/bot/src/api/router.py`
2. Добавить схемы запроса/ответа:
   - `bot/src/schemas/notifications.py` (новый файл)
3. Реализовать channel-dispatcher:
   - `bot/src/services/dispatcher.py` (новый файл)
4. Telegram sender реиспользовать:
   - `/Users/madi_gaziz/Desktop/alter_work/multi_tools/bot/src/services/telegram.py`
5. Добавить email sender:
   - `bot/src/services/email.py` (новый файл)
6. Настройки токена и SMTP:
   - `/Users/madi_gaziz/Desktop/alter_work/multi_tools/bot/src/core/config.py`
7. Добавить авторизацию endpoint по `X-Service-Token`:
   - `bot/src/api/dependencies.py` (расширить)
8. Добавить тесты:
   - `bot/tests/test_notifications_api.py` (новый)
   - `bot/tests/test_dispatcher.py` (новый)

---

## 8. Минимальный Definition of Done (MVP)
1. `back_end` вызывает `POST /api/v1/notifications/send` вместо разрозненных endpoint.
2. `bot` отправляет минимум в Telegram и возвращает структурированный результат `delivery_results`.
3. `back_end` записывает `NotificationDelivery` со статусами `SENT/FAILED`, количеством попыток и ошибкой.
4. Email-канал работает хотя бы через SMTP в базовой конфигурации.
5. Реализованы unit/integration тесты для основных сценариев.

---

## 9. Сценарии приемки
1. Студент с `allow_telegram=true`, валидный `telegram_id`:
   - Telegram `SENT`, запись доставки создана.
2. Студент с `allow_telegram=false`:
   - Telegram не отправляется, канал `FAILED` с причиной `telegram_not_allowed`.
3. Нет `telegram_id`:
   - `FAILED` с причиной `missing_telegram_id`.
4. Email недоступен (timeout SMTP):
   - после 3 попыток `FAILED`, заполнены `attempts=3`, `last_error`.
5. Повтор того же `idempotency_key`:
   - повторная отправка не происходит, возвращается ранее сохраненный результат.

---

## 10. Технический порядок внедрения
1. Добавить новый endpoint и схемы в `bot`.
2. Подключить авторизацию `X-Service-Token`.
3. Реализовать dispatcher в `bot` (Telegram first, затем Email).
4. В `back_end` внедрить `notification_dispatcher` и обновить вызовы из `views`.
5. Добавить сохранение результатов доставки.
6. Покрыть тестами критические потоки.
7. Перевести `front_end` на новый API-ответ от `back_end` (получение детального результата).
