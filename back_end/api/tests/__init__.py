from .test_attendance_api import AttendanceAPITests
from .test_auth import AuthTests
from .test_face_recognition_api import FaceRecognitionAPITests
from .test_group_api import GroupAPITests
from .test_notification_api import NotificationAPITests
from .test_notification_delivery_models import NotificationDeliveryTests
from .test_notification_delivery_tasks import NotificationDeliveryTasksTests
from .test_notification_models import NotificationModelsTests
from .test_notification_preference_models import NotificationPreferenceTests
from .test_profile_api import EditProfileAPITests, ProfileAPITests
from .test_schedule_api import ScheduleAPITests
from .test_student_api import StudentAPITests
from .test_subject_api import SubjectAPITests

__all__ = [
    "AttendanceAPITests",
    "AuthTests",
    "EditProfileAPITests",
    "FaceRecognitionAPITests",
    "GroupAPITests",
    "NotificationAPITests",
    "NotificationDeliveryTasksTests",
    "NotificationDeliveryTests",
    "NotificationModelsTests",
    "NotificationPreferenceTests",
    "ProfileAPITests",
    "ScheduleAPITests",
    "StudentAPITests",
    "SubjectAPITests",
]
