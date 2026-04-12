from django.db import transaction
from django.db.models import F
from django.utils import timezone

from app.utils.risk_incidents import sync_attendance_risk_incident


def mark_attendance(schedule_id: int, present_student_ids: list[int]) -> dict:
    """
    Отмечает посещаемость по занятию (Schedule) списком присутствующих.
    Быстро: 2 UPDATE по Attendance + 0-2 UPDATE по AttendanceStat.
    """
    from app.models import Attendance, AttendanceStat, NotificationPreference, Schedule, Student

    now = timezone.now()

    schedule = Schedule.objects.select_related("group", "subject").get(id=schedule_id)
    group_id = schedule.group_id
    subject_id = schedule.subject_id

    # Защита: принимаем только студентов этой группы
    allowed_ids = set(schedule.group.students.values_list("id", flat=True))
    present_set = set(present_student_ids) & allowed_ids

    with transaction.atomic():
        # Снимем "прошлое состояние" presense для вычисления дельты
        # (в твоей архитектуре Attendance должны существовать для всех студентов группы)
        prev_map = dict(
            Attendance.objects.filter(schedule_id=schedule_id).values_list("student_id", "presense")
        )

        # 1) Сбросить всем False
        Attendance.objects.filter(schedule_id=schedule_id).update(presense=False, marked_at=now)

        # 2) Проставить True присутствующим
        if present_set:
            Attendance.objects.filter(schedule_id=schedule_id, student_id__in=present_set).update(
                presense=True, marked_at=now
            )

        # 3) Посчитать дельту attended
        delta_plus = []  # False -> True
        delta_minus = []  # True -> False

        # prev_map может быть меньше allowed_ids если кто-то удалил Attendance вручную
        for student_id, old_presense in prev_map.items():
            new_presense = student_id in present_set

            if old_presense is False and new_presense is True:
                delta_plus.append(student_id)
            elif old_presense is True and new_presense is False:
                delta_minus.append(student_id)

        # 4) Применить дельту к статистике
        if delta_plus:
            AttendanceStat.objects.filter(
                group_id=group_id, subject_id=subject_id, student_id__in=delta_plus
            ).update(attended=F("attended") + 1)

        if delta_minus:
            # защитимся от ухода в минус
            AttendanceStat.objects.filter(
                group_id=group_id,
                subject_id=subject_id,
                student_id__in=delta_minus,
                attended__gt=0,
            ).update(attended=F("attended") - 1)

        # 5) Обновить риск-инциденты по посещаемости.
        affected_student_ids = set(delta_plus + delta_minus)
        if affected_student_ids:
            stats = AttendanceStat.objects.filter(
                group_id=group_id,
                subject_id=subject_id,
                student_id__in=affected_student_ids,
                total__gt=0,
            )

            student_map = {
                student.id: student
                for student in Student.objects.filter(id__in=affected_student_ids)
            }

            for stat in stats:
                student = student_map.get(stat.student_id)
                if not student:
                    continue

                current_percent = round((stat.attended / stat.total) * 100)
                preference = NotificationPreference.objects.filter(student=student).first()
                threshold_percent = preference.threshold_percent if preference else 60

                sync_attendance_risk_incident(
                    student=student,
                    group=schedule.group,
                    subject=schedule.subject,
                    current_percent=current_percent,
                    threshold_percent=threshold_percent,
                    schedule_id=schedule_id,
                    assigned_teacher=schedule.teacher or schedule.group.teacher,
                )

    return {
        "schedule_id": schedule_id,
        "group_id": group_id,
        "subject_id": subject_id,
        "total_students_in_group": len(allowed_ids),
        "present_count": len(present_set),
        "changed_to_present": len(delta_plus),
        "changed_to_absent": len(delta_minus),
    }
