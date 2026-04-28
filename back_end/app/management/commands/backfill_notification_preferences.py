from django.core.management.base import BaseCommand

from app.models import NotificationPreference, Student


class Command(BaseCommand):
    help = "Create missing NotificationPreference rows and fix allow_telegram=False for existing students."

    def handle(self, *args, **options):
        created_count = 0
        fixed_count = 0

        for student in Student.objects.all().iterator():
            pref, created = NotificationPreference.objects.get_or_create(
                student=student,
                defaults={
                    "enabled": True,
                    "allow_email": bool(student.email),
                    "allow_telegram": True,
                },
            )
            if created:
                created_count += 1
            elif not pref.allow_telegram:
                pref.allow_telegram = True
                pref.save(update_fields=["allow_telegram"])
                fixed_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Done. Created: {created_count}, fixed allow_telegram: {fixed_count}"
            )
        )
