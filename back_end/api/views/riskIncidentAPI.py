from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import TeacherProfile
from api.serializer import (
    RiskIncidentAcknowledgeSerializer,
    RiskIncidentEscalateSerializer,
    RiskIncidentResolveSerializer,
    RiskIncidentSerializer,
)
from api.views.attendanceAPI import IsTeacher
from app.models import Group, RiskIncident
from app.utils.risk_incidents import (
    acknowledge_risk_incident,
    escalate_risk_incident,
    resolve_risk_incident,
)


class RiskIncidentListAPI(APIView):
    permission_classes = [IsAuthenticated, IsTeacher]

    def get(self, request, *args, **kwargs):
        teacher = request.user.teacher_profile
        qs = (
            RiskIncident.objects.filter(_teacher_scope_filter(teacher))
            .select_related("student", "assigned_teacher__user", "escalated_to__user")
            .prefetch_related("actions__teacher__user")
            .order_by("-created_at")
            .distinct()
        )

        status_value = request.query_params.get("status")
        if status_value:
            qs = qs.filter(status=status_value)

        incident_type = request.query_params.get("incident_type")
        if incident_type:
            qs = qs.filter(incident_type=incident_type)

        student_id = request.query_params.get("student_id")
        if student_id:
            qs = qs.filter(student_id=student_id)

        serializer = RiskIncidentSerializer(qs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class StudentRiskIncidentListAPI(APIView):
    permission_classes = [IsAuthenticated, IsTeacher]

    def get(self, request, student_id, *args, **kwargs):
        teacher = request.user.teacher_profile
        belongs = Group.objects.filter(teacher=teacher, students__id=student_id).exists()
        if not belongs:
            return Response({"detail": "Student not found."}, status=status.HTTP_404_NOT_FOUND)

        qs = (
            RiskIncident.objects.filter(student_id=student_id)
            .filter(_teacher_scope_filter(teacher))
            .select_related("student", "assigned_teacher__user", "escalated_to__user")
            .prefetch_related("actions__teacher__user")
            .order_by("-created_at")
        )
        serializer = RiskIncidentSerializer(qs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class RiskIncidentAcknowledgeAPI(APIView):
    permission_classes = [IsAuthenticated, IsTeacher]

    def post(self, request, incident_id, *args, **kwargs):
        teacher = request.user.teacher_profile
        incident = _get_incident_for_teacher(teacher=teacher, incident_id=incident_id)

        serializer = RiskIncidentAcknowledgeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        acknowledge_risk_incident(
            incident=incident,
            teacher=teacher,
            comment=serializer.validated_data.get("comment", ""),
        )

        incident.refresh_from_db()
        return Response(RiskIncidentSerializer(incident).data, status=status.HTTP_200_OK)


class RiskIncidentResolveAPI(APIView):
    permission_classes = [IsAuthenticated, IsTeacher]

    def post(self, request, incident_id, *args, **kwargs):
        teacher = request.user.teacher_profile
        incident = _get_incident_for_teacher(teacher=teacher, incident_id=incident_id)

        serializer = RiskIncidentResolveSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        resolve_risk_incident(
            incident=incident,
            teacher=teacher,
            comment=serializer.validated_data.get("comment", ""),
        )

        incident.refresh_from_db()
        return Response(RiskIncidentSerializer(incident).data, status=status.HTTP_200_OK)


class RiskIncidentEscalateAPI(APIView):
    permission_classes = [IsAuthenticated, IsTeacher]

    def post(self, request, incident_id, *args, **kwargs):
        teacher = request.user.teacher_profile
        incident = _get_incident_for_teacher(teacher=teacher, incident_id=incident_id)

        serializer = RiskIncidentEscalateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        escalated_to = get_object_or_404(TeacherProfile, id=serializer.validated_data["teacher_id"])
        if escalated_to.id == teacher.id:
            return Response(
                {"teacher_id": ["Escalation target must be another teacher."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        escalate_risk_incident(
            incident=incident,
            teacher=teacher,
            escalated_to=escalated_to,
            comment=serializer.validated_data.get("comment", ""),
        )

        incident.refresh_from_db()
        return Response(RiskIncidentSerializer(incident).data, status=status.HTTP_200_OK)


def _teacher_scope_filter(teacher: TeacherProfile) -> Q:
    return (
        Q(assigned_teacher=teacher)
        | Q(escalated_to=teacher)
        | Q(group__teacher=teacher)
        | Q(subject__teacher=teacher)
    )


def _get_incident_for_teacher(*, teacher: TeacherProfile, incident_id: int) -> RiskIncident:
    return get_object_or_404(
        RiskIncident.objects.select_related(
            "student",
            "assigned_teacher__user",
            "escalated_to__user",
        ).prefetch_related("actions__teacher__user"),
        _teacher_scope_filter(teacher),
        id=incident_id,
    )
