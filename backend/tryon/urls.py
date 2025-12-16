from django.urls import path
from .views import SkinAnalyzeView


urlpatterns = [
    path('analyze', SkinAnalyzeView.as_view()),
]
