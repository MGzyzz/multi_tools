from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import TeacherProfile


@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def ensure_teacher_profile(sender, instance, created, **kwargs):
    if created:
        TeacherProfile.objects.create(user=instance)

