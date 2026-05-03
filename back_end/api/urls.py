from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from app.utils import create_excel_attendance_file

from .views import (
    AnalyticsGroupsAPI,
    AnalyticsGroupStudentsAPI,
    AnalyticsSummaryAPI,
    AttendanceAPI,
    AttendanceScheduleDetailAPI,
    AuditoriumListCreateAPI,
    CreateStudentAPI,
    DemoNotificationAPI,
    EditProfileAPI,
    EditStudentAPI,
    GetAllStudents,
    GetScheduleGroupId,
    GetScheduleWithAttendens,
    GetStudentPhoto,
    GetSubjectGroupListAPI,
    GroupCreateAPI,
    GroupDetailAPI,
    GroupLeadershipAPI,
    GroupListAPI,
    GroupStudentAPI,
    MarkAttendanceAPIView,
    NotificationListAPI,
    NotificationMarkReadAPI,
    ProfileAPI,
    RecognizeStudentByFace,
    RiskIncidentAcknowledgeAPI,
    RiskIncidentEscalateAPI,
    RiskIncidentListAPI,
    RiskIncidentResolveAPI,
    ScheduleListAPI,
    SchedulePlannerAPI,
    ScheduleSemesterApplyAPI,
    ScheduleSemesterPreviewAPI,
    StudentBulkSyncWebhookAPI,
    StudentJournalDetailAPI,
    StudentListAPI,
    StudentNotificationListAPI,
    StudentNotificationPreferenceAPI,
    StudentRiskIncidentListAPI,
    StudentSyncWebhookAPI,
    TeacherBroadcastAPI,
    TeacherNotificationSettingsAPI,
    TeacherTelegramLinkCallbackAPI,
    TeacherTelegramLinkTokenAPI,
    TeacherTelegramStatusAPI,
    UpdateStudentFaceEmbedding,
    WebhookSubscriptionDetailAPI,
    WebhookSubscriptionListCreateAPI,
    getStudentInformation,
)

urlpatterns = [
    # API AUTH
    path("token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    # path('register/', AccountsProfileCreateViewAPI.as_view() ,name='register'), # В будущем сделаем регистрацию через API
    # === PROFILE ===
    path("me/", ProfileAPI.as_view(), name="user_profile"),
    path("edit_profile/", EditProfileAPI.as_view(), name="edit_user_profile"),
    # === STUDENTS ===
    path("get_students_list/", StudentListAPI.as_view(), name="student_list"),
    path(
        "get_student_photo/<str:first_name>/",
        GetStudentPhoto.as_view(),
        name="student_photo",
    ),
    path(
        "get_student_information/<str:first_name>/",
        getStudentInformation.as_view(),
        name="student_information",
    ),
    path(
        "students/<int:student_id>/face_embedding/",
        UpdateStudentFaceEmbedding.as_view(),
        name="student_face_embedding",
    ),
    path(
        "students/recognize_face/",
        RecognizeStudentByFace.as_view(),
        name="student_face_recognize",
    ),
    path("edit_student/<int:student_id>/", EditStudentAPI.as_view(), name="edit_student"),
    path("create_student/", CreateStudentAPI.as_view(), name="create_student"),
    # === GROUPS ===
    path("get_groups_list/", GroupListAPI.as_view(), name="group_list"),
    path("get_all_students/", GetAllStudents.as_view(), name="all_groups_students"),
    path(
        "get_group/<int:group_id>/subjects/",
        GetSubjectGroupListAPI.as_view(),
        name="group_subjects",
    ),
    path(
        "get_group/<int:group_id>/subjects/<int:subject_id>/students/",
        GroupStudentAPI.as_view(),
        name="group_students",
    ),
    path("get_group/<int:pk>/", GroupDetailAPI.as_view(), name="group_detail"),
    path("create_group/", GroupCreateAPI.as_view(), name="create_group"),
    # === SUBJECTS ===
    path("auditoriums/", AuditoriumListCreateAPI.as_view(), name="auditorium_list_create"),
    path("get_schedule_list/", ScheduleListAPI.as_view(), name="schedule_list"),
    path("schedule-planner/", SchedulePlannerAPI.as_view(), name="schedule_planner"),
    path(
        "schedule-planner/semester/preview/",
        ScheduleSemesterPreviewAPI.as_view(),
        name="schedule_semester_preview",
    ),
    path(
        "schedule-planner/semester/apply/",
        ScheduleSemesterApplyAPI.as_view(),
        name="schedule_semester_apply",
    ),
    path(
        "get_excel_attendance_file/",
        create_excel_attendance_file,
        name="excel_attendance_file",
    ),
    # === Attendance ===
    path(
        "attendance/schedule/<int:schedule_id>/",
        AttendanceScheduleDetailAPI.as_view(),
        name="attendance_list",
    ),
    path("attendance/mark/", MarkAttendanceAPIView.as_view(), name="attendance-mark"),
    path("edit_attendance/<int:pk>/", AttendanceAPI.as_view(), name="edit_attendance"),
    path(
        "get_group/<int:group_id>/subjects/<int:subject_id>/students/<int:student_id>/journal/",
        StudentJournalDetailAPI.as_view(),
        name="student_journal_detail",
    ),
    path(
        "schedule_and_attendance/<int:pk>/",
        GetScheduleWithAttendens.as_view(),
        name="test",
    ),
    path(
        "get_schedule_group_id/<int:pk>/",
        GetScheduleGroupId.as_view(),
        name="schedule_group_id",
    ),
    # === NOTIFICATIONS ===
    path("notifications/", NotificationListAPI.as_view(), name="notifications_list"),
    path(
        "notifications/<int:notification_id>/read/",
        NotificationMarkReadAPI.as_view(),
        name="notifications_mark_read",
    ),
    path(
        "students/<int:student_id>/notifications/",
        StudentNotificationListAPI.as_view(),
        name="student_notifications_list",
    ),
    path(
        "students/<int:student_id>/notification-preference/",
        StudentNotificationPreferenceAPI.as_view(),
        name="student_notification_preference",
    ),
    path("risk-incidents/", RiskIncidentListAPI.as_view(), name="risk_incident_list"),
    path(
        "students/<int:student_id>/risk-incidents/",
        StudentRiskIncidentListAPI.as_view(),
        name="student_risk_incident_list",
    ),
    path(
        "risk-incidents/<int:incident_id>/acknowledge/",
        RiskIncidentAcknowledgeAPI.as_view(),
        name="risk_incident_acknowledge",
    ),
    path(
        "risk-incidents/<int:incident_id>/resolve/",
        RiskIncidentResolveAPI.as_view(),
        name="risk_incident_resolve",
    ),
    path(
        "risk-incidents/<int:incident_id>/escalate/",
        RiskIncidentEscalateAPI.as_view(),
        name="risk_incident_escalate",
    ),
    # === ANALYTICS ===
    path("analytics/summary/", AnalyticsSummaryAPI.as_view(), name="analytics_summary"),
    path("analytics/groups/", AnalyticsGroupsAPI.as_view(), name="analytics_groups"),
    path(
        "analytics/groups/<int:group_id>/students/",
        AnalyticsGroupStudentsAPI.as_view(),
        name="analytics_group_students",
    ),
    # === TELEGRAM & NOTIFICATION SETTINGS ===
    path(
        "teacher/notification-settings/",
        TeacherNotificationSettingsAPI.as_view(),
        name="teacher_notification_settings",
    ),
    path(
        "teacher/telegram/link-token/",
        TeacherTelegramLinkTokenAPI.as_view(),
        name="teacher_telegram_link_token",
    ),
    path(
        "teacher/telegram/link-callback/",
        TeacherTelegramLinkCallbackAPI.as_view(),
        name="teacher_telegram_link_callback",
    ),
    path(
        "teacher/telegram/status/",
        TeacherTelegramStatusAPI.as_view(),
        name="teacher_telegram_status",
    ),
    # === GROUP LEADERSHIP ===
    path(
        "groups/<int:group_id>/leaders/",
        GroupLeadershipAPI.as_view(),
        name="group_leaders",
    ),
    # === BROADCAST ===
    path(
        "teacher/broadcast/",
        TeacherBroadcastAPI.as_view(),
        name="teacher_broadcast",
    ),
    # === WEBHOOKS ===
    path("webhooks/student-sync/", StudentSyncWebhookAPI.as_view(), name="webhook_student_sync"),
    path(
        "webhooks/students-bulk/", StudentBulkSyncWebhookAPI.as_view(), name="webhook_students_bulk"
    ),
    path(
        "webhooks/subscriptions/",
        WebhookSubscriptionListCreateAPI.as_view(),
        name="webhook_subscriptions",
    ),
    path(
        "webhooks/subscriptions/<int:pk>/",
        WebhookSubscriptionDetailAPI.as_view(),
        name="webhook_subscription_detail",
    ),
    # === DEMO ===
    path("demo/send-notification/", DemoNotificationAPI.as_view(), name="demo_send_notification"),
]
