from .views import *
from django.urls import path


urlpatterns = [
    path('get_students_list', StudentListAPI.as_view(), name='student_list'),
    path('get_student_photo/<str:first_name>', GetStudentPhoto.as_view(), name='student_photo'),
    path('get_groups_list', GroupListAPI.as_view(), name='group_list'),
    path('get_group/<int:pk>', GroupDetailAPI.as_view(), name='group_detail'),
    path('get_schedule_list', ScheduleListAPI.as_view(), name='schedule_list'),
    path('get_excel_attendance_file', create_excel_attendance_file, name='excel_attendance_file'),
    path('edit_attendance/<int:pk>', AttendanceAPI.as_view(), name='edit_attendance'),
    path('schedule_and_attendance/<int:pk>', GetScheduleWithAttendens.as_view(), name='test'),
    path('get_schedule_group_id/<int:pk>', GetScheduleGroupId.as_view(), name='schedule_group_id'),
]