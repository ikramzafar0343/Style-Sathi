from django.conf import settings
from django.http import StreamingHttpResponse
from rest_framework import status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
import io
import time

def _require_keys():
    g = getattr(settings, 'GEMINI_API_KEY', None)
    q = getattr(settings, 'GROQ_API_KEY', None)
    if not g or not q:
        return False
    return True

class UploadView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        f = request.FILES.get('file')
        if not f:
            return Response({'detail': 'file is required'}, status=status.HTTP_400_BAD_REQUEST)
        name = f.name.replace('..', '').replace('/', '_')
        if f.size > 10 * 1024 * 1024:
            return Response({'detail': 'file too large'}, status=status.HTTP_400_BAD_REQUEST)
        ct = f.content_type or ''
        allowed = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'model/gltf-binary', 'application/octet-stream']
        if ct not in allowed:
            return Response({'detail': 'unsupported type'}, status=status.HTTP_400_BAD_REQUEST)
        path = default_storage.save(f"uploads/{int(time.time())}_{name}", ContentFile(f.read()))
        return Response({'path': f"/{path}"}, status=status.HTTP_201_CREATED)

class _BaseProcess(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if not _require_keys():
            return Response({'detail': 'missing API keys'}, status=status.HTTP_400_BAD_REQUEST)
        payload = request.data or {}
        return Response({'result': {'ok': True, 'input': payload}}, status=status.HTTP_200_OK)

class MakeupProcessView(_BaseProcess):
    pass

class JewelryProcessView(_BaseProcess):
    pass

class HairProcessView(_BaseProcess):
    pass

class AccessoriesProcessView(_BaseProcess):
    pass

class ClothingProcessView(_BaseProcess):
    pass

class OutfitUpdateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        state = request.data or {}
        settings.CURRENT_OUTFIT_STATE = state
        return Response({'saved': True})

def _mjpeg_generator():
    while True:
        img_bytes = getattr(settings, 'LAST_FRAME_BYTES', None)
        if img_bytes is None:
            img_bytes = b"\xff\xd8\xff\xdb" + b"0" * 1024 + b"\xff\xd9"
        yield b"--frame\r\nContent-Type: image/jpeg\r\n\r\n" + img_bytes + b"\r\n"
        time.sleep(0.2)

class MjpegStreamView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        resp = StreamingHttpResponse(_mjpeg_generator(), content_type='multipart/x-mixed-replace; boundary=frame')
        return resp

class RealTimeFeedView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        state = getattr(settings, 'CURRENT_OUTFIT_STATE', {})
        return Response({'state': state})

class ChatStylistView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if not _require_keys():
            return Response({'detail': 'missing API keys'}, status=status.HTTP_400_BAD_REQUEST)
        msg = (request.data or {}).get('message') or ''
        if not msg:
            return Response({'detail': 'message is required'}, status=status.HTTP_400_BAD_REQUEST)
        return Response({'reply': 'Style suggestion based on trends and your preferences.'})

class SkinAnalysisView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if not _require_keys():
            return Response({'detail': 'missing API keys'}, status=status.HTTP_400_BAD_REQUEST)
        frame_info = request.data or {}
        return Response({'analysis': {'tone': 'neutral', 'concerns': ['dryness'], 'recommendations': ['hydrating serum']}})
