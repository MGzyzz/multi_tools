from django.shortcuts import render
from django.views.generic import TemplateView, ListView, CreateView, DetailView
from .models import *
from django.http import JsonResponse
from django.shortcuts import redirect
import requests
# Create your views here.



class HomePageView(ListView):
    template_name = 'home.html'
    model = Schedule
    context_object_name = 'schedules'
    
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['students'] = Student.objects.all()
        context['groups'] = Group.objects.all()
        return context
    
    
def send_telegram_message(request):
    # receptient    
    data = {
        "group_id": request.POST.get('grou_id'),
        "subject": request.POST.get('subject'),
        "message": request.POST.get('message'),
        "urgent": request.POST.get('urgent', False)
    }
    print(data)
    
    response = requests.post('http://localhost:8001/send_message_thread_bot', json=data)
    
    if response.status_code == 200:
        print('Message sent successfully')
    else:
        print('Failed to send message')
    
    # return JsonResponse({'status': 'ok'})
    return redirect('home')


def check_bot_status(request):
    try:
        response = requests.get('http://localhost:8001/status', timeout=2)
        if response.status_code == 200:
            return JsonResponse({'active': True})
    except requests.exceptions.RequestException as e:
        print(f"[check_bot_status] Ошибка подключения к боту: {e}")
    
    return JsonResponse({'active': False})

class ToolsView(CreateView):
    template_name = 'tools.html'
    
    
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['groups'] = Group.objects.all()
        return context




class StudentDetail(DetailView):
    template_name = 'studentDetail.html'
    model = Student
    context_object_name = 'student'