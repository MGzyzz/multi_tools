# backend_integration.py

import requests

def send_recognition_result_to_backend(label: str, backend_url: str = "http://localhost:5000/api/ai_result"):
    """
    Отправляет результат распознавания лица на backend.

    :param label: Имя пользователя (или "Unknown"), определённое AI-модулем.
    :param backend_url: URL конечной точки backend-сервера.
    """
    try:
        response = requests.post(backend_url, json={"user": label})
        response.raise_for_status()
        print(f"[INFO] Результат успешно отправлен на backend: {label}")
    except requests.RequestException as e:
        print(f"[ERROR] Ошибка при отправке данных на backend: {e}")
