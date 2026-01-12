from django.db import models
from django.core.validators import MaxValueValidator
from accounts.models import TeacherProfile
from django.core.exceptions import ObjectDoesNotExist

# Create your models here.
class Student(models.Model):
    first_name = models.CharField("Имя", max_length=100)
    last_name = models.CharField("Фамилия", max_length=100)
    telegram_username = models.CharField("Telegram username", max_length=100, unique=True, blank=True, null=True)
    telegram_id = models.CharField("Telegram ID", max_length=10, unique=True, blank=True, null=True)
    email = models.EmailField("Platonus Email",)
    platonus_id = models.PositiveBigIntegerField("ID platonus", blank=True, null=True)
    age = models.IntegerField("Возраст")
    phone = models.CharField("Телефон", max_length=15, blank=True, null=True)
    face_image = models.ImageField("Фото", upload_to='students/', blank=True, null=True)

    # def calculate_gpa(self):
    #     sum_grades = Subject_study.objects.filter(student=self).aggregate(Sum('grade'))['grade__sum']

    def __str__(self):
        return self.first_name + " " + self.last_name

    class Meta:
        verbose_name = "Студент"
        verbose_name_plural = "Студенты"


class Subject_study(models.Model):
    name = models.CharField("Название предмета", max_length=100)
    description = models.TextField("Описание")
    teacher = models.ForeignKey(TeacherProfile, on_delete=models.CASCADE, verbose_name="Преподаватель")
    
    
    def __str__(self):
        teacher_name = ""
        try:
            tp = self.teacher  # может кинуть DoesNotExist если teacher_id битый
            if tp and tp.user:
                teacher_name = tp.user.get_full_name() or tp.user.username
        except ObjectDoesNotExist:
            teacher_name = "(teacher missing)"
        return f"{self.name} {teacher_name}".strip()

    class Meta:
        verbose_name = "Предмет"
        verbose_name_plural = "Предметы"


class Group(models.Model):
    name = models.CharField("Название группы", max_length=100)
    students = models.ManyToManyField(Student, related_name="groups", verbose_name="Студенты", blank=True)
    course = models.CharField("Курс", max_length=50)
    teacher = models.ForeignKey(TeacherProfile, on_delete=models.SET_NULL, null=True, blank=True, verbose_name="Преподаватель")
    group_specialty = models.CharField("Специальность", max_length=100)
    # Специальность нужна?
    def __str__(self):
        return self.name

    class Meta:
        verbose_name = "Группа"
        verbose_name_plural = "Группы"
        constraints = [
            models.UniqueConstraint(
            fields=["name", "teacher"],
                name="unique_group_name_per_teacher"
            )
        ]


"""

Schedule класс - отвечает за модель расписания и подробности о ней

"""

class Schedule(models.Model):
    group = models.ForeignKey(Group, on_delete=models.CASCADE, verbose_name="Группа")
    subject = models.ForeignKey(Subject_study, on_delete=models.CASCADE, verbose_name="Предмет")
    teacher = models.ForeignKey(TeacherProfile, on_delete=models.CASCADE, blank=True, null=True, verbose_name="Преподаватель")
    time = models.TimeField("Время")
    date = models.DateField("Дата")
    
    # Думаю при детальной страницы для учителя от сюда получать данные

    def __str__(self):
        return f"{self.group.name} {self.subject.name} {self.time} {self.date}"

    class Meta:
        verbose_name = "Расписание"
        verbose_name_plural = "Расписания"

class Grade(models.Model):
    student = models.ForeignKey(Student, on_delete=models.CASCADE, verbose_name="Студент")
    subject = models.ForeignKey(Subject_study, on_delete=models.CASCADE, verbose_name="Предмет")
    bd_one = models.IntegerField("BD 1", default=0, validators=[MaxValueValidator(100)])
    bd_two = models.IntegerField("BD 2", default=0, validators=[MaxValueValidator(100)])
    exam = models.IntegerField("Экзамен", default=0, validators=[MaxValueValidator(100)])
    final_grade = models.FloatField("Итоговая оценка", default=0.0, validators=[MaxValueValidator(100)])

    def get_final_grade(self):
        self.final_grade = (self.bd_one * 0.3 + self.bd_two * 0.3 + self.exam * 0.4)
        self.save()
        
    class Meta:
        verbose_name = "Оценка"
        verbose_name_plural = "Оценки"
        

class Attendance(models.Model):
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='attendance', verbose_name="Студент")
    schedule = models.ForeignKey(Schedule, on_delete=models.CASCADE, null=False, related_name="attendances", verbose_name="Занятие")
    presense = models.BooleanField("Присутствие", default=False)
    marked_at = models.DateTimeField("Отмечено в", null=True, blank=True)

    
    def __str__(self):
        return f"{self.student} - {self.schedule.subject} - {self.presense} - {self.schedule.time}"
    
    class Meta:
        verbose_name = "Посещаемость"
        verbose_name_plural = "Посещаемости"
"""
Оценка предмета
GPA - 4.0

В таблицу Students добавить GPA поле

GPA - сбор всех оценок которые оцениваются до 4.0

Нужнно таблицу которая будет хранить оценки студента по каждому предмету

class Grade(models.Model):
    student = models.ForeignKey(Stundent, on_delete=models.CASCADE)
    subject = models.ForeignKey(Subject_study, on_delete=models.CASCADE)
    grade = models.FloatField()
        


"""


class AttendanceStat(models.Model):
    student = models.ForeignKey(Student, on_delete=models.CASCADE, verbose_name="Студент")
    subject = models.ForeignKey(Subject_study, on_delete=models.CASCADE, verbose_name="Предмет")
    group = models.ForeignKey(Group, on_delete=models.CASCADE, verbose_name="Группа")
    
    total = models.PositiveBigIntegerField("Всего занятий", default=0)
    attended = models.PositiveBigIntegerField("Посещено занятий", default=0)
    updated_at = models.DateTimeField("Обновлено в", auto_now=True)
    
    
    class Meta:
        verbose_name = "Статистика посещаемости"
        verbose_name_plural = "Статистика посещаемости"
        
        constraints = [
            models.UniqueConstraint(fields=["student", "subject", "group"], name="uniq_stat_student_subject_group")
        ]
        indexes = [
            models.Index(fields=["subject", "group"]),
            models.Index(fields=["student", "subject"]),
        ]
