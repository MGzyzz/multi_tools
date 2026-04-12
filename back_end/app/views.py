import logging

import requests
from django.conf import settings
from django.http import JsonResponse
from django.shortcuts import redirect
from django.views.generic import CreateView, DetailView, ListView

from .models import Group, Schedule, Student

logger = logging.getLogger(__name__)

# Create your views here.


class HomePageView(ListView):
    template_name = "home.html"
    model = Schedule
    context_object_name = "schedules"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context["students"] = Student.objects.all()
        context["groups"] = Group.objects.all()
        return context


def send_telegram_message(request):
    # receptient
    data = {
        "group_id": request.POST.get("grou_id"),
        "subject": request.POST.get("subject"),
        "message": request.POST.get("message"),
        "urgent": request.POST.get("urgent", False),
    }
    logger.info("Sending telegram message: %s", data)

    response = requests.post(f"{settings.BOT_SERVICE_URL}/send_message_thread_bot", json=data)

    if response.status_code == 200:
        logger.info("Message sent successfully")
    else:
        logger.warning("Failed to send message, status=%s", response.status_code)

    # return JsonResponse({'status': 'ok'})
    return redirect("home")


def check_bot_status(request):
    try:
        response = requests.get(f"{settings.BOT_SERVICE_URL}/status", timeout=2)
        if response.status_code == 200:
            return JsonResponse({"active": True})
    except requests.exceptions.RequestException as e:
        logger.warning("Ошибка подключения к боту: %s", e)

    return JsonResponse({"active": False})


class ToolsView(CreateView):
    template_name = "tools.html"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context["groups"] = Group.objects.all()
        return context


class StudentDetail(DetailView):
    template_name = "studentDetail.html"
    model = Student
    context_object_name = "student"
