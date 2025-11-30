from django.urls import path
from .views import CartView, CartItemsView, CartItemDetailView

urlpatterns = [
    path('', CartView.as_view()),
    path('items', CartItemsView.as_view()),
    path('items/<int:pk>', CartItemDetailView.as_view()),
]

