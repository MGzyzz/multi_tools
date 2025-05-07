import os
import django
from datetime import date, timedelta, time
import random

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'your_project_name.settings')
django.setup()

from app.models import Subject_study, Teacher, Group, Schedule

start_date = date(2025, 1, 20)
end_date = date(2025, 5, 20)

weekdays = [0, 1, 2, 3, 4]  # Monday to Friday
times = [time(9, 0), time(11, 0), time(13, 0), time(15, 0)]

# Create teachers
teacher_names = [("Иван", "Иванов"), ("Ольга", "Петрова"), ("Сергей", "Сидоров")]
teachers = []
for fn, ln in teacher_names:
    t, _ = Teacher.objects.get_or_create(first_name=fn, last_name=ln, email=f"{fn.lower()}@mail.com", phone="123456789")
    teachers.append(t)

# Create subjects
subject_names = [
    "Математика", "Физика", "Информатика", "История",
    "Английский", "Биология", "Литература", "География"
]
subjects = []
for name in subject_names:
    teacher = random.choice(teachers)
    s, _ = Subject_study.objects.get_or_create(name=name, description=f"Описание {name}", teacher=teacher)
    subjects.append(s)

# Create one group (or get existing)
group, _ = Group.objects.get_or_create(name="Группа А", course="10 класс")

# Расписание: каждый предмет — 2 раза в неделю, по будням
current_date = start_date
while current_date <= end_date:
    if current_date.weekday() in weekdays:
        day_subjects = random.sample(subjects, 3)  # max 3 предмета в день
        for i, subject in enumerate(day_subjects):
            Schedule.objects.get_or_create(
                group=group,
                subject=subject,
                teacher=subject.teacher,
                date=current_date,
                time=times[i]
            )
    current_date += timedelta(days=1)

print("✅ Расписание сгенерировано.")
