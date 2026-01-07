import os
import sys
from pathlib import Path
import calendar
import django
from datetime import date, time, timedelta
import random
import string

# Ensure project root on sys.path and bind settings
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()

from accounts.models import TeacherProfile, User  # noqa: E402
from accounts.models._choices import RoleChoices  # noqa: E402
from app.models import Subject_study, Group, Schedule, Student  # noqa: E402


weekdays = [0, 1, 2, 3, 4]  # Monday to Friday
times = [time(9, 0), time(11, 0), time(13, 0), time(15, 0)]


def random_string(length=6):
    return "".join(random.choices(string.ascii_lowercase, k=length))


def create_teachers(count=10):
    created = []
    for i in range(count):
        username = f"teacher_{i}_{random_string(3)}"
        user, _ = User.objects.get_or_create(
            username=username,
            defaults={
                "first_name": f"Учитель{i}",
                "last_name": random_string(4),
                "email": f"{username}@mail.com",
            },
        )
        profile, _ = TeacherProfile.objects.get_or_create(user=user, defaults={"role": RoleChoices.TEACHER})
        created.append(profile)
    return created


def create_students(count=10):
    students = []
    for i in range(count):
        first_name = f"Студент{i}"
        last_name = random_string(5).title()
        tg_username = f"student_{i}_{random_string(3)}"
        student, _ = Student.objects.get_or_create(
            telegram_username=tg_username,
            defaults={
                "first_name": first_name,
                "last_name": last_name,
                "telegram_id": f"{1000000 + i}",
                "email": f"{tg_username}@mail.com",
                "platonus_id": 1000 + i,
                "age": random.randint(16, 25),
                "phone": f"+7700{random.randint(1000000, 9999999)}",
            },
        )
        students.append(student)
    return students


def main():
    teachers = create_teachers()
    students = create_students()

    subject_names = [
        "Математика",
        "Физика",
        "Информатика",
        "История",
        "Английский",
        "Биология",
        "Литература",
        "География",
    ]
    subjects = []
    for name in subject_names:
        teacher = random.choice(teachers)
        s, _ = Subject_study.objects.get_or_create(name=name, description=f"Описание {name}", teacher=teacher)
        subjects.append(s)

    group, _ = Group.objects.get_or_create(name="Группа А", course="10 класс")
    group.students.set(students)

    today = date.today()
    _, month_days = calendar.monthrange(today.year, today.month)
    month_end = date(today.year, today.month, month_days)

    created = 0
    current_date = today
    while current_date <= month_end and created < 20:
        if current_date.weekday() in weekdays:
            per_day = min(3, 20 - created)
            day_subjects = random.sample(subjects, per_day)
            for i, subject in enumerate(day_subjects):
                Schedule.objects.get_or_create(
                    group=group,
                    subject=subject,
                    date=current_date,
                    time=times[i],
                    teacher=subject.teacher
                )
                created += 1
                if created >= 20:
                    break
        current_date = current_date + timedelta(days=1)

    print("✅ Расписание сгенерировано.")


if __name__ == "__main__":
    print("Hello World!")
    main()


