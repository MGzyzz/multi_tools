from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q, F, ExpressionWrapper, IntegerField
from django.shortcuts import get_object_or_404
from django.db.models import Count
from app.models import Group, AttendanceStat, Schedule, Attendance, Student
from api.serializer import GroupSerializer
from datetime import date, timedelta

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
    # if period == "semester":
    #     # подстрой под ваши правила
    #     if today.month in (9, 10, 11, 12):
    #         return date(today.year, 9, 1), date(today.year, 12, 31)
    #     return date(today.year, 1, 1), date(today.year, 5, 31)
    return None, None