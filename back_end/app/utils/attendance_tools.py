from django.db import transaction
from django.db.models import F
from django.utils import timezone

from app.models._choices.attendanceChoices import AttendanceStatusChoices
from app.utils.risk_incidents import sync_attendance_risk_incident

_ATTENDED_STATUSES = (AttendanceStatusChoices.PRESENT, AttendanceStatusChoices.LATE)


def mark_attendance(schedule_id: int, present_student_ids: list[int]) -> dict:
    """
    Отмечает посещаемость по занятию (Schedule) списком присутствующих.
    Присутствующие → PRESENT, остальные → ABSENT.
    Обновляет AttendanceStat и при необходимости тригgerит риск-инциденты.
    """
    from app.models import Attendance, AttendanceStat, NotificationPreference, Schedule, Student

    now = timezone.now()

    schedule = Schedule.objects.select_related("group", "subject").get(id=schedule_id)
    group_id = schedule.group_id
    subject_id = schedule.subject_id

    allowed_ids = set(schedule.group.students.values_list("id", flat=True))
    present_set = set(present_student_ids) & allowed_ids

    with transaction.atomic():
        # Снимем прошлое состояние для вычисления дельты
        prev_map = dict(
            Attendance.objects.filter(schedule_id=schedule_id).values_list("student_id", "status")
        )

        # 1) Всем ставим ABSENT + время отметки
        Attendance.objects.filter(schedule_id=schedule_id).update(
            status=AttendanceStatusChoices.ABSENT, marked_at=now
        )

        # 2) Присутствующим ставим PRESENT
        if present_set:
            Attendance.objects.filter(
                schedule_id=schedule_id, student_id__in=present_set
            ).update(status=AttendanceStatusChoices.PRESENT, marked_at=now)

        # 3) Считаем дельту attended (not_marked/absent → present/late = +1; present/late → absent = -1)
        delta_plus = []
        delta_minus = []

        for student_id, old_status in prev_map.items():
            old_attended = old_status in _ATTENDED_STATUSES
            new_attended = student_id in present_set  # new status = PRESENT if in set, else ABSENT

            if not old_attended and new_attended:
                delta_plus.append(student_id)
            elif old_attended and not new_attended:
                delta_minus.append(student_id)

        # Студенты у которых не было записи — теперь ABSENT, не меняют delta attended

        # 4) Применить дельту к AttendanceStat
        if delta_plus:
            AttendanceStat.objects.filter(
                group_id=group_id, subject_id=subject_id, student_id__in=delta_plus
            ).update(attended=F("attended") + 1)

        if delta_minus:
            AttendanceStat.objects.filter(
                group_id=group_id,
                subject_id=subject_id,
                student_id__in=delta_minus,
                attended__gt=0,
            ).update(attended=F("attended") - 1)

        # 5) Риск-инциденты только для студентов у кого изменился статус
        #    и только если у них total > 0 (т.е. есть реально отмеченные записи)
        affected_student_ids = set(delta_plus + delta_minus)
        if affected_student_ids:
            stats = AttendanceStat.objects.filter(
                group_id=group_id,
                subject_id=subject_id,
                student_id__in=affected_student_ids,
                total__gt=0,
            )

            student_map = {
                s.id: s for s in Student.objects.filter(id__in=affected_student_ids)
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
