# Backend Fixes Design — 2026-03-12

## Overview

Fix all documented backend issues (B1–B25) in three phased stages, ordered by severity. Each phase is independently releasable and reviewable.

## Scope

Issues B1–B25 from `front_end/CLAUDE.md` backend section. Excluded: frontend issues, AI module issues.

---

## Phase 1 — Critical (B1–B6)

### B1: Hardcoded SECRET_KEY
- **File:** `core/settings.py:29`
- **Fix:**
  ```python
  from django.core.exceptions import ImproperlyConfigured
  SECRET_KEY = os.getenv("SECRET_KEY")
  if not SECRET_KEY:
      raise ImproperlyConfigured("SECRET_KEY environment variable is not set")
  ```
  This raise must appear **before** the `SIMPLE_JWT` block at line 100, because `SIMPLE_JWT["SIGNING_KEY"] = SECRET_KEY` would otherwise silently receive `None`.

### B2: Static DEBUG = True
- **File:** `core/settings.py:32`
- **Fix:** `DEBUG = os.getenv("DEBUG", "false").lower() == "true"`
- Add `DEBUG=true` to local `.env` for development.

### B3: CORS too permissive — three changes required
- **File:** `core/settings.py`
- All three lines must be changed together:

  1. **Remove** `CORS_ALLOW_ALL_ORIGINS = True` (line 36)
  2. **Change** `CORS_ALLOW_HEADERS = ["*"]` → `CORS_ALLOW_HEADERS = ["Authorization", "Content-Type", "Accept"]`
  3. **Change** `ALLOWED_HOSTS = ["*"]` → `ALLOWED_HOSTS = os.getenv("ALLOWED_HOSTS", "localhost,127.0.0.1").split(",")`
  4. **Update** `CORS_ALLOWED_ORIGINS` to include local dev origins:
     ```python
     CORS_ALLOWED_ORIGINS = [
         NGROK_URL,
         *[o.strip() for o in os.getenv("CORS_ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000").split(",") if o.strip()],
     ]
     ```
     Without adding localhost origins, local development will break because `http://localhost:5173` (Vite) will be blocked after `CORS_ALLOW_ALL_ORIGINS` is removed.

### B4: DB password "123" in version control
- **Files:** `.gitignore`, `docker-compose.yml`
- **Fixes:**
  1. Ensure `.env` is in `.gitignore`
  2. In `docker-compose.yml`, replace the hardcoded `"123"` password with `${POSTGRES_PASSWORD}` in **all four** places:
     - `services.postgres.environment.POSTGRES_PASSWORD` (line 11)
     - `services.app.environment.DB_PASSWORD` (line 48)
     - `services.celery.environment.DB_PASSWORD` (line 72)
     - `services.celery-beat.environment.DB_PASSWORD` (line 95)

### B5: Broken Excel export — `mark_set` does not exist
- **File:** `app/utils/tools.py:18`
- **Fix:** Replace `student.mark_set.all()` with `Attendance` queryset:
  ```python
  from app.models import Attendance
  # ...
  students = Student.objects.all().prefetch_related("groups")
  # student.groups is valid: Group.students is ManyToManyField("Student", related_name="groups")
  for student in students:
      group_names = ", ".join([g.name for g in student.groups.all()]) or "Без группы"
      attendances = Attendance.objects.filter(student=student).select_related("schedule__subject")
      for att in attendances:
          row = [
              group_names,
              f"{student.first_name} {student.last_name}",
              att.schedule.subject.name,
              "✔️" if att.presense else "❌",   # Phase 1: use att.presense; update to att.presence after B8 migration in Phase 2
          ]
          worksheet.append(row)
  ```
  Note: the existing worksheet header `"Presence"` at line 15 of `tools.py` is already spelled correctly — do not change it.

### B6: No file validation on student photo upload
- **File:** `api/views/studentAPI.py`
- **Add** module-level helper before `CreateStudentAPI`:
  ```python
  ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
  MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024  # 5MB

  def _validate_face_image(file_obj):
      if file_obj.content_type not in ALLOWED_IMAGE_TYPES:
          return "Допустимы только форматы: JPEG, PNG, WebP"
      if file_obj.size > MAX_IMAGE_SIZE_BYTES:
          return "Размер файла не должен превышать 5MB"
      return None
  ```
- **Call** in both `CreateStudentAPI.post` and `EditStudentAPI.patch` before the `fetch_embedding_from_file` call:
  ```python
  if "face_image" in request.FILES:
      file_obj = request.FILES["face_image"]
      error = _validate_face_image(file_obj)
      if error:
          return Response({"face_image": error}, status=status.HTTP_400_BAD_REQUEST)
      # ... existing embedding logic
  ```

---

## Phase 2 — High (B7–B15)

### B7–B9: Model field typos + migrations

**Apply in this order:** B8 first (most widespread), then B9, then B7.

| Issue | Model | Old field | New field | Migration type |
|-------|-------|-----------|-----------|----------------|
| B8 | `Attendance` | `presense` | `presence` | `RenameField` |
| B9 | `NotificationModels` | `readt_at` | `read_at` | `RenameField` |
| B7 | `Student` | `face_embadding` | `face_embedding` | `RenameField` |

**Complete list of files to update for B8 (`presense` → `presence`):**

- `app/models/аttendanceModels.py` (will be renamed to `attendanceModels.py` in B10):
  - Field definition: `presense = models.BooleanField(...)` → `presence = ...`
  - `__str__` method: `self.presense` → `self.presence`
- `app/signals.py`:
  - Line 162: `Attendance(student_id=sid, schedule_id=schedule.id, presense=False)` → `presence=False`
  - Line 408: function `cache_old_presense` → rename to `cache_old_presence`
  - Line 412: `Attendance.objects.only("presense")` → `.only("presence")`
  - Line 413: `old.presense` → `old.presence`; `instance._old_presense` → `instance._old_presence`
  - Line 424: `if instance.presense:` → `if instance.presence:`
  - Line 434: `getattr(instance, "_old_presense", None)` → `"_old_presence"`
  - Line 473: `if instance.presense:` → `if instance.presence:`
- `api/views/attendanceAPI.py`:
  - Line 46: `Attendance(student_id=sid, schedule_id=schedule_id, presense=False)` → `presence=False`
  - Line 76: `presense = request.data.get("presense")` → `presence = request.data.get("presence")`
  - Line 79: `if presense is not None:` → `if presence is not None:`
  - Line 80: `attendance.presense = presense` → `attendance.presence = presence`
- `api/views/scheduleAPI.py`:
  - Line 60: `Attendance.objects.create(... presense=False)` → `presence=False`
  - Line 69 (response dict): `"presense": attendance.presense` → `"presence": attendance.presence`
- `api/serializer.py`:
  - `AttendanceRowSerializer.Meta.fields`: `"presense"` → `"presence"`. **API contract change:** the JSON response key changes from `presense` to `presence`; coordinate with frontend before deploying.
- `app/tasks.py`:
  - Line 43: `filter=Q(presense=True)` → `filter=Q(presence=True)`
  - Line 30 (docstring): update reference to `presense` → `presence`
- `app/utils/tools.py` (B5 fix): update `att.presense` → `att.presence`
- `api/tests/` — any fixtures or assertions referencing `presense`

**For B9 (`readt_at` → `read_at`):**
- `app/models/notificationModels.py` — field definition
- `api/serializer.py` — `NotificationSerializer.Meta.fields`: `"readt_at"` → `"read_at"`
- `api/views/notificationAPI.py` — lines 53–54: `notification.readt_at = timezone.now()` and `save(update_fields=["is_read", "readt_at"])` → update to `read_at`
- `app/utils/realtime_notifications.py` — line 71: `notification.readt_at.isoformat()` → `notification.read_at.isoformat()`
- `api/tests/test_notification_api.py` — line 58: `self.teacher_notification.readt_at` → `read_at`
- `api/tests/test_notification_models.py` — line 41: `notification.readt_at` → `read_at`

**For B7 (`face_embadding` → `face_embedding`):**
- `app/models/studentModels.py` — field definition
- Any view or serializer accessing `student.face_embadding` directly (search codebase for `face_embadding`)
- **Do NOT edit** `app/migrations/0030_student_face_embadding_student_face_updated_at.py` — the old migration must remain unchanged. Create a **new** `RenameField` migration on top of it. Editing existing migrations corrupts migration history.

### B10: Cyrillic filenames
- **Files:** `app/models/аttendanceModels.py`, `app/models/аttendanceStatModels.py`
  - The first letter «а» is Cyrillic U+0430, not Latin 'a'
- **Fix:**
  ```bash
  git mv 'app/models/аttendanceModels.py' app/models/attendanceModels.py
  git mv 'app/models/аttendanceStatModels.py' app/models/attendanceStatModels.py
  ```
  If `git mv` fails due to shell encoding, use a two-step approach: copy the file with a new name, then `git rm` the old one.
- **Update** `app/models/__init__.py`: change `from .аttendanceModels import ...` → `from .attendanceModels import ...` and same for `аttendanceStatModels`.
- **Apply B10 before B8** to avoid import errors during migration.

### B11: No rate limiting on /api/token/
- **Do NOT** set `DEFAULT_THROTTLE_CLASSES` globally — it throttles all anonymous users everywhere.
- **Fix:** Create a subclass of `TokenObtainPairView` with throttle applied:
  ```python
  # In the file where TokenObtainPairView is registered (check core/urls.py or api/urls.py)
  from rest_framework.throttling import AnonRateThrottle
  from rest_framework_simplejwt.views import TokenObtainPairView

  class ThrottledTokenObtainPairView(TokenObtainPairView):
      throttle_classes = [AnonRateThrottle]
  ```
  Register `ThrottledTokenObtainPairView` in `urls.py` instead of the plain `TokenObtainPairView`.
- **Add to** `core/settings.py` under `REST_FRAMEWORK`:
  ```python
  "DEFAULT_THROTTLE_RATES": {"anon": "20/min"},
  ```

### B12: `cahce_key` typo breaks cache invalidation
- **File:** `api/views/groupAPI.py` — `GetAllStudents.get` method
- **Fix all three occurrences** of the misspelled variable:
  - Line 114: `cahce_key = f"students_by_teacher:{teacher.id}"` → `cache_key = ...`
  - Line 115: `cache.get(cahce_key)` → `cache.get(cache_key)`
  - Line 128: `cache.set(cahce_key, ...)` → `cache.set(cache_key, ...)`
- **Note:** `CreateStudentAPI` and `EditStudentAPI` in `studentAPI.py` use `f"students_by_teacher:{teacher.id}"` as a string literal — cache invalidation there is already working correctly; do not change those.

### B13: No pagination on StudentListAPI
- **File:** `api/views/studentAPI.py` — `StudentListAPI.get`
- **Fix:** Add page/page_size params with defaults (page=1, page_size=20):
  ```python
  def get(self, request, *args, **kwargs):
      qs = Student.objects.all()
      page = int(request.query_params.get("page", 1))
      page_size = int(request.query_params.get("page_size", 20))
      start = (page - 1) * page_size
      end = start + page_size
      total = qs.count()
      students = qs[start:end]
      serializer = StudentSerializer(students, many=True)
      return Response({"count": total, "results": serializer.data})
  ```
- **Also fix** the misplaced docstring: move it to be the first statement inside the class body, before `permission_classes`.

### B14: `print()` in production code
- **Files to update:**
  - `api/views/scheduleAPI.py` lines 26, 28, 35 — replace `print(...)` with `logger.info(...)` or `logger.debug(...)`
  - `api/views/attendanceAPI.py` line 58 — `print(attendances)` → `logger.debug("attendances: %s", attendances)`
- Ensure `logger = logging.getLogger(__name__)` is defined at module level in `attendanceAPI.py` (it is not currently present; add it).

### B15: Hardcoded NGROK domain
- **File:** `core/settings.py:40`
- **Fix:** `NGROK_DOMAIN = os.getenv("NGROK_DOMAIN", "")`
- Remove the hardcoded tunnel ID `"394610267b27"`
- Add `NGROK_DOMAIN=your-tunnel-id` comment to `.env.example`

---

## Phase 3 — Medium/Low (B16–B25)

### B16: Signal handlers — bulk operations not atomic
- **File:** `app/signals.py` — `create_attendance_for_schedule` → `_on_commit` callback
- The `Attendance.objects.bulk_create` and `AttendanceStat` create/update operations inside `_on_commit` can partially succeed if one raises.
- **Fix:** Wrap the bulk operations in `transaction.atomic()`:
  ```python
  def _on_commit():
      with transaction.atomic():
          created_att = Attendance.objects.bulk_create(...)
          # ... AttendanceStat update/create
      _notify_schedule_change(...)  # outside atomic — notification failures should not roll back attendance
  ```
- **Note:** The `_on_commit` callback already runs after the outer schedule-creation transaction commits (that is the purpose of `transaction.on_commit`). Therefore `with transaction.atomic()` here starts a **new independent transaction**, not a savepoint inside the outer one. This is the correct behavior — the bulk inserts need their own atomicity guarantee.

### B17: No retry strategy for notification delivery
- **File:** `app/tasks.py` — `process_notification_delivery`
- **Current state:** On failure, the task sets `status=FAILED` and returns. The `enqueue_pending_notification_deliveries` task only picks up `PENDING` deliveries, so `FAILED` deliveries are never retried.
- **Fix:** Change `@shared_task` to `@shared_task(bind=True)` and add retry logic before marking as `FAILED`:
  ```python
  @shared_task(bind=True, name="process_notification_delivery")
  def process_notification_delivery(self, delivery_id: int) -> dict:
      # ... existing code ...
      except Exception as exc:
          attempt_number = delivery.attempts + 1
          max_retries = 3
          if attempt_number < max_retries:
              delivery.attempts = attempt_number
              delivery.last_error = str(exc)
              delivery.save(update_fields=["attempts", "last_error"])
              raise self.retry(exc=exc, countdown=2 ** attempt_number)
          # else fall through to FAILED
          delivery.status = NotificationStatusChoices.FAILED
          ...
  ```
  The `bind=True` parameter gives access to `self` (the task instance) needed for `self.retry()`.

### B18: No validation on NotificationPreference thresholds
- **File:** `api/serializer.py` — `NotificationPreferenceSerializer`
- **Fix:**
  ```python
  def validate_threshold_percent(self, value):
      if not 0 <= value <= 100:
          raise serializers.ValidationError("Значение должно быть от 0 до 100")
      return value

  def validate_drop_delta_percent(self, value):
      if not 1 <= value <= 100:
          raise serializers.ValidationError("Значение должно быть от 1 до 100")
      return value
  ```

### B19: TODO comments in production code
- **`api/views/studentAPI.py`:**
  - Line 46: Remove `# TODO: Убрать это пока или просто закоментировать` and the unreachable `except Student.DoesNotExist` block (unreachable after `.first()`)
  - Lines 84–88: `create_excel_mark_file` is a stub function with `pass` and a TODO — remove it entirely
  - Line 102: Remove the TODO comment about rewriting by ID
- **`api/views/scheduleAPI.py`:**
  - Line 33: Remove the TODO comment about date filtering
  - Line 37: Remove the misleading TODO comment `# TODO: Поменяй потом на 300 секунд значения`

### Functional fix (separated from B19): Schedule cache TTL
- **File:** `api/views/scheduleAPI.py:36`
- **Fix:** Change `timeout=10` → `timeout=300` (5 minutes as intended); update the inline comment accordingly
- This is a behavioral change (caching duration), not just comment cleanup — treat it as a separate commit

### B20: WebSocket consumer error handling
- **File:** `api/consumers.py`
- **Current state:** `_get_teacher_id` already handles `DoesNotExist` via `.first()`. The remaining risk is `channel_layer.group_add` raising on a misconfigured layer.
- **Fix:** Wrap the body of `connect()` and `notification_created()` in `try/except Exception`:
  ```python
  async def connect(self):
      try:
          # ... existing logic
      except Exception:
          logger.exception("WebSocket connect error")
          await self.close(code=4500)
  ```
  Add `import logging; logger = logging.getLogger(__name__)` at the top of `consumers.py`.

### B21: Audit log for attendance changes
- **Limitation:** Django `post_save` signals do not have access to the HTTP request, so the acting user cannot be logged from the signal layer.
- **Fix (view-layer):** In `attendanceAPI.py` — `AttendanceAPI.patch`, after `attendance.save()`, add:
  ```python
  logger.info(
      "Attendance updated: id=%s schedule_id=%s student_id=%s presence=%s by user_id=%s",
      attendance.id,
      attendance.schedule_id,
      attendance.student_id,
      attendance.presence,
      request.user.id,
  )
  ```
  Full DB audit trail is out of scope for this iteration.

### B22: Mixed Russian/English comments
- **Scope:** Inline code comments in `scheduleAPI.py`, `groupAPI.py`, `signals.py`, `serializer.py`
- **Fix:** Convert Russian inline code comments to English. User-facing strings (`verbose_name`, error messages to end users) remain in Russian.

### B23: Missing docstrings
- **Views without class docstrings:** `ScheduleListAPI`, `GetScheduleWithAttendens`, `GetScheduleGroupId` in `scheduleAPI.py`
- **Fix:** Add one-line class docstrings to each

### B24/B25: Empty tests + StudentSerializer validation
- **`api/serializer.py`** — `StudentSerializer`: add field validation:
  ```python
  def validate_age(self, value):
      if not 1 <= value <= 100:
          raise serializers.ValidationError("Возраст должен быть от 1 до 100")
      return value
  ```
- **`api/tests/`** — add minimal passing tests for: login returns tokens, create student returns 201, invalid file upload returns 400.

---

## Data Flow Impact

| Phase | DB changes | API contract change |
|-------|-----------|---------------------|
| 1 | None | None |
| 2 | 3 RenameField migrations | `presense` → `presence` in attendance responses; `readt_at` → `read_at` in notification responses |
| 3 | None | Stricter validation may reject previously-accepted values |

## Ordering Constraints

1. Apply B1 before any other change (ensures `SECRET_KEY` is never `None` at startup)
2. Apply B10 (file rename) before B8 migration to avoid import errors
3. Apply B8 migration before updating `tools.py` B5 fix to use `att.presence`
4. Coordinate the `presense` → `presence` API key change with the frontend team before deploying Phase 2

## Testing Plan

- Phase 1: Verify Excel download works; verify 400 on oversized/wrong-type image; verify server raises `ImproperlyConfigured` when `SECRET_KEY` env var is absent
- Phase 2: Run `python manage.py migrate --check` after each `RenameField`; verify all existing API tests pass; manually test attendance response shape for frontend compatibility
- Phase 3: Run new unit tests for serializer validation; verify WebSocket connect logs errors on bad channel layer
