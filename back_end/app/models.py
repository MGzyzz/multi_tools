from django.db import models
from django.core.validators import MaxValueValidator

# Create your models here.
class Student(models.Model):
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    telegram_username = models.CharField(max_length=100, unique=True)
    telegram_id = models.CharField(max_length=10, unique=True)
    email = models.EmailField()
    age = models.IntegerField()
    phone = models.CharField(max_length=15)
    address = models.TextField()
    gpa = models.FloatField(default=0.0)

    # def calculate_gpa(self):
    #     sum_grades = Subject_study.objects.filter(student=self).aggregate(Sum('grade'))['grade__sum']

    def __str__(self):
        return self.first_name + " " + self.last_name


class Teacher(models.Model):
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    subject = models.CharField(max_length=100)
    email = models.EmailField()
    phone = models.CharField(max_length=15)

    def __str__(self):
        return self.first_name + " " + self.last_name

class Group(models.Model):
    name = models.CharField(max_length=100)
    students = models.ManyToManyField(Student, related_name="groups")
    course = models.CharField(max_length=50)

    def __str__(self):
        return self.name


class Schedule(models.Model):
    group = models.ForeignKey(Group, on_delete=models.CASCADE)
    subject = models.CharField(max_length=100)
    teacher = models.ForeignKey(Teacher, on_delete=models.CASCADE)
    time = models.TimeField()
    date = models.DateField()

    def __str__(self):
        return f"{self.group} - {self.subject} - {self.teacher}"


class Subject_study(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField()
    teacher = models.ForeignKey(Teacher, on_delete=models.CASCADE)
    

    def __str__(self):
        return self.name

class Grade(models.Model):
    student = models.ForeignKey(Student, on_delete=models.CASCADE)
    subject = models.ForeignKey(Subject_study, on_delete=models.CASCADE)
    bd_one = models.IntegerField(default=0, validators=[MaxValueValidator(100)])
    bd_two = models.IntegerField(default=0, validators=[MaxValueValidator(100)])
    exam = models.IntegerField(default=0, validators=[MaxValueValidator(100)])
    final_grade = models.FloatField(default=0.0, validators=[MaxValueValidator(100)])

    def get_final_grade(self):
        self.final_grade = (self.bd_one * 0.3 + self.bd_two * 0.3 + self.exam * 0.4)
        self.save()
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