from django.db import models

class RoleChoices(models.TextChoices):
    TEACHER = "teacher", "Teacher"
    STUDENT = "student", "Student"
    
    #TODO: Убрать Student из RoleChoices после реализации логики учителя