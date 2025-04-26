from .views.studentAPI import StudentListAPI, GetStudentPhoto
from django.urls import path


urlpatterns = [
    path('get_students_list', StudentListAPI.as_view(), name='student_list'),
    path('get_student_photo/<int:student_id>', GetStudentPhoto.as_view(), name='student_photo'),
]