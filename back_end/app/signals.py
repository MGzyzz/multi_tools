import logging

from django.db import transaction
from django.db.models import F
from django.db.models.signals import post_delete, post_save, pre_save
from django.dispatch import receiver
from django.utils import timezone

from .models import Attendance, AttendanceStat, Schedule

logger = logging.getLogger(__name__)


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
            return

        created_att = Attendance.objects.bulk_create(
            [
                Attendance(student_id=sid, schedule_id=schedule.id, presense=False)
                for sid in student_ids
            ],
            ignore_conflicts=True,
            batch_size=1000,
        )

        # ВАЖНО: bulk_create возвращает созданные объекты ТОЛЬКО если БД/настройки позволяют.
        # Но длина списка часто совпадает с вставленными, если нет конфликтов.
        logger.info(
            "Attendance bulk_create done: schedule_id=%s requested=%s returned=%s (may be меньше if conflicts)",
            schedule.id,
            len(student_ids),
            len(created_att),
        )

        existing_stats = set(
            AttendanceStat.objects.filter(
                group_id=group.id, subject_id=subject.id, student_id__in=student_ids
            ).values_list("student_id", flat=True)
        )
        to_update = list(existing_stats)
        to_create = [sid for sid in student_ids if sid not in existing_stats]

        logger.info(
            "AttendanceStat split: schedule_id=%s to_update=%s to_create=%s",
            schedule.id,
            len(to_update),
            len(to_create),
        )

        if to_update:
            updated = AttendanceStat.objects.filter(
                group_id=group.id, subject_id=subject.id, student_id__in=to_update
            ).update(total=F("total") + 1)
            logger.info(
                "AttendanceStat updated totals: schedule_id=%s rows_updated=%s",
                schedule.id,
                updated,
            )

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
            logger.info(
                "AttendanceStat bulk_created: schedule_id=%s rows_created=%s",
                schedule.id,
                len(to_create),
            )

        # Контрольный чек: сколько Attendance реально в БД на этот schedule
        actual_count = Attendance.objects.filter(schedule_id=schedule.id).count()
        logger.info(
            "Attendance actual count after create: schedule_id=%s actual=%s expected=%s",
            schedule.id,
            actual_count,
            len(student_ids),
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
        # Обычно created идёт массово при bulk_create и presense=False
        # Логи здесь лучше не спамить.
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

    logger.info(
        "Attendance presense changed: attendance_id=%s student_id=%s schedule_id=%s old=%s new=%s delta=%s",
        instance.id,
        student_id,
        schedule.id,
        old,
        new,
        delta,
    )

    if instance.marked_at is None:
        Attendance.objects.filter(pk=instance.pk).update(marked_at=timezone.now())

    AttendanceStat.objects.update_or_create(
        student_id=student_id, subject_id=subject_id, group_id=group_id, defaults={}
    )
    AttendanceStat.objects.filter(
        student_id=student_id, subject_id=subject_id, group_id=group_id
    ).update(attended=F("attended") + delta)


@receiver(post_delete, sender=Attendance)
def update_stat_on_attendance_delete(sender, instance, **kwargs):
    schedule = instance.schedule
    qs = AttendanceStat.objects.filter(
        student_id=instance.student_id,
        subject_id=schedule.subject_id,
        group_id=schedule.group_id,
    )

    # total уменьшаем только если total > 0
    qs.filter(total__gt=0).update(total=F("total") - 1)

    # attended уменьшаем только если attended > 0 и instance.presense=True
    if instance.presense:
        qs.filter(attended__gt=0).update(attended=F("attended") - 1)
