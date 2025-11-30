from django.urls import path
from .views import ProductListView, ProductDetailView, CategoryListView, MyProductListView, ProductCreateView, ProductUpdateDeleteView

urlpatterns = [
    path('', ProductListView.as_view()),
    path('<int:pk>', ProductDetailView.as_view()),
    path('categories', CategoryListView.as_view()),
    path('mine', MyProductListView.as_view()),
    path('create', ProductCreateView.as_view()),
    path('<int:pk>/manage', ProductUpdateDeleteView.as_view()),
]
