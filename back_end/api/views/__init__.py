from .analyticsAPI import get_period
from .attendanceAPI import (
    AttendanceAPI,
    AttendanceScheduleDetailAPI,
    IsTeacher,
    MarkAttendanceAPIView,
)
from .groupAPI import (
    GetAllStudents,
    GroupCreateAPI,
    GroupDetailAPI,
    GroupListAPI,
    GroupStudentAPI,
)
from .profileAPI import EditProfileAPI, ProfileAPI
from .scheduleAPI import (
    GetScheduleGroupId,
    GetScheduleWithAttendens,
    ScheduleListAPI,
)
from .studentAPI import (
    CreateStudentAPI,
    EditStudentAPI,
    GetStudentPhoto,
    StudentListAPI,
    getStudentInformation,
)
from .subjectAPI import GetSubjectGroupListAPI

__all__ = [
    "AttendanceAPI",
    "AttendanceScheduleDetailAPI",
    "CreateStudentAPI",
    "EditProfileAPI",
    "EditStudentAPI",
    "GetAllStudents",
    "GetScheduleGroupId",
    "GetScheduleWithAttendens",
    "GetStudentPhoto",
    "GetSubjectGroupListAPI",
    "GroupCreateAPI",
    "GroupDetailAPI",
    "GroupListAPI",
    "GroupStudentAPI",
    "IsTeacher",
    "MarkAttendanceAPIView",
    "ProfileAPI",
    "ScheduleListAPI",
    "StudentListAPI",
    "getStudentInformation",
    "get_period",
]
