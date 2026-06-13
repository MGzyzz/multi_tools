"""
Seed two demo IT teachers with distinct groups, students, schedule and
attendance statistics. Idempotent — safe to run multiple times.

Used to make the workspace look populated for the diploma demo: two teachers
who both teach the same IT subject ("Веб-разработка") but have different
students, different weekly schedules and visibly different attendance stats
(one group attends well, the other poorly — which also produces risk incidents
for the analytics page).

Run:  python manage.py seed_demo_teachers
"""

import datetime

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from accounts.models import TeacherProfile
from app.models import Attendance, Group, Schedule, Student, Subject_study
from app.models._choices.attendanceChoices import AttendanceStatusChoices

User = get_user_model()

DEMO_PASSWORD = "demo12345"
SHARED_SUBJECT = "Веб-разработка"
LESSON_TIMES = ["09:00", "11:00", "14:00"]

# How many weeks of past lessons to generate (these get marked, driving stats).
PAST_WEEKS = 2

# Two demo teachers. Different weekdays, different students, different target
# attendance rate so the two groups look clearly distinct in analytics.
DEMO_TEACHERS = [
    {
        "username": "it_teacher1",
        "first_name": "Алия",
        "last_name": "Серикова",
        "email": "alia.serikova@example.com",
        "group_name": "ИТ-101",
        "course": "1",
        "specialty": "Программная инженерия",
        "weekdays": [0, 2, 4],  # Mon / Wed / Fri
        "base_rate": 0.9,  # attends well
        "students": [
            ("Данияр", "Ахметов"),
            ("Айгерим", "Болатова"),
            ("Ерлан", "Жумабаев"),
            ("Камила", "Сейтова"),
            ("Тимур", "Оспанов"),
            ("Динара", "Калиева"),
        ],
    },
    {
        "username": "it_teacher2",
        "first_name": "Бауыржан",
        "last_name": "Нурланов",
        "email": "bauyrzhan.nurlanov@example.com",
        "group_name": "ИТ-202",
        "course": "2",
        "specialty": "Информационные системы",
        "weekdays": [1, 3],  # Tue / Thu
        "base_rate": 0.6,  # attends poorly -> risk incidents
        "students": [
            ("Арман", "Тлеубаев"),
            ("Жанна", "Искакова"),
            ("Нурлан", "Абдрахманов"),
            ("Сабина", "Маратова"),
            ("Олжас", "Тулегенов"),
            ("Лаура", "Есенова"),
        ],
    },
]


def _monday_of_week(ref: datetime.date) -> datetime.date:
    return ref - datetime.timedelta(days=ref.weekday())


class Command(BaseCommand):
    help = "Seed two demo IT teachers with groups, students, schedule and attendance stats."

    def handle(self, *args, **options):
        today = datetime.date.today()
        current_monday = _monday_of_week(today)
        # Earliest Monday we generate lessons from (PAST_WEEKS back).
        start_monday = current_monday - datetime.timedelta(weeks=PAST_WEEKS)

        for config in DEMO_TEACHERS:
            teacher = self._ensure_teacher(config)
            group = self._ensure_group(teacher, config)
            students = self._ensure_students(group, config)
            subject = self._ensure_subject(teacher, group, config)
            schedules = self._ensure_schedules(
                teacher, group, subject, config, start_monday, current_monday
            )
            marked = self._mark_attendance(group, students, schedules, config, today)

            self.stdout.write(
                self.style.SUCCESS(
                    f"Teacher '{teacher.user.username}': group {group.name}, "
                    f"{len(students)} students, {len(schedules)} lessons, "
                    f"{marked} attendance rows marked."
                )
            )

        self.stdout.write(
            self.style.SUCCESS(
                f"\nDone. Login with username 'it_teacher1' / 'it_teacher2', "
                f"password '{DEMO_PASSWORD}'."
            )
        )

    def _ensure_teacher(self, config) -> TeacherProfile:
        user, _ = User.objects.get_or_create(
            username=config["username"],
            defaults={
                "first_name": config["first_name"],
                "last_name": config["last_name"],
                "email": config["email"],
            },
        )
        # Keep the demo password and name in sync on re-runs.
        user.first_name = config["first_name"]
        user.last_name = config["last_name"]
        user.email = config["email"]
        user.set_password(DEMO_PASSWORD)
        user.save()

        # TeacherProfile is auto-created by a post_save signal on User.
        profile, _ = TeacherProfile.objects.get_or_create(user=user)
        return profile

    def _ensure_group(self, teacher, config) -> Group:
        group, _ = Group.objects.get_or_create(
            name=config["group_name"],
            teacher=teacher,
            defaults={
                "course": config["course"],
                "group_specialty": config["specialty"],
            },
        )
        return group

    def _ensure_students(self, group, config) -> list:
        students = []
        for index, (first, last) in enumerate(config["students"]):
            email = f"{config['username']}.student{index + 1}@example.com"
            student, _ = Student.objects.get_or_create(
                email=email,
                defaults={
                    "first_name": first,
                    "last_name": last,
                    "age": 18 + (index % 4),
                },
            )
            students.append(student)

        # Idempotent m2m attach (set keeps exactly this roster).
        group.students.set(students)
        return students

    def _ensure_subject(self, teacher, group, config) -> Subject_study:
        subject, _ = Subject_study.objects.get_or_create(
            name=SHARED_SUBJECT,
            teacher=teacher,
            defaults={"description": "Демонстрационный ИТ-предмет"},
        )
        subject.groups.add(group)
        return subject

    def _ensure_schedules(
        self, teacher, group, subject, config, start_monday, current_monday
    ) -> list:
        """Create lessons for PAST_WEEKS past weeks plus the current week."""
        schedules = []
        total_weeks = PAST_WEEKS + 1
        for week in range(total_weeks):
            week_monday = start_monday + datetime.timedelta(weeks=week)
            for weekday in config["weekdays"]:
                lesson_date = week_monday + datetime.timedelta(days=weekday)
                # One lesson per scheduled weekday, rotating the time slot.
                time_str = LESSON_TIMES[weekday % len(LESSON_TIMES)]
                lesson_time = datetime.time.fromisoformat(time_str)
                schedule, _ = Schedule.objects.get_or_create(
                    group=group,
                    date=lesson_date,
                    time=lesson_time,
                    defaults={"subject": subject, "teacher": teacher},
                )
                schedules.append(schedule)
        return schedules

    def _mark_attendance(self, group, students, schedules, config, today) -> int:
        """
        Mark past lessons present/absent per a per-student target rate; leave
        current/future lessons NOT_MARKED. Saving each row triggers the
        AttendanceStat update signal. Idempotent: only changes rows that differ.
        """
        past_schedules = sorted(
            (s for s in schedules if s.date < today), key=lambda s: (s.date, s.time)
        )
        if not past_schedules:
            return 0

        marked = 0
        for index, student in enumerate(students):
            # Vary the rate a little per student so the group isn't uniform.
            rate = max(0.4, min(1.0, config["base_rate"] - (index % 3) * 0.1))
            present_count = round(rate * len(past_schedules))

            for position, schedule in enumerate(past_schedules):
                target = (
                    AttendanceStatusChoices.PRESENT
                    if position < present_count
                    else AttendanceStatusChoices.ABSENT
                )
                attendance = Attendance.objects.filter(student=student, schedule=schedule).first()
                if attendance is None or attendance.status == target:
                    continue
                attendance.status = target
                attendance.save()
                marked += 1

        return marked
