from django.urls import path
from .views import OrderCreateView, OrderDetailView, SellerOrderListView, SellerOrderDetailView, OrderStatusUpdateView, AdminOrderListView

urlpatterns = [
    path('', OrderCreateView.as_view()),
    path('<int:pk>', OrderDetailView.as_view()),
    path('seller', SellerOrderListView.as_view()),
    path('seller/<int:pk>', SellerOrderDetailView.as_view()),
    path('<int:pk>/status', OrderStatusUpdateView.as_view()),
    path('admin', AdminOrderListView.as_view()),
]
