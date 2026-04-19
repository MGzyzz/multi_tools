import logging
from datetime import date, timedelta

from django.db import transaction
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from api.serializer import (
    GroupSerializer,
    SchedulePlannerEntrySerializer,
    SchedulePlannerSaveSerializer,
    ScheduleSemesterPlanSerializer,
    ScheduleSerializer,
)
from api.views.attendanceAPI import IsTeacher
from app.models import Attendance, Auditorium, Group, Schedule, Subject_study
from app.models._choices import NotificationTypeChoices
from app.utils.notification import create_teacher_notifications
from app.utils.schedule_planner import (
    build_planner_time_slots,
    bulk_seed_schedule_dependencies,
    expand_semester_pattern,
)

logger = logging.getLogger(__name__)


class ScheduleListAPI(APIView):
    permission_classes = [IsAuthenticated, IsTeacher]

    def get(self, request, *args, **kwargs):
        teacher = request.user.teacher_profile
        start_date = (
            _parse_date_param(request.query_params.get("date_from")) or timezone.localdate()
        )
        end_date = _parse_date_param(request.query_params.get("date_to")) or start_date

        schedules = Schedule.objects.select_related("subject", "auditorium").filter(
            teacher=teacher,
            date__range=(start_date, end_date),
        )

        group_id = request.query_params.get("group_id")
        if group_id:
            schedules = schedules.filter(group_id=group_id)

        schedules = schedules.order_by("date", "time", "id")
        serializer = ScheduleSerializer(schedules, many=True)
        return _apply_no_store(Response(serializer.data))


class SchedulePlannerAPI(APIView):
    permission_classes = [IsAuthenticated, IsTeacher]

    def get(self, request, *args, **kwargs):
        teacher = request.user.teacher_profile
        group_id = request.query_params.get("group_id")
        if not group_id:
            groups = _get_accessible_groups_for_teacher(teacher_id=teacher.id)
            return _apply_no_store(
                Response(
                    {
                        "groups": _serialize_planner_group_list(
                            groups=groups,
                            teacher_id=teacher.id,
                        )
                    }
                )
            )

        start_date = _parse_date_param(request.query_params.get("start_date")) or _start_of_week(
            timezone.localdate()
        )
        end_date = _parse_date_param(request.query_params.get("end_date")) or (
            start_date + timedelta(days=5)
        )

        if end_date < start_date:
            return Response(
                {"detail": "end_date must not be earlier than start_date."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        group = _get_group_for_teacher(group_id=group_id, teacher_id=teacher.id)
        return _apply_no_store(
            Response(
                _serialize_planner_payload(
                    group=group,
                    teacher_id=teacher.id,
                    start_date=start_date,
                    end_date=end_date,
                )
            )
        )

    def post(self, request, *args, **kwargs):
        teacher = request.user.teacher_profile
        serializer = SchedulePlannerSaveSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payload = serializer.validated_data

        group = _get_group_for_teacher(group_id=payload["group_id"], teacher_id=teacher.id)
        create_items = payload.get("create", [])
        update_items = payload.get("update", [])
        delete_ids = set(payload.get("delete", []))

        for item in update_items:
            if "id" not in item:
                return Response(
                    {"detail": "Each update item must include an id."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        try:
            subject_map = _get_subject_map(
                teacher_id=teacher.id,
                group=group,
                subject_ids={item["subject_id"] for item in [*create_items, *update_items]},
            )
            auditorium_map = _get_auditorium_map(
                teacher_id=teacher.id,
                auditorium_ids={
                    item["auditorium_id"]
                    for item in [*create_items, *update_items]
                    if item.get("auditorium_id")
                },
            )
        except ValueError as exc:
            return Response(exc.args[0], status=status.HTTP_400_BAD_REQUEST)

        update_ids = {item["id"] for item in update_items}
        editable_schedules = {
            schedule.id: schedule
            for schedule in Schedule.objects.select_related("subject").filter(
                id__in=update_ids | delete_ids,
                group_id=group.id,
                teacher_id=teacher.id,
            )
        }

        missing_editable_ids = (update_ids | delete_ids) - set(editable_schedules)
        if missing_editable_ids:
            return Response(
                {
                    "detail": "Some schedules are not available for editing.",
                    "ids": sorted(missing_editable_ids),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        slot_owners: dict[tuple[date, object], str] = {}
        try:
            for item in create_items:
                _register_slot(slot_owners=slot_owners, item=item, item_label="create")

            for item in update_items:
                schedule = editable_schedules[item["id"]]
                if item["subject_id"] != schedule.subject_id:
                    return Response(
                        {
                            "detail": (
                                "Changing the subject of an existing lesson is not supported. "
                                "Delete the lesson and create a new one."
                            ),
                            "schedule_id": schedule.id,
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                _register_slot(
                    slot_owners=slot_owners,
                    item=item,
                    item_label=f"update:{schedule.id}",
                )
        except ValueError as exc:
            return Response(exc.args[0], status=status.HTTP_400_BAD_REQUEST)

        conflict_schedules = _find_group_slot_conflicts(
            group_id=group.id,
            slot_pairs=list(slot_owners),
            excluded_ids=update_ids | delete_ids,
        )
        if conflict_schedules:
            return Response(
                {
                    "detail": "One or more selected slots are already occupied.",
                    "conflicts": [
                        {
                            "id": schedule.id,
                            "date": schedule.date,
                            "time": schedule.time,
                            "subject_name": schedule.subject.name,
                            "teacher_name": _get_teacher_name(schedule),
                        }
                        for schedule in conflict_schedules
                    ],
                },
                status=status.HTTP_409_CONFLICT,
            )

        with transaction.atomic():
            if delete_ids:
                Schedule.objects.filter(id__in=delete_ids, teacher_id=teacher.id).delete()

            for item in update_items:
                schedule = editable_schedules[item["id"]]
                schedule.date = item["date"]
                schedule.time = item["time"]
                schedule.auditorium = auditorium_map.get(item.get("auditorium_id"))
                schedule.save(update_fields=["date", "time", "auditorium"])

            for item in create_items:
                Schedule.objects.create(
                    group=group,
                    subject=subject_map[item["subject_id"]],
                    auditorium=auditorium_map.get(item.get("auditorium_id")),
                    teacher=teacher,
                    date=item["date"],
                    time=item["time"],
                )

        response_payload = _serialize_planner_payload(
            group=group,
            teacher_id=teacher.id,
            start_date=payload["start_date"],
            end_date=payload["end_date"],
        )
        return _apply_no_store(Response(response_payload, status=status.HTTP_200_OK))


class ScheduleSemesterPreviewAPI(APIView):
    permission_classes = [IsAuthenticated, IsTeacher]

    def post(self, request, *args, **kwargs):
        teacher = request.user.teacher_profile
        serializer = ScheduleSemesterPlanSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payload = serializer.validated_data

        group = _get_group_for_teacher(group_id=payload["group_id"], teacher_id=teacher.id)
        try:
            subject_map = _get_subject_map(
                teacher_id=teacher.id,
                group=group,
                subject_ids={item["subject_id"] for item in payload["pattern"]},
            )
            auditorium_map = _get_auditorium_map(
                teacher_id=teacher.id,
                auditorium_ids={
                    item["auditorium_id"] for item in payload["pattern"] if item.get("auditorium_id")
                },
            )
        except ValueError as exc:
            return Response(exc.args[0], status=status.HTTP_400_BAD_REQUEST)
        occurrences = expand_semester_pattern(
            pattern=payload["pattern"],
            start_date=payload["start_date"],
            end_date=payload["end_date"],
        )

        conflict_schedules = _find_group_slot_conflicts(
            group_id=group.id,
            slot_pairs=[(item["date"], item["time"]) for item in occurrences],
            excluded_ids=set(),
        )
        conflict_map = {(schedule.date, schedule.time): schedule for schedule in conflict_schedules}
        creatable_count = sum(
            1 for item in occurrences if (item["date"], item["time"]) not in conflict_map
        )

        return _apply_no_store(
            Response(
                {
                    "group": {"id": group.id, "name": group.name},
                    "range": {
                        "start_date": payload["start_date"],
                        "end_date": payload["end_date"],
                    },
                    "pattern_items": len(payload["pattern"]),
                    "total_occurrences": len(occurrences),
                    "creatable_count": creatable_count,
                    "conflict_count": len(conflict_schedules),
                    "conflicts": [
                        {
                            "date": item["date"],
                            "time": item["time"],
                            "subject_name": subject_map[item["subject_id"]].name,
                            "occupied_by": conflict_map[(item["date"], item["time"])].subject.name,
                            "teacher_name": _get_teacher_name(
                                conflict_map[(item["date"], item["time"])]
                            ),
                        }
                        for item in occurrences
                        if (item["date"], item["time"]) in conflict_map
                    ][:20],
                },
                status=status.HTTP_200_OK,
            )
        )


class ScheduleSemesterApplyAPI(APIView):
    permission_classes = [IsAuthenticated, IsTeacher]

    def post(self, request, *args, **kwargs):
        teacher = request.user.teacher_profile
        serializer = ScheduleSemesterPlanSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payload = serializer.validated_data

        group = _get_group_for_teacher(group_id=payload["group_id"], teacher_id=teacher.id)
        try:
            subject_map = _get_subject_map(
                teacher_id=teacher.id,
                group=group,
                subject_ids={item["subject_id"] for item in payload["pattern"]},
            )
            auditorium_map = _get_auditorium_map(
                teacher_id=teacher.id,
                auditorium_ids={
                    item["auditorium_id"] for item in payload["pattern"] if item.get("auditorium_id")
                },
            )
        except ValueError as exc:
            return Response(exc.args[0], status=status.HTTP_400_BAD_REQUEST)
        occurrences = expand_semester_pattern(
            pattern=payload["pattern"],
            start_date=payload["start_date"],
            end_date=payload["end_date"],
        )

        conflict_schedules = _find_group_slot_conflicts(
            group_id=group.id,
            slot_pairs=[(item["date"], item["time"]) for item in occurrences],
            excluded_ids=set(),
        )
        conflict_slots = {(schedule.date, schedule.time) for schedule in conflict_schedules}

        schedules_to_create = [
            Schedule(
                group=group,
                subject=subject_map[item["subject_id"]],
                auditorium=auditorium_map.get(item.get("auditorium_id")),
                teacher=teacher,
                date=item["date"],
                time=item["time"],
            )
            for item in occurrences
            if (item["date"], item["time"]) not in conflict_slots
        ]

        with transaction.atomic():
            created_schedules = Schedule.objects.bulk_create(schedules_to_create, batch_size=200)
            dependency_stats = bulk_seed_schedule_dependencies(
                group=group,
                created_schedules=created_schedules,
            )

        if created_schedules:
            create_teacher_notifications(
                teachers=[teacher],
                event_type=NotificationTypeChoices.SCHEDULE_CHANGED,
                title="Семестровое расписание добавлено",
                message=(
                    f"Группа {group.name}: создано {len(created_schedules)} занятий "
                    f"за период {payload['start_date']} — {payload['end_date']}."
                ),
                payload={
                    "group_id": group.id,
                    "created_count": len(created_schedules),
                    "conflict_count": len(conflict_schedules),
                    "action": "semester_created",
                },
            )

        return _apply_no_store(
            Response(
                {
                    "group": {"id": group.id, "name": group.name},
                    "created_count": len(created_schedules),
                    "conflict_count": len(conflict_schedules),
                    "attendance_rows_created": dependency_stats["attendance_rows"],
                    "stats_created": dependency_stats["stats_created"],
                    "stats_updated": dependency_stats["stats_updated"],
                },
                status=status.HTTP_201_CREATED,
            )
        )


class GetScheduleWithAttendens(APIView):
    permission_classes = [IsAuthenticated, IsTeacher]

    def get(self, request, *args, **kwargs):
        schedule_id = kwargs.get("pk")

        try:
            schedule = Schedule.objects.select_related("group", "teacher").get(id=schedule_id)
        except Schedule.DoesNotExist:
            return Response({"error": "Schedule not found"}, status=status.HTTP_404_NOT_FOUND)

        if schedule.teacher_id != request.user.teacher_profile.id:
            return Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)

        students = schedule.group.students.all()

        data = []
        for student in students:
            attendance = student.attendance.filter(schedule=schedule).first()

            if not attendance:
                attendance = Attendance.objects.create(
                    student=student,
                    schedule=schedule,
                    presense=False,
                )

            data.append(
                {
                    "id": attendance.id,
                    "student_id": student.id,
                    "first_name": student.first_name,
                    "last_name": student.last_name,
                    "presense": attendance.presense,
                    "marked_at": attendance.marked_at,
                }
            )

        return Response({"students": data}, status=status.HTTP_200_OK)


class GetScheduleGroupId(APIView):
    permission_classes = [IsAuthenticated, IsTeacher]

    def get(self, request, pk, *args, **kwargs):
        try:
            schedule = Schedule.objects.select_related("group", "teacher").get(id=pk)
            group = schedule.group
        except Schedule.DoesNotExist:
            return Response({"error": "Schedule not found"}, status=status.HTTP_404_NOT_FOUND)

        if schedule.teacher_id != request.user.teacher_profile.id:
            return Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)

        serializer = GroupSerializer(group)
        return Response(serializer.data)


def _serialize_planner_payload(
    *, group: Group, teacher_id: int, start_date: date, end_date: date
) -> dict:
    schedules = list(
        Schedule.objects.filter(group_id=group.id, date__range=(start_date, end_date))
        .select_related("subject", "teacher__user", "auditorium")
        .order_by("date", "time", "id")
    )
    subjects = list(
        Subject_study.objects.filter(groups=group, teacher_id=teacher_id)
        .distinct()
        .order_by("name")
        .values("id", "name", "description")
    )

    serializer = SchedulePlannerEntrySerializer(
        schedules,
        many=True,
        context={"current_teacher_id": teacher_id},
    )

    days = []
    cursor = start_date
    while cursor <= end_date:
        days.append({"date": cursor, "weekday": cursor.weekday()})
        cursor += timedelta(days=1)

    return {
        "group": {
            "id": group.id,
            "name": group.name,
            "course": group.course,
            "specialty": group.group_specialty,
        },
        "range": {"start_date": start_date, "end_date": end_date},
        "days": days,
        "time_slots": build_planner_time_slots(schedules=schedules),
        "available_subjects": subjects,
        "entries": serializer.data,
    }


def _find_group_slot_conflicts(
    *, group_id: int, slot_pairs: list[tuple[date, object]], excluded_ids: set[int]
) -> list[Schedule]:
    if not slot_pairs:
        return []

    slot_query = Q()
    for slot_date, slot_time in slot_pairs:
        slot_query |= Q(date=slot_date, time=slot_time)

    queryset = (
        Schedule.objects.filter(group_id=group_id)
        .filter(slot_query)
        .select_related("subject", "teacher__user", "auditorium")
        .order_by("date", "time", "id")
    )
    if excluded_ids:
        queryset = queryset.exclude(id__in=excluded_ids)
    return list(queryset)


def _get_accessible_groups_for_teacher(*, teacher_id: int):
    return (
        Group.objects.filter(Q(teacher_id=teacher_id) | Q(subjects__teacher_id=teacher_id))
        .only("id", "name", "course", "group_specialty", "teacher_id")
        .distinct()
        .order_by("course", "name", "id")
    )


def _get_group_for_teacher(*, group_id: int | str, teacher_id: int) -> Group:
    return get_object_or_404(
        _get_accessible_groups_for_teacher(teacher_id=teacher_id),
        id=group_id,
    )


def _get_subject_map(
    *, teacher_id: int, group: Group, subject_ids: set[int]
) -> dict[int, Subject_study]:
    if not subject_ids:
        return {}

    subject_map = {
        subject.id: subject
        for subject in Subject_study.objects.filter(
            id__in=subject_ids,
            teacher_id=teacher_id,
            groups=group,
        ).distinct()
    }

    missing_ids = subject_ids - set(subject_map)
    if missing_ids:
        raise_subject_error = {
            "detail": "Some subjects are not available for this group.",
            "subject_ids": sorted(missing_ids),
        }
        raise ValueError(raise_subject_error)

    return subject_map


def _get_auditorium_map(*, teacher_id: int, auditorium_ids: set[int]) -> dict[int, Auditorium]:
    if not auditorium_ids:
        return {}

    auditorium_map = {
        auditorium.id: auditorium
        for auditorium in Auditorium.objects.filter(id__in=auditorium_ids, teacher_id=teacher_id)
    }

    missing_ids = auditorium_ids - set(auditorium_map)
    if missing_ids:
        raise ValueError(
            {
                "detail": "Some auditoriums are not available for this teacher.",
                "auditorium_ids": sorted(missing_ids),
            }
        )

    return auditorium_map


def _get_teacher_name(schedule: Schedule) -> str:
    if schedule.teacher and schedule.teacher.user:
        return schedule.teacher.user.get_full_name() or schedule.teacher.user.username
    return "Преподаватель не указан"


def _parse_date_param(raw_value: str | None) -> date | None:
    if not raw_value:
        return None
    try:
        return date.fromisoformat(raw_value)
    except ValueError:
        return None


def _register_slot(*, slot_owners: dict, item: dict, item_label: str) -> None:
    slot = (item["date"], item["time"])
    if slot in slot_owners:
        raise ValueError(
            {
                "detail": "The request contains duplicate slot assignments.",
                "slot": {"date": item["date"], "time": item["time"]},
                "owners": [slot_owners[slot], item_label],
            }
        )
    slot_owners[slot] = item_label


def _start_of_week(value: date) -> date:
    return value - timedelta(days=value.weekday())


def _serialize_planner_group_list(*, groups, teacher_id: int) -> list[dict]:
    return [
        {
            "id": group.id,
            "name": group.name,
            "course": group.course,
            "specialty": group.group_specialty,
            "is_owner": group.teacher_id == teacher_id,
        }
        for group in groups
    ]


def _apply_no_store(response: Response) -> Response:
    response["Cache-Control"] = "no-store, max-age=0"
    response["Pragma"] = "no-cache"
    response["Expires"] = "0"
    return response
