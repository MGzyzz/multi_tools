from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .attendanceAPI import IsTeacher


class DemoNotificationAPI(APIView):
    """Sends a demo email to the authenticated teacher. Used for live demos."""

    permission_classes = [IsAuthenticated, IsTeacher]

    def post(self, request):
        email = request.user.email

        if not email:
            return Response({"detail": "Teacher account has no email address."}, status=400)

        full_name = request.user.get_full_name() or request.user.username
        subject = "Lectern — тестовое уведомление системы"
        message = (
            f"Здравствуйте, {full_name}!\n\n"
            "Это тестовое письмо от системы Lectern.\n"
            "Система уведомлений работает корректно: "
            "преподаватели и студенты получают email-оповещения "
            "об изменениях расписания и успеваемости.\n\n"
            "— Команда Lectern"
        )

        html_message = render_to_string(
            "emails/generic_notification.html",
            {"title": subject, "message": message},
        )

        from_email = getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@example.com")
        send_mail(
            subject=subject,
            message=message,
            from_email=from_email,
            recipient_list=[email],
            fail_silently=False,
            html_message=html_message,
        )

        return Response({"detail": f"Demo notification sent to {email}."})
