# backend_integration.py

import requests
from datetime import datetime

def send_recognition_result_to_backend(label: str, backend_url: str = "http://localhost:8002/api/ai_result"):
    """
    Отправляет результат распознавания лица на backend.

    :param label: Имя пользователя (или "Unknown"), определённое AI-модулем.
    :param backend_url: URL конечной точки backend-сервера.
    """
    if not label:
        print("[WARNING] Пустой label, отправка отменена.")
        return

    payload = {
        "user": label,
        "timestamp": datetime.now().isoformat()
    }

    try:
        response = requests.post(backend_url, json=payload, timeout=5)
        response.raise_for_status()
        print(f"[✔ SUCCESS] Результат '{label}' отправлен на backend. Код: {response.status_code}")
    except requests.exceptions.RequestException as e:
        print(f"[✖ ERROR] Не удалось отправить данные на backend: {e}")
