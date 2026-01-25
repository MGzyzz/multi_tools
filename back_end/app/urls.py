from django.urls import path

from .views import (
    HomePageView,
    StudentDetail,
    ToolsView,
    check_bot_status,
    send_telegram_message,
)

urlpatterns = [
    path("", HomePageView.as_view(), name="home"),
    path("tools/", ToolsView.as_view(), name="tools"),
    path("student/<int:pk>/", StudentDetail.as_view(), name="student_detail"),
    path("send_telegram_message/", send_telegram_message, name="send_telegram_message"),
    path("check_bot_status/", check_bot_status, name="check_bot_status"),
]
