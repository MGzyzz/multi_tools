from __future__ import annotations

from collections import Counter
from datetime import date, datetime, time, timedelta

from django.db.models import F

from app.models import Attendance, AttendanceStat, Group, Schedule

DEFAULT_PLANNER_TIME_SLOTS = (
    "08:00",
    "10:00",
    "12:00",
    "14:00",
    "16:00",
    "18:00",
)


def build_planner_time_slots(*, schedules: list[Schedule]) -> list[str]:
    values = set(DEFAULT_PLANNER_TIME_SLOTS)
    for schedule in schedules:
        values.add(schedule.time.strftime("%H:%M"))
    return sorted(values, key=_parse_time_value)


def expand_semester_pattern(
    *,
    pattern: list[dict],
    start_date: date,
    end_date: date,
) -> list[dict]:
    occurrences: list[dict] = []

    for item in pattern:
        weekday = item["weekday"]
        current_date = start_date + timedelta(days=(weekday - start_date.weekday()) % 7)

        while current_date <= end_date:
            occurrences.append(
                {
                    "date": current_date,
                    "time": item["time"],
                    "subject_id": item["subject_id"],
                    "weekday": weekday,
                }
            )
            current_date += timedelta(days=7)

    occurrences.sort(key=lambda item: (item["date"], item["time"], item["subject_id"]))
    return occurrences


def bulk_seed_schedule_dependencies(
    *,
    group: Group,
    created_schedules: list[Schedule],
) -> dict[str, int]:
    if not created_schedules:
        return {"attendance_rows": 0, "stats_created": 0, "stats_updated": 0}

    student_ids = list(group.students.values_list("id", flat=True))
    if not student_ids:
        return {"attendance_rows": 0, "stats_created": 0, "stats_updated": 0}

    attendance_rows_created = _bulk_create_attendance_rows(
        student_ids=student_ids,
        created_schedules=created_schedules,
    )
    stats_created, stats_updated = _update_attendance_stats(
        group=group,
        student_ids=student_ids,
        created_schedules=created_schedules,
    )

    return {
        "attendance_rows": attendance_rows_created,
        "stats_created": stats_created,
        "stats_updated": stats_updated,
    }


def _bulk_create_attendance_rows(
    *,
    student_ids: list[int],
    created_schedules: list[Schedule],
    batch_size: int = 1000,
) -> int:
    pending: list[Attendance] = []
    created_count = 0

    for schedule in created_schedules:
        for student_id in student_ids:
            pending.append(
                Attendance(
                    student_id=student_id,
                    schedule_id=schedule.id,
                    presense=False,
                )
            )

            if len(pending) >= batch_size:
                Attendance.objects.bulk_create(
                    pending,
                    batch_size=batch_size,
                    ignore_conflicts=True,
                )
                created_count += len(pending)
                pending = []

    if pending:
        Attendance.objects.bulk_create(
            pending,
            batch_size=batch_size,
            ignore_conflicts=True,
        )
        created_count += len(pending)

    return created_count


def _update_attendance_stats(
    *,
    group: Group,
    student_ids: list[int],
    created_schedules: list[Schedule],
) -> tuple[int, int]:
    subject_counter = Counter(schedule.subject_id for schedule in created_schedules)
    stats_created = 0
    stats_updated = 0

    for subject_id, lessons_count in subject_counter.items():
        subject_stats_qs = AttendanceStat.objects.filter(
            group_id=group.id,
            subject_id=subject_id,
            student_id__in=student_ids,
        )

        existing_student_ids = set(subject_stats_qs.values_list("student_id", flat=True))

        if existing_student_ids:
            subject_stats_qs.update(total=F("total") + lessons_count)
            stats_updated += len(existing_student_ids)

        missing_student_ids = [sid for sid in student_ids if sid not in existing_student_ids]
        if missing_student_ids:
            AttendanceStat.objects.bulk_create(
                [
                    AttendanceStat(
                        student_id=student_id,
                        subject_id=subject_id,
                        group_id=group.id,
                        total=lessons_count,
                        attended=0,
                    )
                    for student_id in missing_student_ids
                ],
                batch_size=500,
            )
            stats_created += len(missing_student_ids)

    return stats_created, stats_updated


def _parse_time_value(value: str) -> time:
    normalized = value if len(value.split(":")) == 3 else f"{value}:00"
    return datetime.strptime(normalized, "%H:%M:%S").time()
