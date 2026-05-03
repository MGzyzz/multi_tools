from importlib import import_module

from .auditoriumModels import Auditorium
from .groupLeadershipModels import GroupLeadership
from .groupModels import Group
from .notificationDeliveryModels import NotificationDelivery
from .notificationModels import NotificationModels
from .notificationPreferenceModels import NotificationPreference
from .riskIncidentModels import RiskIncident, TeacherRiskIncidentAction
from .scheduleModels import Schedule
from .studentModels import Student, StudentFaceImage
from .subjectStudyModels import Subject_study
from .teacherNotificationSettingsModels import TeacherNotificationSettings
from .webhookModels import WebhookDelivery, WebhookSubscription

Attendance = import_module(".\u0430ttendanceModels", __name__).Attendance
AttendanceStat = import_module(".\u0430ttendanceStatModels", __name__).AttendanceStat

__all__ = [
    "Attendance",
    "AttendanceStat",
    "Auditorium",
    "Group",
    "GroupLeadership",
    "NotificationDelivery",
    "NotificationModels",
    "NotificationPreference",
    "RiskIncident",
    "Schedule",
    "Student",
    "StudentFaceImage",
    "Subject_study",
    "TeacherNotificationSettings",
    "TeacherRiskIncidentAction",
    "WebhookDelivery",
    "WebhookSubscription",
]
