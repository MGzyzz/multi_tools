from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .attendanceAPI import IsTeacher


class DemoNotificationAPI(APIView):
    """Sends two demo emails to the authenticated teacher. Used for live demos."""

    permission_classes = [IsAuthenticated, IsTeacher]

    def post(self, request):
        email = request.user.email

        if not email:
            return Response({"detail": "Teacher account has no email address."}, status=400)

        full_name = request.user.get_full_name() or request.user.username
        from_email = getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@example.com")

        # Always include the sender account so the demo works even if
        # the teacher's institutional inbox silently blocks external mail.
        recipients = list({email, from_email})

        # 1. Generic system notification
        generic_subject = "Lectern — тестовое уведомление системы"
        generic_message = (
            f"Здравствуйте, {full_name}!\n\n"
            "Это тестовое письмо от системы Lectern.\n"
            "Система уведомлений работает корректно: "
            "преподаватели и студенты получают email-оповещения "
            "об изменениях расписания и успеваемости.\n\n"
            "— Команда Lectern"
        )
        generic_html = render_to_string(
            "emails/generic_notification.html",
            {"title": generic_subject, "message": generic_message},
        )
        send_mail(
            subject=generic_subject,
            message=generic_message,
            from_email=from_email,
            recipient_list=recipients,
            fail_silently=False,
            html_message=generic_html,
        )

        # 2. Student risk / poor performance notification (demo data)
        risk_subject = "Lectern — уведомление об академической успеваемости (демо)"
        risk_html = render_to_string(
            "emails/student_risk_notification.html",
            {
                "title": "Снижение посещаемости",
                "student_name": "John Jon",
                "subject_name": "Тестовый предмет",
                "group_name": "Тестовая группа",
                "problem": "Посещаемость ниже допустимого порога",
                "reason": (
                    "Студент пропустил более 30% занятий по данному предмету "
                    "без уважительной причины."
                ),
                "metric_name": "Посещаемость",
                "metric_value": "54%",
                "threshold_value": "75%",
                "due_at_display": "15 мая 2026",
                "contact": "куратору группы",
            },
        )
        send_mail(
            subject=risk_subject,
            message="Уведомление об академической успеваемости студента (демо)",
            from_email=from_email,
            recipient_list=recipients,
            fail_silently=False,
            html_message=risk_html,
        )

        return Response({"detail": f"2 demo emails sent to {', '.join(recipients)}."})
