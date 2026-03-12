# Backend Fixes (B1–B25) Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all documented backend issues B1–B25 in three phases, making the Django backend secure, correct, and maintainable.

**Architecture:** Phased approach — Phase 1 (critical: secrets, CORS, Excel, file validation), Phase 2 (high: model renames with migrations, rate limiting, pagination, print removal), Phase 3 (medium/low: atomicity, retry, validation, comments, tests). Each phase is an independent, deployable set of changes.

**Tech Stack:** Django 5, Django REST Framework, PostgreSQL + pgvector, Celery, Django Channels, `rest_framework_simplejwt`

**Spec:** `docs/superpowers/specs/2026-03-12-backend-fixes-design.md`

---

## Chunk 1: Phase 1 — Critical Fixes (B1–B6)

### Task 1: B1 — Move SECRET_KEY to environment variable

**Files:**
- Modify: `core/settings.py:13,29`

- [ ] **Step 1: Add `ImproperlyConfigured` import and read SECRET_KEY from env**

  In `core/settings.py`:
  1. Add at the top (with existing imports): `from django.core.exceptions import ImproperlyConfigured`
  2. Replace the hardcoded line 29:
     ```python
     # DELETE:
     SECRET_KEY = "django-insecure-a9iq5=kyj__h&**#aash0tx*xh$6$f9775xj)0na09=ww4^)60"
     # ADD (must be BEFORE line 100 where SIMPLE_JWT uses SECRET_KEY):
     SECRET_KEY = os.getenv("SECRET_KEY")
     if not SECRET_KEY:
         raise ImproperlyConfigured("SECRET_KEY environment variable is not set")
     ```
  The new block must stay at line ~29, **before** the `SIMPLE_JWT` block at line 100, because `SIMPLE_JWT["SIGNING_KEY"] = SECRET_KEY` — if placed after, it would silently assign `None`.

- [ ] **Step 2: Add SECRET_KEY to your local .env file**

  In `/Users/madi_gaziz/Desktop/alter_work/multi_tools/back_end/.env`, add:
  ```
  SECRET_KEY=django-insecure-a9iq5=kyj__h&**#aash0tx*xh$6$f9775xj)0na09=ww4^)60
  ```
  (Keep the same value for local dev — what matters is it's not in source code.)

- [ ] **Step 3: Verify server starts and raises correctly**

  ```bash
  cd /Users/madi_gaziz/Desktop/alter_work/multi_tools/back_end
  python manage.py check
  ```
  Expected: No errors.

  Then temporarily remove SECRET_KEY from .env and verify:
  ```bash
  SECRET_KEY= python manage.py check
  ```
  Expected: `ImproperlyConfigured: SECRET_KEY environment variable is not set`

  Restore the value in .env afterward.

- [ ] **Step 4: Commit**

  ```bash
  git add core/settings.py
  git commit -m "Перенести SECRET_KEY в переменные окружения"
  ```

---

### Task 2: B2 — Move DEBUG to environment variable

**Files:**
- Modify: `core/settings.py:32`

- [ ] **Step 1: Replace static DEBUG**

  In `core/settings.py`, replace:
  ```python
  DEBUG = True
  ```
  With:
  ```python
  DEBUG = os.getenv("DEBUG", "false").lower() == "true"
  ```

- [ ] **Step 2: Add DEBUG=true to local .env**

  In `.env`, add:
  ```
  DEBUG=true
  ```

- [ ] **Step 3: Verify**

  ```bash
  python manage.py check
  ```
  Expected: No errors.

- [ ] **Step 4: Commit**

  ```bash
  git add core/settings.py
  git commit -m "Перенести DEBUG в переменные окружения"
  ```

---

### Task 3: B3 — Fix CORS and ALLOWED_HOSTS

**Files:**
- Modify: `core/settings.py:34,36,50–52,54,56`

- [ ] **Step 1: Apply all three CORS/host changes**

  In `core/settings.py`:

  **Remove** the line:
  ```python
  CORS_ALLOW_ALL_ORIGINS = True
  ```

  **Replace** `CORS_ALLOW_HEADERS`:
  ```python
  # Old:
  CORS_ALLOW_HEADERS = ["*"]
  # New:
  CORS_ALLOW_HEADERS = ["Authorization", "Content-Type", "Accept"]
  ```

  **Replace** `ALLOWED_HOSTS`:
  ```python
  # Old:
  ALLOWED_HOSTS = ["*"]
  # New:
  ALLOWED_HOSTS = os.getenv("ALLOWED_HOSTS", "localhost,127.0.0.1").split(",")
  ```

  **Replace** `CORS_ALLOWED_ORIGINS` block:
  ```python
  # Old:
  CORS_ALLOWED_ORIGINS = [
      NGROK_URL,
  ]
  # New:
  CORS_ALLOWED_ORIGINS = [
      NGROK_URL,
      *[
          o.strip()
          for o in os.getenv("CORS_ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000").split(",")
          if o.strip()
      ],
  ]
  ```

- [ ] **Step 2: Verify**

  ```bash
  python manage.py check
  ```
  Expected: No errors.

- [ ] **Step 3: Commit**

  ```bash
  git add core/settings.py
  git commit -m "Ограничить CORS и ALLOWED_HOSTS"
  ```

---

### Task 4: B4 — Remove hardcoded DB password from version control

**Files:**
- Modify: `.gitignore`, `docker-compose.yml`

- [ ] **Step 1: Ensure .env is gitignored**

  Check `/Users/madi_gaziz/Desktop/alter_work/multi_tools/back_end/.gitignore`. If `.env` is not listed, add it:
  ```
  .env
  ```

- [ ] **Step 2: Replace all hardcoded passwords in docker-compose.yml**

  In `docker-compose.yml`, replace `"123"` with `${POSTGRES_PASSWORD}` in all four places:

  - Line 11: `POSTGRES_PASSWORD: "123"` → `POSTGRES_PASSWORD: "${POSTGRES_PASSWORD}"`
  - Line 48: `DB_PASSWORD: "123"` → `DB_PASSWORD: "${POSTGRES_PASSWORD}"`
  - Line 72: `DB_PASSWORD: "123"` → `DB_PASSWORD: "${POSTGRES_PASSWORD}"`
  - Line 95: `DB_PASSWORD: "123"` → `DB_PASSWORD: "${POSTGRES_PASSWORD}"`

  Then add `POSTGRES_PASSWORD=123` to your local `.env` (Docker Compose reads `.env` from the project root automatically).

- [ ] **Step 3: Verify docker-compose reads the env var**

  ```bash
  docker compose config | grep PASSWORD
  ```
  Expected: shows the actual password value (not the literal `${POSTGRES_PASSWORD}`).

- [ ] **Step 4: Commit**

  ```bash
  git add .gitignore docker-compose.yml
  git commit -m "Убрать хардкоженный пароль БД из docker-compose"
  ```

---

### Task 5: B5 — Fix broken Excel export

**Files:**
- Modify: `app/utils/tools.py`

- [ ] **Step 1: Rewrite the Excel export function**

  Replace the entire body of `create_excel_attendance_file` in `app/utils/tools.py`:

  ```python
  import openpyxl
  from django.http import HttpResponse

  from app.models import Attendance, Student


  def create_excel_attendance_file(request):
      """
      Create an Excel file with student attendance grouped by group and return it as a response.
      """
      workbook = openpyxl.Workbook()
      worksheet = workbook.active
      worksheet.title = "Student Attendance"

      headers = ["Group", "Student Name", "Subject", "Presence"]
      worksheet.append(headers)

      students = Student.objects.all().prefetch_related("groups")
      # student.groups is valid: Group.students = ManyToManyField("Student", related_name="groups")
      for student in students:
          group_names = ", ".join([g.name for g in student.groups.all()]) or "Без группы"
          attendances = Attendance.objects.filter(student=student).select_related("schedule__subject")
          for att in attendances:
              row = [
                  group_names,
                  f"{student.first_name} {student.last_name}",
                  att.schedule.subject.name,
                  "✔️" if att.presense else "❌",  # updated to att.presence after B8 migration in Phase 2
              ]
              worksheet.append(row)

      response = HttpResponse(
          content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      )
      response["Content-Disposition"] = 'attachment; filename="student_attendance.xlsx"'
      workbook.save(response)
      return response
  ```

- [ ] **Step 2: Verify the import works**

  ```bash
  python manage.py shell -c "from app.utils.tools import create_excel_attendance_file; print('OK')"
  ```
  Expected: `OK`

- [ ] **Step 3: Commit**

  ```bash
  git add app/utils/tools.py
  git commit -m "Исправить Excel-экспорт посещаемости (mark_set не существует)"
  ```

---

### Task 6: B6 — Add file validation for student photo uploads

**Files:**
- Modify: `api/views/studentAPI.py`

- [ ] **Step 1: Add the validation helper and constants**

  At the top of `api/views/studentAPI.py`, after the imports, add:

  ```python
  ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
  MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB


  def _validate_face_image(file_obj):
      if file_obj.content_type not in ALLOWED_IMAGE_TYPES:
          return "Допустимы только форматы: JPEG, PNG, WebP"
      if file_obj.size > MAX_IMAGE_SIZE_BYTES:
          return "Размер файла не должен превышать 5MB"
      return None
  ```

- [ ] **Step 2: Call validation in CreateStudentAPI.post**

  In `CreateStudentAPI.post`, the block that starts `if "face_image" in request.FILES:` currently looks like:
  ```python
  if "face_image" in request.FILES:
      file_obj = request.FILES.get("face_image")
      if file_obj:
          embedding, error = fetch_embedding_from_file(file_obj)
  ```

  Replace with:
  ```python
  if "face_image" in request.FILES:
      file_obj = request.FILES["face_image"]
      validation_error = _validate_face_image(file_obj)
      if validation_error:
          student.delete()  # rollback the student creation
          return Response({"face_image": validation_error}, status=status.HTTP_400_BAD_REQUEST)
      embedding, error = fetch_embedding_from_file(file_obj)
      if error:
          logger.warning("Face embedding failed for student_id=%s: %s", student.id, error)
      else:
          file_obj.seek(0)
          StudentFaceImage.objects.create(
              student=student, image=file_obj, embedding=embedding
          )
          trim_face_images(student)
          student.save(update_fields=["face_updated_at"])
  ```

- [ ] **Step 3: Call validation in EditStudentAPI.patch**

  Same pattern in `EditStudentAPI.patch`:
  ```python
  if "face_image" in request.FILES:
      file_obj = request.FILES["face_image"]
      validation_error = _validate_face_image(file_obj)
      if validation_error:
          return Response({"face_image": validation_error}, status=status.HTTP_400_BAD_REQUEST)
      embedding, error = fetch_embedding_from_file(file_obj)
      if error:
          logger.warning("Face embedding failed for student_id=%s: %s", student.id, error)
      else:
          file_obj.seek(0)
          StudentFaceImage.objects.create(
              student=student, image=file_obj, embedding=embedding
          )
          trim_face_images(student)
          student.save(update_fields=["face_updated_at"])
  ```

- [ ] **Step 4: Verify syntax**

  ```bash
  python manage.py check
  ```
  Expected: No errors.

- [ ] **Step 5: Commit**

  ```bash
  git add api/views/studentAPI.py
  git commit -m "Добавить валидацию типа и размера фото студента"
  ```

---

## Chunk 2: Phase 2a — Model Field Renames + File Renames (B7–B10)

> **Critical ordering:** Do B10 first (rename cyrillic files), then B8 (presense→presence), then B9 (readt_at→read_at), then B7 (face_embadding→face_embedding). This avoids import errors during migration.

### Task 7: B10 — Rename cyrillic model files to ASCII

**Files:**
- Rename: `app/models/аttendanceModels.py` → `app/models/attendanceModels.py`
- Rename: `app/models/аttendanceStatModels.py` → `app/models/attendanceStatModels.py`
- Modify: `app/models/__init__.py:9–10`

- [ ] **Step 1: Git-rename the files**

  The leading «а» in the filenames is Cyrillic (U+0430). Use single quotes in the shell:

  ```bash
  cd /Users/madi_gaziz/Desktop/alter_work/multi_tools/back_end
  git mv 'app/models/аttendanceModels.py' app/models/attendanceModels.py
  git mv 'app/models/аttendanceStatModels.py' app/models/attendanceStatModels.py
  ```

  If this fails (shell encoding issue), do a two-step rename:
  ```bash
  cp 'app/models/аttendanceModels.py' app/models/attendanceModels.py
  git rm 'app/models/аttendanceModels.py'
  git add app/models/attendanceModels.py

  cp 'app/models/аttendanceStatModels.py' app/models/attendanceStatModels.py
  git rm 'app/models/аttendanceStatModels.py'
  git add app/models/attendanceStatModels.py
  ```

- [ ] **Step 2: Update imports in app/models/__init__.py**

  Change lines 9–10:
  ```python
  # Old (cyrillic а):
  from .аttendanceModels import Attendance
  from .аttendanceStatModels import AttendanceStat

  # New (latin a):
  from .attendanceModels import Attendance
  from .attendanceStatModels import AttendanceStat
  ```

- [ ] **Step 3: Verify import**

  ```bash
  python manage.py check
  ```
  Expected: No errors.

- [ ] **Step 4: Commit**

  ```bash
  git add app/models/__init__.py app/models/attendanceModels.py app/models/attendanceStatModels.py
  git commit -m "Переименовать файлы моделей с кириллическими именами"
  ```

---

### Task 8: B8 — Rename Attendance.presense → presence

**Files:**
- Modify: `app/models/attendanceModels.py`
- New migration: `app/migrations/00XX_rename_presense_attendance_presence.py` (auto-generated)
- Modify: `app/signals.py`
- Modify: `api/views/attendanceAPI.py`
- Modify: `api/views/scheduleAPI.py`
- Modify: `api/serializer.py`
- Modify: `app/tasks.py`
- Modify: `app/utils/tools.py` (B5 fix — update `att.presense` → `att.presence`)

- [ ] **Step 1: Rename field in model**

  In `app/models/attendanceModels.py`, change:
  ```python
  presense = models.BooleanField("Присутствие", default=False)
  ```
  To:
  ```python
  presence = models.BooleanField("Присутствие", default=False)
  ```

  Also update `__str__`:
  ```python
  # Old:
  def __str__(self):
      return f"{self.student} - {self.schedule.subject} - {self.presense} - {self.schedule.time}"
  # New:
  def __str__(self):
      return f"{self.student} - {self.schedule.subject} - {self.presence} - {self.schedule.time}"
  ```

- [ ] **Step 2: Generate the RenameField migration**

  ```bash
  python manage.py makemigrations app --name rename_presense_attendance_presence
  ```

  Open the generated migration file and verify it contains:
  ```python
  migrations.RenameField(
      model_name='attendance',
      old_name='presense',
      new_name='presence',
  )
  ```
  If Django generated an `AlterField` instead, replace it manually with `RenameField`.

- [ ] **Step 3: Run the migration**

  ```bash
  python manage.py migrate
  ```
  Expected: Migration applies without error.

- [ ] **Step 4: Update app/signals.py**

  Search for all `presense` references and replace:

  All occurrences in `app/signals.py` (use `grep -n presense app/signals.py` to confirm):

  | Line | Old | New |
  |------|-----|-----|
  | 162 | `Attendance(..., presense=False)` | `Attendance(..., presence=False)` |
  | 408 | `def cache_old_presense(...)` | `def cache_old_presence(...)` |
  | 410 | `instance._old_presense = None` | `instance._old_presence = None` |
  | 412 | `Attendance.objects.only("presense")` | `Attendance.objects.only("presence")` |
  | 413 | `old.presense` / `instance._old_presense` | `old.presence` / `instance._old_presence` |
  | 424 | `if instance.presense:` | `if instance.presence:` |
  | 426 | log string `"presense=True"` | `"presence=True"` (string literal in logger, update for accuracy) |
  | 433 | `old = getattr(instance, "_old_presense", None)` | `"_old_presence"` |
  | 434 | `new = instance.presense` | `new = instance.presence` |
  | 473 | `if instance.presense:` | `if instance.presence:` |

  Also update the `@receiver` decorator target from `cache_old_presense` to `cache_old_presence` (the `pre_save` registration on line ~407).

- [ ] **Step 5: Update api/views/attendanceAPI.py**

  - Line 46: `presense=False` → `presence=False` in `bulk_create`
  - Line 76: `presense = request.data.get("presense")` → `presence = request.data.get("presence")`
  - Line 79: `if presense is not None:` → `if presence is not None:`
  - Line 80: `attendance.presense = presense` → `attendance.presence = presence`

- [ ] **Step 6: Update api/views/scheduleAPI.py**

  - Line 60: `presense=False` → `presence=False` in `Attendance.objects.create(...)`
  - Line 69 (response dict): `"presense": attendance.presense` → `"presence": attendance.presence`

- [ ] **Step 7: Update api/serializer.py**

  In `AttendanceRowSerializer.Meta.fields`:
  ```python
  # Old:
  fields = ("id", "presense", "marked_at", "student")
  # New:
  fields = ("id", "presence", "marked_at", "student")
  ```
  **Note:** This changes the API response key from `presense` to `presence`. Coordinate with frontend before deploying.

- [ ] **Step 8: Update app/tasks.py**

  Line 43:
  ```python
  # Old:
  attended=Count("id", filter=Q(presense=True)),
  # New:
  attended=Count("id", filter=Q(presence=True)),
  ```
  Also update the docstring comment on line 30: `presense=True` → `presence=True`.

- [ ] **Step 9: Update app/utils/tools.py (B5 fix)**

  ```python
  # Old:
  "✔️" if att.presense else "❌",
  # New:
  "✔️" if att.presence else "❌",
  ```

- [ ] **Step 10: Verify**

  ```bash
  python manage.py check
  python manage.py test api.tests --verbosity=2
  ```
  Expected: No errors, all existing tests pass.

- [ ] **Step 11: Commit**

  ```bash
  git add app/models/attendanceModels.py app/migrations/ app/signals.py \
    api/views/attendanceAPI.py api/views/scheduleAPI.py api/serializer.py \
    app/tasks.py app/utils/tools.py
  git commit -m "Переименовать поле Attendance.presense → presence"
  ```

---

### Task 9: B9 — Rename NotificationModels.readt_at → read_at

**Files:**
- Modify: `app/models/notificationModels.py`
- New migration: auto-generated
- Modify: `api/serializer.py`
- Modify: `api/views/notificationAPI.py`
- Modify: `app/utils/realtime_notifications.py`
- Modify: `api/tests/test_notification_api.py`
- Modify: `api/tests/test_notification_models.py`

- [ ] **Step 1: Rename field in model**

  In `app/models/notificationModels.py`, change:
  ```python
  readt_at = models.DateTimeField("Дата прочтения", null=True, blank=True)
  ```
  To:
  ```python
  read_at = models.DateTimeField("Дата прочтения", null=True, blank=True)
  ```

- [ ] **Step 2: Generate and run migration**

  ```bash
  python manage.py makemigrations app --name rename_readt_at_notification_read_at
  python manage.py migrate
  ```
  Verify migration contains `RenameField` (not `AlterField`). Correct manually if needed.

- [ ] **Step 3: Update all references**

  **`api/serializer.py`** — `NotificationSerializer.Meta.fields`:
  ```python
  # Old:
  "readt_at",
  # New:
  "read_at",
  ```

  **`api/views/notificationAPI.py`** lines 53–54:
  ```python
  # Old:
  notification.readt_at = timezone.now()
  notification.save(update_fields=["is_read", "readt_at"])
  # New:
  notification.read_at = timezone.now()
  notification.save(update_fields=["is_read", "read_at"])
  ```

  **`app/utils/realtime_notifications.py`** line 71:
  ```python
  # Old:
  notification.readt_at.isoformat()
  # New:
  notification.read_at.isoformat()
  ```

  **`api/tests/test_notification_api.py`** line 58:
  ```python
  # Old:
  self.teacher_notification.readt_at
  # New:
  self.teacher_notification.read_at
  ```

  **`api/tests/test_notification_models.py`** line 41:
  ```python
  # Old:
  notification.readt_at
  # New:
  notification.read_at
  ```

- [ ] **Step 4: Verify**

  ```bash
  python manage.py check
  python manage.py test api.tests --verbosity=2
  ```

- [ ] **Step 5: Commit**

  ```bash
  git add app/models/notificationModels.py app/migrations/ api/serializer.py \
    api/views/notificationAPI.py app/utils/realtime_notifications.py \
    api/tests/test_notification_api.py api/tests/test_notification_models.py
  git commit -m "Переименовать поле NotificationModels.readt_at → read_at"
  ```

---

### Task 10: B7 — Rename Student.face_embadding → face_embedding

**Files:**
- Modify: `app/models/studentModels.py`
- New migration: auto-generated (on top of existing `0030_student_face_embadding_...`)
- Any views/serializers with direct `face_embadding` access

- [ ] **Step 1: Rename field in model**

  In `app/models/studentModels.py`, change:
  ```python
  face_embadding = VectorField(
      dimensions=512, null=True, blank=True, verbose_name="Биометрические данные лица"
  )
  ```
  To:
  ```python
  face_embedding = VectorField(
      dimensions=512, null=True, blank=True, verbose_name="Биометрические данные лица"
  )
  ```

- [ ] **Step 2: Generate migration**

  ```bash
  python manage.py makemigrations app --name rename_face_embadding_student_face_embedding
  ```

  Verify migration uses `RenameField`. **Do NOT edit** `0030_student_face_embadding_student_face_updated_at.py` — that existing migration must remain unchanged.

- [ ] **Step 3: Run migration**

  ```bash
  python manage.py migrate
  ```

- [ ] **Step 4: Find and update all remaining references**

  ```bash
  grep -rn "face_embadding" /Users/madi_gaziz/Desktop/alter_work/multi_tools/back_end --include="*.py" | grep -v __pycache__ | grep -v migrations/
  ```

  Update every occurrence found to `face_embedding`.

- [ ] **Step 5: Verify**

  ```bash
  python manage.py check
  python manage.py test api.tests --verbosity=2
  ```

- [ ] **Step 6: Commit**

  ```bash
  git add app/models/studentModels.py app/migrations/
  # Plus any other files modified in step 4
  git commit -m "Переименовать поле Student.face_embadding → face_embedding"
  ```

---

## Chunk 3: Phase 2b — Security & Code Quality (B11–B15)

### Task 11: B11 — Rate limiting on /api/token/

**Files:**
- Modify: `api/urls.py`
- Modify: `core/settings.py`

- [ ] **Step 1: Add throttle rates to settings**

  In `core/settings.py`, add `DEFAULT_THROTTLE_RATES` as a **new key** inside the existing `REST_FRAMEWORK` dict (do not replace the whole dict — `DEFAULT_AUTHENTICATION_CLASSES` must stay):
  ```python
  REST_FRAMEWORK = {
      "DEFAULT_AUTHENTICATION_CLASSES": [
          "rest_framework_simplejwt.authentication.JWTAuthentication",
      ],
      # ADD this key:
      "DEFAULT_THROTTLE_RATES": {
          "anon": "20/min",
      },
  }
  ```

- [ ] **Step 2: Create throttled token view in api/urls.py**

  In `api/urls.py`, replace:
  ```python
  from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
  ```
  With:
  ```python
  from rest_framework.throttling import AnonRateThrottle
  from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView


  class ThrottledTokenObtainPairView(TokenObtainPairView):
      throttle_classes = [AnonRateThrottle]
  ```

  Then update the URL pattern:
  ```python
  # Old:
  path("token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
  # New:
  path("token/", ThrottledTokenObtainPairView.as_view(), name="token_obtain_pair"),
  ```

- [ ] **Step 3: Verify existing token tests still pass**

  ```bash
  python manage.py test api.tests.test_auth --verbosity=2
  ```
  Expected: All pass (throttle won't trigger in tests since test client makes few requests).

- [ ] **Step 4: Commit**

  ```bash
  git add api/urls.py core/settings.py
  git commit -m "Добавить rate limiting на эндпоинт получения токена"
  ```

---

### Task 12: B12 — Fix cache key typo in GetAllStudents

**Files:**
- Modify: `api/views/groupAPI.py`

- [ ] **Step 1: Fix all three occurrences of `cahce_key`**

  In `api/views/groupAPI.py`, `GetAllStudents.get` method, rename the variable in all three places:

  ```python
  # Old line 114:
  cahce_key = f"students_by_teacher:{teacher.id}"
  # New:
  cache_key = f"students_by_teacher:{teacher.id}"

  # Old line 115:
  cached_data = cache.get(cahce_key)
  # New:
  cached_data = cache.get(cache_key)

  # Old line 128:
  cache.set(cahce_key, all_student, timeout=120)
  # New:
  cache.set(cache_key, all_student, timeout=120)
  ```

- [ ] **Step 2: Verify**

  ```bash
  python manage.py check
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add api/views/groupAPI.py
  git commit -m "Исправить опечатку cahce_key в GetAllStudents"
  ```

---

### Task 13: B13 — Add pagination to StudentListAPI

**Files:**
- Modify: `api/views/studentAPI.py`

- [ ] **Step 1: Update StudentListAPI.get**

  Replace the current `get` method:
  ```python
  def get(self, request, *args, **kwargs):
      students = Student.objects.all()
      serializer = StudentSerializer(students, many=True)
      return Response(serializer.data)
  ```
  With:
  ```python
  def get(self, request, *args, **kwargs):
      """API view to retrieve a paginated list of students."""
      qs = Student.objects.all()
      page = int(request.query_params.get("page", 1))
      page_size = int(request.query_params.get("page_size", 20))
      start = (page - 1) * page_size
      end = start + page_size
      total = qs.count()
      serializer = StudentSerializer(qs[start:end], many=True)
      return Response({"count": total, "results": serializer.data})
  ```

  Also fix the misplaced class docstring: move it to be the **first statement** inside the class body, before `permission_classes`. In `studentAPI.py`, the docstring currently appears after `permission_classes = [IsAuthenticated]` (lines 19–21). Swap their order so docstring comes first.

- [ ] **Step 2: Verify**

  ```bash
  python manage.py check
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add api/views/studentAPI.py
  git commit -m "Добавить пагинацию в StudentListAPI"
  ```

---

### Task 14: B14 — Replace print() with logger calls

**Files:**
- Modify: `api/views/scheduleAPI.py`
- Modify: `api/views/attendanceAPI.py`
- Modify: `app/views.py`

- [ ] **Step 1: Fix scheduleAPI.py**

  In `api/views/scheduleAPI.py`, replace:
  ```python
  print("Returning cached schedule data")
  ```
  With:
  ```python
  logger.info("Returning cached schedule data for teacher_id=%s", teacher.id)
  ```

  Replace:
  ```python
  print("Fetching schedule data from database")
  ```
  With:
  ```python
  logger.info("Fetching schedule data from DB for teacher_id=%s", teacher.id)
  ```

  Replace:
  ```python
  print(serializer.data)
  ```
  With:
  ```python
  logger.debug("Schedule data: %s", serializer.data)
  ```

  The `logger = logging.getLogger(__name__)` already exists in this file.

- [ ] **Step 2: Fix attendanceAPI.py**

  At the top of `api/views/attendanceAPI.py`, add the logger (it's missing):
  ```python
  import logging
  # ... existing imports ...
  logger = logging.getLogger(__name__)
  ```

  Then replace line 58:
  ```python
  # Old:
  print(attendances)
  # New:
  logger.debug("Attendance queryset for schedule_id=%s: count=%s", schedule_id, attendances.count())
  ```

- [ ] **Step 3: Fix app/views.py**

  At the top of `app/views.py`, add logger:
  ```python
  import logging
  logger = logging.getLogger(__name__)
  ```

  Replace the four `print()` calls:
  ```python
  # Line 31: print(data) →
  logger.debug("Telegram message data: %s", data)

  # Line 36: print("Message sent successfully") →
  logger.info("Telegram message sent successfully")

  # Line 38: print("Failed to send message") →
  logger.warning("Failed to send Telegram message: status=%s", response.status_code)

  # Line 50: print(f"[check_bot_status] Ошибка подключения к боту: {e}") →
  logger.error("Bot connection error: %s", e)
  ```

- [ ] **Step 4: Verify**

  ```bash
  python manage.py check
  ```

- [ ] **Step 5: Commit**

  ```bash
  git add api/views/scheduleAPI.py api/views/attendanceAPI.py app/views.py
  git commit -m "Заменить print() на logger"
  ```

---

### Task 15: B15 — Move NGROK domain to env var

**Files:**
- Modify: `core/settings.py`

- [ ] **Step 1: Replace hardcoded NGROK_DOMAIN**

  In `core/settings.py`, replace:
  ```python
  NGROK_DOMAIN = "394610267b27"
  ```
  With:
  ```python
  NGROK_DOMAIN = os.getenv("NGROK_DOMAIN", "")
  ```

- [ ] **Step 2: Add to local .env**

  In `.env`, add:
  ```
  NGROK_DOMAIN=394610267b27
  ```

- [ ] **Step 3: Verify**

  ```bash
  python manage.py check
  ```

- [ ] **Step 4: Commit**

  ```bash
  git add core/settings.py
  git commit -m "Перенести NGROK_DOMAIN в переменные окружения"
  ```

---

## Chunk 4: Phase 3 — Medium/Low Fixes (B16–B25)

### Task 16: B16 — Wrap bulk operations in atomic() inside _on_commit

**Files:**
- Modify: `app/signals.py`

- [ ] **Step 1: Wrap bulk operations in transaction.atomic()**

  In `app/signals.py`, inside `create_attendance_for_schedule`, the `_on_commit` inner function currently has bulk operations without atomicity. Wrap them:

  ```python
  def _on_commit():
      logger.info(
          "on_commit fired: schedule_id=%s group_id=%s subject_id=%s",
          schedule.id, group.id, subject.id,
      )

      student_ids = list(group.students.values_list("id", flat=True))
      logger.info("Students in group for schedule_id=%s: count=%s", schedule.id, len(student_ids))

      if not student_ids:
          logger.warning("No students found in group: schedule_id=%s group_id=%s", schedule.id, group.id)
      else:
          with transaction.atomic():  # independent transaction (on_commit runs after outer tx commits)
              created_att = Attendance.objects.bulk_create(
                  [Attendance(student_id=sid, schedule_id=schedule.id, presence=False) for sid in student_ids],
                  ignore_conflicts=True,
                  batch_size=1000,
              )
              logger.info(
                  "Attendance bulk_create done: schedule_id=%s requested=%s returned=%s",
                  schedule.id, len(student_ids), len(created_att),
              )

              existing_stats = set(
                  AttendanceStat.objects.filter(
                      group_id=group.id, subject_id=subject.id, student_id__in=student_ids,
                  ).values_list("student_id", flat=True)
              )
              to_update = list(existing_stats)
              to_create = [sid for sid in student_ids if sid not in existing_stats]

              if to_update:
                  AttendanceStat.objects.filter(
                      group_id=group.id, subject_id=subject.id, student_id__in=to_update,
                  ).update(total=F("total") + 1)

              if to_create:
                  AttendanceStat.objects.bulk_create(
                      [AttendanceStat(student_id=sid, subject_id=subject.id, group_id=group.id, total=1, attended=0)
                       for sid in to_create],
                      batch_size=1000,
                  )

      _notify_schedule_change(  # outside atomic — notification failure must not roll back attendance
          schedule, title="...", message="...", payload={...},
      )
  ```

  Note: keep the `_notify_schedule_change(...)` call outside the `with transaction.atomic()` block.

- [ ] **Step 2: Verify**

  ```bash
  python manage.py check
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add app/signals.py
  git commit -m "Обернуть bulk_create в transaction.atomic в on_commit сигнале"
  ```

---

### Task 17: B17 — Add retry logic to process_notification_delivery

**Files:**
- Modify: `app/tasks.py`

- [ ] **Step 1: Add bind=True and retry logic**

  Change the decorator and function signature:
  ```python
  # Old:
  @shared_task(name="process_notification_delivery")
  def process_notification_delivery(delivery_id: int) -> dict:

  # New:
  @shared_task(bind=True, name="process_notification_delivery")
  def process_notification_delivery(self, delivery_id: int) -> dict:
  ```

  In the `except Exception as exc:` block, replace:
  ```python
  except Exception as exc:
      logger.exception("Notification delivery failed: delivery_id=%s", delivery_id)
      delivery.status = NotificationStatusChoices.FAILED
      delivery.attempts = attempt_number
      delivery.last_error = str(exc)
      delivery.save(update_fields=["status", "attempts", "last_error"])
      return {"delivery_id": delivery_id, "status": "failed", "error": str(exc)}
  ```
  With:
  ```python
  except Exception as exc:
      logger.exception("Notification delivery failed: delivery_id=%s attempt=%s", delivery_id, attempt_number)
      max_retries = 3
      delivery.attempts = attempt_number
      delivery.last_error = str(exc)
      if attempt_number < max_retries:
          delivery.save(update_fields=["attempts", "last_error"])
          raise self.retry(exc=exc, countdown=2 ** attempt_number)  # 2s, 4s backoff
      delivery.status = NotificationStatusChoices.FAILED
      delivery.save(update_fields=["status", "attempts", "last_error"])
      return {"delivery_id": delivery_id, "status": "failed", "error": str(exc)}
  ```

- [ ] **Step 2: Verify**

  ```bash
  python manage.py check
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add app/tasks.py
  git commit -m "Добавить экспоненциальный backoff для доставки уведомлений"
  ```

---

### Task 18: B18 — Validate NotificationPreference thresholds

**Files:**
- Modify: `api/serializer.py`

- [ ] **Step 1: Add validators to NotificationPreferenceSerializer**

  In `api/serializer.py`, inside `NotificationPreferenceSerializer`, add:

  ```python
  class NotificationPreferenceSerializer(ModelSerializer):
      class Meta:
          model = NotificationPreference
          fields = (
              "enabled",
              "allow_email",
              "allow_telegram",
              "threshold_percent",
              "drop_delta_percent",
              "updated_at",
          )
          read_only_fields = ("updated_at",)

      def validate_threshold_percent(self, value):
          if not 0 <= value <= 100:
              raise serializers.ValidationError("Значение должно быть от 0 до 100")
          return value

      def validate_drop_delta_percent(self, value):
          if not 1 <= value <= 100:
              raise serializers.ValidationError("Значение должно быть от 1 до 100")
          return value
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add api/serializer.py
  git commit -m "Добавить валидацию порогов NotificationPreference"
  ```

---

### Task 19: B19 — Clean up TODO comments

**Files:**
- Modify: `api/views/studentAPI.py`
- Modify: `api/views/scheduleAPI.py`

- [ ] **Step 1: Clean studentAPI.py**

  - Remove `# TODO: Убрать это пока или просто закоментировать` comment from `GetStudentPhoto`
  - Remove the unreachable `except Student.DoesNotExist` block in `GetStudentPhoto` (unreachable after `.first()`)
  - Remove the `create_excel_mark_file` stub function entirely (lines 84–88: `def create_excel_mark_file(APIView): pass  # TODO: ...`)
  - Remove the `# TODO: Переписать на id` comment in `getStudentInformation`

- [ ] **Step 2: Clean scheduleAPI.py**

  - Remove the TODO comment about date filtering (line 33)
  - Remove the `# TODO: Поменяй потом на 300 секунд` comment (line 37)

- [ ] **Step 3: Fix schedule cache TTL (functional change)**

  In `api/views/scheduleAPI.py`, change:
  ```python
  cache.set(cache_key, serializer.data, timeout=10)  # Кэшируем на 5 минут
  ```
  To:
  ```python
  cache.set(cache_key, serializer.data, timeout=300)  # 5 minutes
  ```

- [ ] **Step 4: Commit**

  ```bash
  git add api/views/studentAPI.py api/views/scheduleAPI.py
  git commit -m "Убрать TODO-комментарии и исправить TTL кэша расписания"
  ```

---

### Task 20: B20 — WebSocket consumer error handling

**Files:**
- Modify: `api/consumers.py`

- [ ] **Step 1: Add logger and wrap methods in try/except**

  ```python
  import logging

  from channels.db import database_sync_to_async
  from channels.generic.websocket import AsyncJsonWebsocketConsumer

  from accounts.models import TeacherProfile
  from app.utils.realtime_notifications import build_teacher_notifications_group

  logger = logging.getLogger(__name__)


  class NotificationConsumer(AsyncJsonWebsocketConsumer):
      group_name: str | None = None

      async def connect(self):
          try:
              user = self.scope.get("user")
              if not user or not user.is_authenticated:
                  await self.close(code=4401)
                  return

              teacher_id = await self._get_teacher_id(user.id)
              if not teacher_id:
                  await self.close(code=4403)
                  return

              self.group_name = build_teacher_notifications_group(teacher_id)
              await self.channel_layer.group_add(self.group_name, self.channel_name)
              await self.accept()
          except Exception:
              logger.exception("WebSocket connect error for user=%s", getattr(self.scope.get("user"), "id", None))
              await self.close(code=4500)

      async def disconnect(self, close_code):
          if self.group_name:
              await self.channel_layer.group_discard(self.group_name, self.channel_name)

      async def notification_created(self, event):
          try:
              await self.send_json(event["payload"])
          except Exception:
              logger.exception("WebSocket send error: event=%s", event)

      @database_sync_to_async
      def _get_teacher_id(self, user_id: int) -> int | None:
          return TeacherProfile.objects.filter(user_id=user_id).values_list("id", flat=True).first()
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add api/consumers.py
  git commit -m "Добавить обработку ошибок в WebSocket consumer"
  ```

---

### Task 21: B21 — Audit log for attendance changes

**Files:**
- Modify: `api/views/attendanceAPI.py`

- [ ] **Step 1: Add audit log in AttendanceAPI.patch**

  After `attendance.save()` in `AttendanceAPI.patch`, add:

  ```python
  attendance.save()
  logger.info(
      "Attendance updated: id=%s schedule_id=%s student_id=%s presence=%s by user_id=%s",
      attendance.id,
      attendance.schedule_id,
      attendance.student_id,
      attendance.presence,
      request.user.id,
  )
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add api/views/attendanceAPI.py
  git commit -m "Добавить аудит-лог изменений посещаемости"
  ```

---

### Task 22: B22 — Convert Russian code comments to English

**Files:**
- Modify: `api/views/scheduleAPI.py`
- Modify: `api/views/groupAPI.py`
- Modify: `app/models/groupModels.py`

- [ ] **Step 1: Convert inline code comments**

  Only code comments (not `verbose_name`, not error messages to users).

  Examples:
  - `scheduleAPI.py`: `# Не забудь добавить фильтрацию по дате` → `# TODO: add date filtering when frontend supports it`
  - `groupAPI.py`: `# TO-DO разобраться со статус кодом` → (remove — it's already handled)
  - `groupModels.py`: `# Специальность нужна?` → (remove dead question comment)

- [ ] **Step 2: Commit**

  ```bash
  git add api/views/scheduleAPI.py api/views/groupAPI.py app/models/groupModels.py
  git commit -m "Перевести комментарии в коде на английский"
  ```

---

### Task 23: B23 — Add missing docstrings

**Files:**
- Modify: `api/views/scheduleAPI.py`

- [ ] **Step 1: Add class docstrings to views without them**

  ```python
  class ScheduleListAPI(APIView):
      """API view to retrieve today's schedule list for the authenticated teacher."""

  class GetScheduleWithAttendens(APIView):
      """API view to retrieve schedule detail with attendance records for each student."""

  class GetScheduleGroupId(APIView):
      """API view to retrieve the group associated with a given schedule."""
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add api/views/scheduleAPI.py
  git commit -m "Добавить docstrings к API views расписания"
  ```

---

### Task 24: B25 — Add StudentSerializer field validation

**Files:**
- Modify: `api/serializer.py`

- [ ] **Step 1: Add age validation**

  In `StudentSerializer`, add:
  ```python
  def validate_age(self, value):
      if not 1 <= value <= 100:
          raise serializers.ValidationError("Возраст должен быть от 1 до 100")
      return value
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add api/serializer.py
  git commit -m "Добавить валидацию возраста в StudentSerializer"
  ```

---

### Task 25: B24 — Add minimal test stubs

**Files:**
- Modify: `api/tests/test_student_api.py`

- [ ] **Step 1: Add tests for file validation (B6)**

  In `api/tests/test_student_api.py`, add tests that verify:
  1. Uploading a non-image file returns 400
  2. Uploading an oversized file returns 400
  3. Creating a student without a photo returns 201

  Use `SimpleUploadedFile` from `django.core.files.uploadedfile`. See `api/tests/utils/test_auth_data.py` for the base test class pattern.

- [ ] **Step 2: Run tests**

  ```bash
  python manage.py test api.tests.test_student_api --verbosity=2
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add api/tests/test_student_api.py
  git commit -m "Добавить тесты валидации файла студента"
  ```

---

## Summary

| Phase | Tasks | Key changes |
|-------|-------|-------------|
| 1 — Critical | 1–6 | SECRET_KEY/DEBUG из env, CORS, docker-compose, Excel, file validation |
| 2a — Model renames | 7–10 | Cyrillic filenames, 3 RenameField миграции |
| 2b — Security/Quality | 11–15 | Rate limit, cache typo, pagination, remove print(), NGROK env |
| 3 — Medium/Low | 16–25 | Atomic signals, retry, validation, TODO cleanup, docstrings, tests |
