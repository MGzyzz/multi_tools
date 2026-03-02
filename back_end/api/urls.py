from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from app.utils import create_excel_attendance_file

from .views import (
    AttendanceAPI,
    AttendanceScheduleDetailAPI,
    CreateStudentAPI,
    EditProfileAPI,
    EditStudentAPI,
    GetAllStudents,
    GetScheduleGroupId,
    GetScheduleWithAttendens,
    GetStudentPhoto,
    GetSubjectGroupListAPI,
    GroupCreateAPI,
    GroupDetailAPI,
    GroupListAPI,
    GroupStudentAPI,
    MarkAttendanceAPIView,
    NotificationListAPI,
    NotificationMarkReadAPI,
    ProfileAPI,
    RecognizeStudentByFace,
    ScheduleListAPI,
    StudentListAPI,
    StudentNotificationListAPI,
    StudentNotificationPreferenceAPI,
    UpdateStudentFaceEmbedding,
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
    path("get_schedule_list/", ScheduleListAPI.as_view(), name="schedule_list"),
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
    # === ANALYTICS ===
    # path('analytics/summary/', AnalyticsAPI.as_view(), name='analytics_data'),
    # path('analytics/groups/', AnalyticsGroupListAPI.as_view(), name='analytics_groups'),
]
