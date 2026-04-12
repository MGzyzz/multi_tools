from django.core.management.base import BaseCommand

from app.models import NotificationPreference, Student


class Command(BaseCommand):
    help = "Create missing NotificationPreference rows for existing students."

    def handle(self, *args, **options):
        created_count = 0

        for student in Student.objects.all().iterator():
            _, created = NotificationPreference.objects.get_or_create(
                student=student,
                defaults={
                    "enabled": True,
                    "allow_email": bool(student.email),
                    "allow_telegram": bool(student.telegram_id or student.telegram_username),
                },
            )
            if created:
                created_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"NotificationPreference backfill completed. Created: {created_count}"
            )
        )
