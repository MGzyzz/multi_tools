import logging

from django.db import transaction
from django.db.models import F
from django.db.models.signals import m2m_changed, post_delete, post_save, pre_save
from django.dispatch import receiver
from django.utils import timezone

from app.models._choices import NotificationTypeChoices
from app.utils.notification import (
    create_teacher_notifications,
)
from app.utils.risk_incidents import sync_attendance_risk_incident

from .models import Attendance, AttendanceStat, Group, NotificationPreference, Schedule, Student

logger = logging.getLogger(__name__)


def _notify_schedule_change(schedule, *, title: str, message: str, payload: dict) -> None:
    teachers = []
    if schedule.teacher_id:
        teachers.append(schedule.teacher)
    elif schedule.group_id and schedule.group and schedule.group.teacher_id:
        teachers.append(schedule.group.teacher)

    if not teachers:
        return

    create_teacher_notifications(
        teachers=teachers,
        event_type=NotificationTypeChoices.SCHEDULE_CHANGED,
        title=title,
        message=message,
        payload=payload,
    )


def _notify_group_change(group: Group, *, title: str, message: str, payload: dict) -> None:
    if not group.teacher_id:
        return

    create_teacher_notifications(
        teachers=[group.teacher],
        event_type=NotificationTypeChoices.GROUP_CHANGED,
        title=title,
        message=message,
        payload=payload,
    )


def _notify_student_performance_if_needed(
    *, student_id: int, group_id: int, subject_id: int, schedule_id: int
) -> None:
    stat = AttendanceStat.objects.filter(
        student_id=student_id,
        subject_id=subject_id,
        group_id=group_id,
    ).first()
    if not stat or stat.total <= 0:
        return

    current_percent = round((stat.attended / stat.total) * 100)
    student = Student.objects.filter(id=student_id).first()
    if not student:
        return

    schedule = Schedule.objects.select_related("group", "subject", "teacher", "group__teacher").get(
        id=schedule_id
    )
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


@receiver(pre_save, sender=Schedule)
def cache_old_schedule(sender, instance, **kwargs):
    if not instance.pk:
        instance._old_schedule = None
        return

    instance._old_schedule = (
        Schedule.objects.filter(pk=instance.pk)
        .values(
            "date",
            "time",
            "group_id",
            "subject_id",
            "teacher_id",
        )
        .first()
    )


@receiver(post_save, sender=Schedule)
def create_attendance_for_schedule(sender, instance, created, **kwargs):
    if not created:
        return

    schedule = instance
    group = schedule.group
    subject = schedule.subject

    logger.info(
        "Schedule created: schedule_id=%s group_id=%s subject_id=%s date=%s time=%s",
        schedule.id,
        group.id,
        subject.id,
        schedule.date,
        schedule.time,
    )

    def _on_commit():
        logger.info(
            "on_commit fired: schedule_id=%s group_id=%s subject_id=%s",
            schedule.id,
            group.id,
            subject.id,
        )

        student_ids = list(group.students.values_list("id", flat=True))
        logger.info(
            "Students in group for schedule_id=%s: count=%s",
            schedule.id,
            len(student_ids),
        )

        if not student_ids:
            logger.warning(
                "No students found in group: schedule_id=%s group_id=%s",
                schedule.id,
                group.id,
            )
        else:
            created_att = Attendance.objects.bulk_create(
                [
                    Attendance(student_id=sid, schedule_id=schedule.id, presense=False)
                    for sid in student_ids
                ],
                ignore_conflicts=True,
                batch_size=1000,
            )

            logger.info(
                "Attendance bulk_create done: schedule_id=%s requested=%s returned=%s",
                schedule.id,
                len(student_ids),
                len(created_att),
            )

            existing_stats = set(
                AttendanceStat.objects.filter(
                    group_id=group.id,
                    subject_id=subject.id,
                    student_id__in=student_ids,
                ).values_list("student_id", flat=True)
            )
            to_update = list(existing_stats)
            to_create = [sid for sid in student_ids if sid not in existing_stats]

            if to_update:
                AttendanceStat.objects.filter(
                    group_id=group.id,
                    subject_id=subject.id,
                    student_id__in=to_update,
                ).update(total=F("total") + 1)

            if to_create:
                AttendanceStat.objects.bulk_create(
                    [
                        AttendanceStat(
                            student_id=sid,
                            subject_id=subject.id,
                            group_id=group.id,
                            total=1,
                            attended=0,
                        )
                        for sid in to_create
                    ],
                    batch_size=1000,
                )

        _notify_schedule_change(
            schedule,
            title="Добавлено занятие в расписание",
            message=(
                f"Группа {group.name}: {subject.name} "
                f"{schedule.date} {schedule.time.strftime('%H:%M')}"
            ),
            payload={
                "schedule_id": schedule.id,
                "group_id": group.id,
                "subject_id": subject.id,
                "date": str(schedule.date),
                "time": str(schedule.time),
                "action": "created",
            },
        )

    transaction.on_commit(_on_commit)


@receiver(post_save, sender=Schedule)
def notify_schedule_updated(sender, instance, created, **kwargs):
    if created:
        return

    old = getattr(instance, "_old_schedule", None)
    if not old:
        return

    changes = {}
    tracked_fields = ("date", "time", "group_id", "subject_id", "teacher_id")
    for field in tracked_fields:
        old_value = old.get(field)
        new_value = getattr(instance, field)
        if old_value != new_value:
            changes[field] = {"old": old_value, "new": new_value}

    if not changes:
        return

    def _on_commit():
        _notify_schedule_change(
            instance,
            title="Изменено занятие в расписании",
            message=f"Изменено занятие #{instance.id}.",
            payload={
                "schedule_id": instance.id,
                "changes": changes,
                "action": "updated",
            },
        )

    transaction.on_commit(_on_commit)


@receiver(pre_save, sender=Group)
def cache_old_group(sender, instance, **kwargs):
    if not instance.pk:
        instance._old_group = None
        return

    instance._old_group = (
        Group.objects.filter(pk=instance.pk)
        .values(
            "name",
            "course",
            "group_specialty",
            "teacher_id",
        )
        .first()
    )


@receiver(post_save, sender=Group)
def notify_group_updated(sender, instance, created, **kwargs):
    if created:
        return

    old = getattr(instance, "_old_group", None)
    if not old:
        return

    changes = {}
    tracked_fields = ("name", "course", "group_specialty", "teacher_id")
    for field in tracked_fields:
        old_value = old.get(field)
        new_value = getattr(instance, field)
        if old_value != new_value:
            changes[field] = {"old": old_value, "new": new_value}

    if not changes:
        return

    def _on_commit():
        _notify_group_change(
            instance,
            title="Изменены данные группы",
            message=f"Группа {instance.name}: обновлены данные.",
            payload={"group_id": instance.id, "changes": changes, "action": "updated"},
        )

    transaction.on_commit(_on_commit)


@receiver(pre_save, sender=Student)
def cache_old_student(sender, instance, **kwargs):
    if not instance.pk:
        instance._old_student = None
        return

    instance._old_student = (
        Student.objects.filter(pk=instance.pk)
        .values(
            "first_name",
            "last_name",
            "email",
            "phone",
            "telegram_id",
            "telegram_username",
        )
        .first()
    )


@receiver(post_save, sender=Student)
def ensure_notification_preference_exists(sender, instance, created, **kwargs):
    if not created:
        return

    NotificationPreference.objects.get_or_create(
        student=instance,
        defaults={
            "enabled": True,
            "allow_email": bool(instance.email),
            "allow_telegram": bool(instance.telegram_id or instance.telegram_username),
        },
    )


@receiver(post_save, sender=Student)
def notify_student_updated(sender, instance, created, **kwargs):
    if created:
        return

    old = getattr(instance, "_old_student", None)
    if not old:
        return

    tracked_fields = (
        "first_name",
        "last_name",
        "email",
        "phone",
        "telegram_id",
        "telegram_username",
    )
    changed_fields = {}
    for field in tracked_fields:
        old_value = old.get(field)
        new_value = getattr(instance, field)
        if old_value != new_value:
            changed_fields[field] = {"old": old_value, "new": new_value}

    if not changed_fields:
        return

    teachers = {}
    for group in instance.groups.select_related("teacher").all():
        if group.teacher_id:
            teachers[group.teacher_id] = group.teacher

    if not teachers:
        return

    def _on_commit():
        create_teacher_notifications(
            teachers=teachers.values(),
            event_type=NotificationTypeChoices.STUDENT_CHANGED,
            title="Изменены данные студента",
            message=f"Обновлены данные студента {instance.first_name} {instance.last_name}.",
            payload={"student_id": instance.id, "changes": changed_fields},
        )

    transaction.on_commit(_on_commit)


@receiver(m2m_changed, sender=Group.students.through)
def notify_group_students_changed(sender, instance, action, pk_set, **kwargs):
    if action not in {"post_add", "post_remove", "post_clear"}:
        return

    changed_count = len(pk_set) if pk_set else 0
    action_label = {
        "post_add": "students_added",
        "post_remove": "students_removed",
        "post_clear": "students_cleared",
    }[action]

    def _on_commit():
        _notify_group_change(
            instance,
            title="Изменен состав группы",
            message=f"Группа {instance.name}: {action_label} ({changed_count}).",
            payload={
                "group_id": instance.id,
                "action": action_label,
                "changed_count": changed_count,
                "student_ids": list(pk_set) if pk_set else [],
            },
        )

    transaction.on_commit(_on_commit)


@receiver(pre_save, sender=Attendance)
def cache_old_presense(sender, instance, **kwargs):
    if not instance.pk:
        instance._old_presense = None
        return
    old = Attendance.objects.only("presense").filter(pk=instance.pk).first()
    instance._old_presense = old.presense if old else None


@receiver(post_save, sender=Attendance)
def update_stat_on_attendance_save(sender, instance, created, **kwargs):
    schedule = instance.schedule
    group_id = schedule.group_id
    subject_id = schedule.subject_id
    student_id = instance.student_id

    if created:
        if instance.presense:
            logger.info(
                "Attendance created with presense=True: attendance_id=%s student_id=%s schedule_id=%s",
                instance.id,
                student_id,
                schedule.id,
            )
        return

    old = getattr(instance, "_old_presense", None)
    new = instance.presense
    if old is None or old == new:
        return

    delta = 1 if (old is False and new is True) else -1

    if instance.marked_at is None:
        Attendance.objects.filter(pk=instance.pk).update(marked_at=timezone.now())

    AttendanceStat.objects.update_or_create(
        student_id=student_id,
        subject_id=subject_id,
        group_id=group_id,
        defaults={},
    )
    AttendanceStat.objects.filter(
        student_id=student_id,
        subject_id=subject_id,
        group_id=group_id,
    ).update(attended=F("attended") + delta)

    _notify_student_performance_if_needed(
        student_id=student_id,
        group_id=group_id,
        subject_id=subject_id,
        schedule_id=schedule.id,
    )


@receiver(post_delete, sender=Attendance)
def update_stat_on_attendance_delete(sender, instance, **kwargs):
    schedule = instance.schedule
    qs = AttendanceStat.objects.filter(
        student_id=instance.student_id,
        subject_id=schedule.subject_id,
        group_id=schedule.group_id,
    )

    qs.filter(total__gt=0).update(total=F("total") - 1)
    if instance.presense:
        qs.filter(attended__gt=0).update(attended=F("attended") - 1)
