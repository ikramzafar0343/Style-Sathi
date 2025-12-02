from django.urls import path
from .views import UploadView, MakeupProcessView, JewelryProcessView, HairProcessView, AccessoriesProcessView, ClothingProcessView, OutfitUpdateView, MjpegStreamView, RealTimeFeedView, ChatStylistView, SkinAnalysisView

urlpatterns = [
    path('upload', UploadView.as_view()),
    path('process/makeup', MakeupProcessView.as_view()),
    path('process/jewelry', JewelryProcessView.as_view()),
    path('process/hair', HairProcessView.as_view()),
    path('process/accessories', AccessoriesProcessView.as_view()),
    path('process/clothing', ClothingProcessView.as_view()),
    path('outfit/update', OutfitUpdateView.as_view()),
    path('stream/mjpeg', MjpegStreamView.as_view()),
    path('feed', RealTimeFeedView.as_view()),
    path('chat/stylist', ChatStylistView.as_view()),
    path('skin/analysis', SkinAnalysisView.as_view()),
]
