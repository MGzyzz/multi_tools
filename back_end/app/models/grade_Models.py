# from django.core.validators import MaxValueValidator
# from django.db import models


# class Grade(models.Model):
#     student = models.ForeignKey(
#         "Student", on_delete=models.CASCADE, verbose_name="Студент"
#     )
#     subject = models.ForeignKey(
#         "Subject_study", on_delete=models.CASCADE, verbose_name="Предмет"
#     )
#     bd_one = models.IntegerField("BD 1", default=0, validators=[MaxValueValidator(100)])
#     bd_two = models.IntegerField("BD 2", default=0, validators=[MaxValueValidator(100)])
#     exam = models.IntegerField(
#         "Экзамен", default=0, validators=[MaxValueValidator(100)]
#     )
#     final_grade = models.FloatField(
#         "Итоговая оценка", default=0.0, validators=[MaxValueValidator(100)]
#     )

#     def get_final_grade(self):
#         self.final_grade = self.bd_one * 0.3 + self.bd_two * 0.3 + self.exam * 0.4
#         self.save()

#     class Meta:
#         verbose_name = "Оценка"
#         verbose_name_plural = "Оценки"
