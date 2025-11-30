from django.urls import path
from .views import ProfileView, PhoneVerificationRequestView, PhoneVerificationVerifyView

urlpatterns = [
    path('', ProfileView.as_view()),
    path('phone/request', PhoneVerificationRequestView.as_view()),
    path('phone/verify', PhoneVerificationVerifyView.as_view()),
]
