from celery import shared_task


# Данная задача предназначена для тестирования работы Celery.
@shared_task(name='hello_world_task')
def hello_world():
    return "Hello, World!"


