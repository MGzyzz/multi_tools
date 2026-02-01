import requests
from django.conf import settings

from app.models import StudentFaceImage


def get_ai_base_url():
    return getattr(settings, "AI_SERVICE_URL", "http://localhost:8002").rstrip("/")


def fetch_embedding_from_file(file_obj, filename=None, content_type=None):
    if hasattr(file_obj, "seek"):
        try:
            file_obj.seek(0)
        except Exception:
            pass

    file_bytes = file_obj.read()
    files = {
        "file": (
            filename or getattr(file_obj, "name", "face.jpg"),
            file_bytes,
            content_type or getattr(file_obj, "content_type", "image/jpeg"),
        )
    }

    try:
        response = requests.post(f"{get_ai_base_url()}/embedding", files=files, timeout=20)
    except requests.RequestException as exc:
        return None, {"error": "ai_unavailable", "detail": str(exc)}

    if response.status_code != 200:
        return None, {"error": "ai_error", "detail": response.text}

    data = response.json()
    if data.get("status") != "ok":
        return None, {"error": data.get("status", "ai_error")}

    embedding = data.get("embedding")
    if not embedding:
        return None, {"error": "empty_embedding"}

    return embedding, None


def trim_face_images(student, limit=None):
    limit = int(limit if limit is not None else getattr(settings, "FACE_IMAGE_LIMIT", 5))
    if limit <= 0:
        return

    ids = list(
        StudentFaceImage.objects.filter(student=student)
        .order_by("-created_at")
        .values_list("id", flat=True)[:limit]
    )

    if not ids:
        return

    StudentFaceImage.objects.filter(student=student).exclude(id__in=ids).delete()
