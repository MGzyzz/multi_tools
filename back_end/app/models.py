from django.db import models
from django.core.validators import MaxValueValidator

# Create your models here.
class Student(models.Model):
    first_name = models.CharField("Имя", max_length=100)
    last_name = models.CharField("Фамилия", max_length=100)
    telegram_username = models.CharField("Telegram username", max_length=100, unique=True)
    telegram_id = models.CharField("Telegram ID", max_length=10, unique=True)
    email = models.EmailField("Email")
    age = models.IntegerField("Возраст")
    phone = models.CharField("Телефон", max_length=15)
    address = models.TextField("Адрес")
    gpa = models.FloatField("GPA", default=0.0)
    face_image = models.ImageField("Фото", upload_to='students/', blank=True, null=True)

    # def calculate_gpa(self):
    #     sum_grades = Subject_study.objects.filter(student=self).aggregate(Sum('grade'))['grade__sum']

    def __str__(self):
        return self.first_name + " " + self.last_name

    class Meta:
        verbose_name = "Студент"
        verbose_name_plural = "Студенты"


class Teacher(models.Model):
    first_name = models.CharField("Имя", max_length=100)
    last_name = models.CharField("Фамилия", max_length=100)
    email = models.EmailField("Email")
    phone = models.CharField("Телефон", max_length=15)

    def __str__(self):
        return self.first_name + " " + self.last_name

    class Meta:
        verbose_name = "Преподаватель"
        verbose_name_plural = "Преподаватели"


class Subject_study(models.Model):
    name = models.CharField("Название предмета", max_length=100)
    description = models.TextField("Описание")
    teacher = models.ForeignKey(Teacher, on_delete=models.CASCADE, verbose_name="Преподаватель")
    
    
    def __str__(self):
        return self.name + " " + self.teacher.first_name

    class Meta:
        verbose_name = "Предмет"
        verbose_name_plural = "Предметы"


class Group(models.Model):
    name = models.CharField("Название группы", max_length=100)
    students = models.ManyToManyField(Student, related_name="groups", verbose_name="Студенты")
    course = models.CharField("Курс", max_length=50)

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = "Группа"
        verbose_name_plural = "Группы"


"""

Schedule класс - отвечает за модель расписания и подробности о ней

"""

class Schedule(models.Model):
    group = models.ForeignKey(Group, on_delete=models.CASCADE, verbose_name="Группа")
    subject = models.ForeignKey(Subject_study, on_delete=models.CASCADE, verbose_name="Предмет")
    teacher = models.ForeignKey(Teacher, on_delete=models.CASCADE, verbose_name="Преподаватель")
    time = models.TimeField("Время")
    date = models.DateField("Дата")

    def __str__(self):
        return f"{self.group} - {self.subject} - {self.teacher}"


    def __str__(self):
        return self.group.name + " " + self.subject.name + " " + self.teacher.first_name + " " + str(self.time) + " " + str(self.date)

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
        return f"{self.student} - {self.subject} - {self.presense} - {self.time}"
    
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
