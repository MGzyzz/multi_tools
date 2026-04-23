import datetime

from django.core.management.base import BaseCommand, CommandError

from accounts.models import TeacherProfile
from app.models import Group, Schedule, Subject_study

DEMO_TIMES = ["09:00", "11:00", "13:00"]

WEEKDAY_SLOTS = {
    0: [0, 1],
    1: [1, 2],
    2: [0, 2],
    3: [0, 1],
    4: [2],
}


def _monday_of_week(ref: datetime.date) -> datetime.date:
    return ref - datetime.timedelta(days=ref.weekday())


class Command(BaseCommand):
    help = "Seed demo schedule for the current week (idempotent)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--username",
            default=None,
            help="Username of the teacher. Defaults to the first teacher found.",
        )

    def handle(self, *args, **options):
        username = options["username"]
        if username:
            try:
                teacher = TeacherProfile.objects.select_related("user").get(user__username=username)
            except TeacherProfile.DoesNotExist as err:
                raise CommandError(f"No teacher found for username '{username}'.") from err
        else:
            teacher = TeacherProfile.objects.select_related("user").first()
            if not teacher:
                raise CommandError("No teachers in the database. Create a teacher first.")

        groups = list(Group.objects.filter(teacher=teacher))
        if not groups:
            raise CommandError(
                f"Teacher '{teacher.user.username}' has no groups. Create at least one group."
            )

        subjects = list(Subject_study.objects.filter(teacher=teacher))
        if not subjects:
            raise CommandError(
                f"Teacher '{teacher.user.username}' has no subjects. Create at least one subject."
            )

        monday = _monday_of_week(datetime.date.today())
        created_count = 0

        for weekday, time_indices in WEEKDAY_SLOTS.items():
            lesson_date = monday + datetime.timedelta(days=weekday)
            for i, time_idx in enumerate(time_indices):
                group = groups[i % len(groups)]
                subject = subjects[time_idx % len(subjects)]
                time_str = DEMO_TIMES[time_idx]
                lesson_time = datetime.time.fromisoformat(time_str)

                _, created = Schedule.objects.get_or_create(
                    group=group,
                    date=lesson_date,
                    time=lesson_time,
                    defaults={"subject": subject, "teacher": teacher},
                )
                if created:
                    created_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Demo schedule seeded for week of {monday}. "
                f"Created {created_count} new schedule entries "
                f"(teacher: {teacher.user.username}, "
                f"groups: {len(groups)}, subjects: {len(subjects)})."
            )
        )
