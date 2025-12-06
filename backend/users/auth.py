from rest_framework.authentication import BaseAuthentication, get_authorization_header
from rest_framework import exceptions
from django.conf import settings
from .jwt import decode_token
from .mongo import get_user_doc

class MongoUser:
    def __init__(self, doc):
        self.email = doc.get('email')
        self.username = doc.get('username') or self.email
        self.first_name = doc.get('first_name') or ''
        self.last_name = doc.get('last_name') or ''
        self.role = doc.get('role') or 'customer'
        self.phone = doc.get('phone') or ''
        self.is_authenticated = True
        self.is_active = doc.get('is_active', True)
        self.id = doc.get('_id') or self.email

class MongoJWTAuthentication(BaseAuthentication):
    def authenticate(self, request):
        if not getattr(settings, 'MONGO_DB', None):
            return None
        auth = get_authorization_header(request).split()
        if not auth or auth[0].lower() != b'bearer' or len(auth) != 2:
            return None
        try:
            payload = decode_token(auth[1].decode('utf-8'))
        except Exception:
            raise exceptions.AuthenticationFailed('Invalid token')
        email = payload.get('sub')
        if not email:
            raise exceptions.AuthenticationFailed('Invalid token')
        doc = get_user_doc(getattr(settings, 'MONGO_DB', None), email)
        if not doc or doc.get('is_active') is False:
            raise exceptions.AuthenticationFailed('User inactive or not found')
        return (MongoUser(doc), None)
