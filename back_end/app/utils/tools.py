import openpyxl
from django.http import HttpResponse

from app.models import Student


def create_excel_attendance_file(request):
    """
    Create an Excel file with student attendance grouped by group and return it as a response.
    """
    workbook = openpyxl.Workbook()
    worksheet = workbook.active
    worksheet.title = "Student Attendance"

    headers = ["Group", "Student Name", "Subject", "Date", "Presence"]
    worksheet.append(headers)

    students = Student.objects.all().prefetch_related(
        "groups",
        "attendance",
        "attendance__schedule",
        "attendance__schedule__subject",
    )

    for student in students:
        group_names = ", ".join([g.name for g in student.groups.all()]) or "Без группы"

        for record in student.attendance.select_related("schedule__subject").all():
            subject_name = (
                record.schedule.subject.name if record.schedule and record.schedule.subject else "—"
            )
            row = [
                group_names,
                f"{student.first_name} {student.last_name}",
                subject_name,
                str(record.schedule.date) if record.schedule else "—",
                "✔️" if record.status in ("present", "late") else "❌",
            ]
            worksheet.append(row)

    response = HttpResponse(
        content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )
    response["Content-Disposition"] = 'attachment; filename="student_attendance.xlsx"'

    workbook.save(response)
    return response
