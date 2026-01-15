from celery import shared_task
from django.db import transaction
from django.db.models import Count, Q
from django.utils import timezone


# Данная задача предназначена для тестирования работы Celery.
@shared_task(name="hello_world_task")
def hello_world():
    return "Hello, World!"


@shared_task(name="reconcile_attendance_stats")
def reconcile_attendance_stats():
    """
    Пересчитывает AttendanceStat из Attendance (источник истины).
    Делает:
    - totals = count(attendance)
    - attended = count(attendance where presense=True)
    - затем обновляет/создаёт AttendanceStat
    - и опционально обнуляет/удаляет устаревшие stats, которых нет в источнике
    """
    from .models import Attendance, AttendanceStat

    started_at = timezone.now()

    # 1) Агрегируем по (student, group, subject)
    # subject и group берем через schedule
    rows = (
        Attendance.objects
        .values("student_id", "schedule__group_id", "schedule__subject_id")
        .annotate(
            total=Count("id"),
            attended=Count("id", filter=Q(presense=True)),
        )
    )

    # Преобразуем в удобный dict для сравнения/обновления
    aggregated = {}
    for r in rows:
        key = (r["student_id"], r["schedule__subject_id"], r["schedule__group_id"])
        aggregated[key] = (r["total"], r["attended"])

    keys = list(aggregated.keys())

    with transaction.atomic():
        # 2) Забираем существующие AttendanceStat только по тем ключам, которые реально есть
        existing = {
            (s.student_id, s.subject_id, s.group_id): s
            for s in AttendanceStat.objects.filter(
                student_id__in={k[0] for k in keys},
                subject_id__in={k[1] for k in keys},
                group_id__in={k[2] for k in keys},
            )
        }

        to_update = []
        to_create = []

        for (student_id, subject_id, group_id), (total, attended) in aggregated.items():
            stat = existing.get((student_id, subject_id, group_id))
            if stat is None:
                to_create.append(
                    AttendanceStat(
                        student_id=student_id,
                        subject_id=subject_id,
                        group_id=group_id,
                        total=total,
                        attended=attended,
                    )
                )
            else:
                if stat.total != total or stat.attended != attended:
                    stat.total = total
                    stat.attended = attended
                    to_update.append(stat)

        if to_create:
            AttendanceStat.objects.bulk_create(to_create, batch_size=1000)

        if to_update:
            AttendanceStat.objects.bulk_update(to_update, ["total", "attended"], batch_size=1000)

        # 3) Опционально: “осиротевшие” stats, которых уже нет в Attendance
        # Это бывает если удалили Attendance/Schedule/студента переместили и т.п.
        # Решение: либо удалить, либо обнулить. Я бы удалял.
        # Но удалять ВСЕ не из keys может быть тяжело; поэтому можно делать безопасно через exclude по id списка.
        # Ниже — вариант "удалить stats с total=0" мы не можем, так что удаляем действительно отсутствующие ключи:
        existing_keys = set(existing.keys())
        aggregated_keys = set(aggregated.keys())
        orphan_keys = existing_keys - aggregated_keys

        if orphan_keys:
            # удаляем пачками
            # (делаем по фильтрам, иначе по тройному IN сложнее)
            # Для простоты: сначала соберем ids
            orphan_ids = [
                existing[k].id for k in orphan_keys
                if k in existing
            ]
            AttendanceStat.objects.filter(id__in=orphan_ids).delete()

    finished_at = timezone.now()
    return {
        "started_at": started_at.isoformat(),
        "finished_at": finished_at.isoformat(),
        "aggregated_rows": len(aggregated),
        "created": len(to_create),
        "updated": len(to_update),
        "deleted_orphans": len(orphan_keys) if keys else 0,
    }