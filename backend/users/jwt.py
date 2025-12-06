import os
import jwt
from datetime import datetime, timedelta, timezone

def _secret():
    return os.environ.get('JWT_SECRET') or os.environ.get('DJANGO_SECRET_KEY', 'replace-me')

def _alg():
    return os.environ.get('JWT_ALG', 'HS256')

def create_tokens(email, role):
    now = datetime.now(timezone.utc)
    access_exp = now + timedelta(minutes=int(os.environ.get('JWT_ACCESS_MINUTES', '60')))
    refresh_exp = now + timedelta(days=int(os.environ.get('JWT_REFRESH_DAYS', '7')))
    access_payload = {'sub': email, 'role': role, 'type': 'access', 'exp': access_exp}
    refresh_payload = {'sub': email, 'role': role, 'type': 'refresh', 'exp': refresh_exp}
    access = jwt.encode(access_payload, _secret(), algorithm=_alg())
    refresh = jwt.encode(refresh_payload, _secret(), algorithm=_alg())
    return {'access': access, 'refresh': refresh}

def decode_token(token):
    return jwt.decode(token, _secret(), algorithms=[_alg()])
