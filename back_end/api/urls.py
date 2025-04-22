from .views.studentAPI import StudentListAPI
from django.urls import path


urlpatterns = [
    path('get_students_list', StudentListAPI.as_view(), name='student_list'),
]