# W&B integration

AI-модуль поддерживает опциональное логирование метрик в [Weights & Biases](https://wandb.ai/).
Интеграция уже встроена в код и по умолчанию не мешает локальной работе:

- если `WANDB_MODE=disabled`, логирование выключено;
- если задан `WANDB_MODE=offline`, метрики сохраняются локально и позже могут быть отправлены через `wandb sync`;
- если заданы `WANDB_API_KEY` и `WANDB_PROJECT`, сервис может работать в `online`-режиме.

## Что логируется

- `generate_embeddings.py`: число пользователей и изображений, пропуски, длительность генерации.
- `POST /embedding`: статус обработки, latency, размер эмбеддинга.
- `POST /recognize_from_image`: similarity, статус распознавания, latency.
- Сессии распознавания через камеру: длительность, число кадров, число кадров с лицом, максимальная similarity.
- Графики из `utils/log_similarity.py` как изображения в W&B.

## Переменные окружения

- `WANDB_API_KEY`: API-ключ W&B.
- `WANDB_PROJECT`: имя проекта, например `multi-tools-ai`.
- `WANDB_ENTITY`: команда или аккаунт W&B.
- `WANDB_MODE`: `online`, `offline` или `disabled`.
- `WANDB_NAME`: имя запуска.
- `WANDB_NOTES`: заметки к запуску.
- `WANDB_TAGS`: теги через запятую, например `fastapi,face-recognition`.

## Пример для PowerShell

```powershell
$env:WANDB_API_KEY="your_api_key"
$env:WANDB_PROJECT="multi-tools-ai"
$env:WANDB_MODE="online"
```

Для офлайн-режима:

```powershell
$env:WANDB_PROJECT="multi-tools-ai"
$env:WANDB_MODE="offline"
```

## Запуск

```powershell
cd ai
poetry install
poetry run python main.py
```

Для генерации эмбеддингов:

```powershell
cd ai
poetry run python generate_embeddings.py
```

Если хотите авторизовать окружение заранее, используйте официальный CLI:

```powershell
wandb login
```
