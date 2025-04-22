from rest_framework.serializers import ModelSerializer
from app.models import Student


class StudentSerializer(ModelSerializer):
    """
    Serializer for the Student model.
    """
    class Meta:
        model = Student
        fields = '__all__'