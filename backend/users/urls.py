from django.urls import path
from .views import SignupView, SellerSignupView, LoginView, ForgotPasswordView, ResetPasswordView, AdminUsersListView, AdminReportsView, AdminDashboardView, AdminAnalyticsView, RefreshView

urlpatterns = [
    path('signup', SignupView.as_view()),
    path('seller-signup', SellerSignupView.as_view()),
    path('login', LoginView.as_view()),
    path('admin/login', LoginView.as_view()),
    path('refresh', RefreshView.as_view()),
    path('admin/users', AdminUsersListView.as_view()),
    path('admin/reports', AdminReportsView.as_view()),
    path('admin/dashboard', AdminDashboardView.as_view()),
    path('admin/analytics', AdminAnalyticsView.as_view()),
    path('password/forgot', ForgotPasswordView.as_view()),
    path('password/reset', ResetPasswordView.as_view()),
]
