from django.db import models


class Student(models.Model):
    first_name = models.CharField("Имя", max_length=100)
    last_name = models.CharField("Фамилия", max_length=100)
    telegram_username = models.CharField(
        "Telegram username", max_length=100, unique=True, blank=True, null=True
    )
    telegram_id = models.CharField(
        "Telegram ID", max_length=10, unique=True, blank=True, null=True
    )
    email = models.EmailField(
        "Platonus Email",
    )
    platonus_id = models.PositiveBigIntegerField("ID platonus", blank=True, null=True)
    age = models.IntegerField("Возраст")
    phone = models.CharField("Телефон", max_length=15, blank=True, null=True)
    face_image = models.ImageField("Фото", upload_to="students/", blank=True, null=True)

    # def calculate_gpa(self):
    #     sum_grades = Subject_study.objects.filter(student=self).aggregate(Sum('grade'))['grade__sum']

    def __str__(self):
        return self.first_name + " " + self.last_name

    class Meta:
        verbose_name = "Студент"
        verbose_name_plural = "Студенты"
