import logging

from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone

from app.models import Student, StudentFaceImage
from app.utils.face_embedding import fetch_embedding_from_file, trim_face_images

logger = logging.getLogger(__name__)


@receiver(post_save, sender=StudentFaceImage)
def generate_embedding_for_face_image(sender, instance, created, **kwargs):
    if not instance.image:
        return

    if instance.embedding is None:
        try:
            instance.image.open("rb")
            file_obj = instance.image.file
            embedding, error = fetch_embedding_from_file(
                file_obj,
                filename=instance.image.name,
                content_type=getattr(file_obj, "content_type", "image/jpeg"),
            )
        except Exception as exc:
            logger.warning("Face embedding error for face_image_id=%s: %s", instance.id, exc)
            embedding = None
            error = "exception"
        finally:
            try:
                instance.image.close()
            except Exception:
                pass

        if error:
            logger.warning("Face embedding failed for face_image_id=%s: %s", instance.id, error)
        else:
            StudentFaceImage.objects.filter(id=instance.id).update(embedding=embedding)
            Student.objects.filter(id=instance.student_id).update(face_updated_at=timezone.now())

    trim_face_images(instance.student)
