from datetime import date, timedelta

from django.db.models import Count, Q, Sum
from django.db.models.functions import TruncWeek
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from app.models import Attendance, AttendanceStat, Group, RiskIncident
from app.models._choices import RiskIncidentStatusChoices


def get_period(period: str):
    today = date.today()
    if period == "today":
        return today, today
    if period == "week":
        start = today - timedelta(days=today.weekday())
        end = start + timedelta(days=6)
        return start, end
    if period == "month":
        start = today.replace(day=1)
        next_month = (start.replace(day=28) + timedelta(days=4)).replace(day=1)
        end = next_month - timedelta(days=1)
        return start, end
    return None, None


class AnalyticsSummaryAPI(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        teacher = request.user.teacher_profile

        stats = AttendanceStat.objects.filter(group__teacher=teacher, total__gt=0)
        student_stats = list(
            stats.values("student_id").annotate(total=Sum("total"), attended=Sum("attended"))
        )
        total_students = len(student_stats)

        def _pct(s) -> float:
            return min(100.0, s["attended"] / s["total"] * 100)

        if total_students > 0:
            attendances = [_pct(s) for s in student_stats]
            avg_attendance = round(sum(attendances) / len(attendances))
        else:
            avg_attendance = 0

        all_student_ids = {s["student_id"] for s in student_stats}
        high_ids = (
            set(
                RiskIncident.objects.filter(
                    group__teacher=teacher,
                    status__in=[
                        RiskIncidentStatusChoices.OPEN,
                        RiskIncidentStatusChoices.ESCALATED,
                    ],
                ).values_list("student_id", flat=True)
            )
            & all_student_ids
        )

        medium_ids = {
            s["student_id"]
            for s in student_stats
            if s["student_id"] not in high_ids and _pct(s) < 80
        }

        high = len(high_ids)
        medium = len(medium_ids)
        low = max(0, total_students - high - medium)

        eight_weeks_ago = date.today() - timedelta(weeks=8)
        weekly_qs = (
            Attendance.objects.filter(
                schedule__group__teacher=teacher, schedule__date__gte=eight_weeks_ago
            )
            .annotate(week=TruncWeek("schedule__date"))
            .values("week")
            .annotate(total=Count("id"), attended=Count("id", filter=Q(presense=True)))
            .order_by("week")
        )
        trend = [
            {
                "week": f"W{i + 1}",
                "value": round(w["attended"] / w["total"] * 100) if w["total"] > 0 else 0,
            }
            for i, w in enumerate(weekly_qs)
        ]

        return Response(
            {
                "avg_attendance": avg_attendance,
                "total_students": total_students,
                "risk_breakdown": {"high": high, "medium": medium, "low": low},
                "attendance_trend": trend,
            }
        )


class AnalyticsGroupsAPI(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        teacher = request.user.teacher_profile
        groups = Group.objects.filter(teacher=teacher)

        active_risk_rows = (
            RiskIncident.objects.filter(
                group__teacher=teacher,
                status__in=[RiskIncidentStatusChoices.OPEN, RiskIncidentStatusChoices.ESCALATED],
            )
            .values("group_id", "student_id")
            .distinct()
        )

        risk_by_group: dict[int, set] = {}
        for r in active_risk_rows:
            risk_by_group.setdefault(r["group_id"], set()).add(r["student_id"])

        result = []
        for group in groups:
            group_stats = list(
                AttendanceStat.objects.filter(group=group, total__gt=0)
                .values("student_id")
                .annotate(total=Sum("total"), attended=Sum("attended"))
            )
            attendances = [
                min(100.0, s["attended"] / s["total"] * 100) for s in group_stats if s["total"] > 0
            ]
            avg_att = round(sum(attendances) / len(attendances)) if attendances else 0

            primary_subject = (
                AttendanceStat.objects.filter(group=group)
                .values("subject__name")
                .annotate(c=Count("id"))
                .order_by("-c")
                .first()
            )

            result.append(
                {
                    "id": group.id,
                    "name": group.name,
                    "subject": primary_subject["subject__name"] if primary_subject else "—",
                    "avg_attendance": avg_att,
                    "at_risk": len(risk_by_group.get(group.id, set())),
                }
            )

        return Response(result)


class AnalyticsGroupStudentsAPI(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, group_id):
        teacher = request.user.teacher_profile
        try:
            group = Group.objects.get(id=group_id, teacher=teacher)
        except Group.DoesNotExist:
            return Response([])

        group_stats = list(
            AttendanceStat.objects.filter(group=group, total__gt=0)
            .values("student_id")
            .annotate(total=Sum("total"), attended=Sum("attended"))
        )

        high_ids = set(
            RiskIncident.objects.filter(
                group=group,
                status__in=[RiskIncidentStatusChoices.OPEN, RiskIncidentStatusChoices.ESCALATED],
            ).values_list("student_id", flat=True)
        )

        result = []
        for s in group_stats:
            pct = min(100.0, s["attended"] / s["total"] * 100)
            if s["student_id"] in high_ids:
                risk = "high"
            elif pct < 80:
                risk = "medium"
            else:
                risk = "low"
            result.append(
                {
                    "student_id": s["student_id"],
                    "risk": risk,
                    "attendance_pct": round(pct),
                }
            )

        return Response(result)
