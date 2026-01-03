import openpyxl
from django.http import HttpResponse
from app.models import Student, Attendance

def create_excel_attendance_file(request):
    """
    Create an Excel file with student marks grouped by group and return it as a response.
    """
    workbook = openpyxl.Workbook()
    worksheet = workbook.active
    worksheet.title = 'Student Marks'

    headers = ['Group', 'Student Name', 'Subject', 'Presence']
    worksheet.append(headers)

    students = Student.objects.all().prefetch_related('groups', 'mark_set', 'mark_set__subject')

    for student in students:
        # Берем первую группу (если у студента несколько — можно адаптировать)
        group_names = ', '.join([g.name for g in student.groups.all()]) or 'Без группы'

        marks = student.mark_set.all()
        for mark in marks:
            row = [
                group_names,
                f"{student.first_name} {student.last_name}",
                mark.subject.name,
                "✔️" if mark.presense else "❌"
            ]
            worksheet.append(row)

    # Подготовка ответа
    response = HttpResponse(
        content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
    response['Content-Disposition'] = 'attachment; filename="student_marks_grouped.xlsx"'

    # Сохранение Excel в ответ
    workbook.save(response)
    return response
