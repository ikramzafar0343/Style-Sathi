import secrets
from django.contrib.auth.hashers import make_password, check_password

def ensure_indexes(mongo):
    try:
        mongo['users'].create_index('email', unique=True)
        mongo['users'].create_index('role')
        mongo['users'].create_index('date_joined')
    except Exception:
        pass

def to_doc(user):
    return {
        'email': user.email,
        'username': user.username,
        'first_name': user.first_name or '',
        'last_name': user.last_name or '',
        'role': user.role,
        'phone': user.phone or '',
        'business_name': getattr(user, 'business_name', '') or '',
        'business_type': getattr(user, 'business_type', '') or '',
        'registration_number': getattr(user, 'registration_number', '') or '',
        'is_active': getattr(user, 'is_active', True),
    }

def sync_user(mongo, user):
    ensure_indexes(mongo)
    doc = to_doc(user)
    mongo['users'].update_one({'email': user.email}, {'$set': doc}, upsert=True)

def create_user_doc(mongo, email, password, role='customer', extra=None):
    ensure_indexes(mongo)
    hashed = make_password(password)
    payload = {'email': email, 'password': hashed, 'role': role, 'is_active': True}
    if isinstance(extra, dict):
        payload.update({k: v for k, v in extra.items() if v is not None})
    mongo['users'].update_one({'email': email}, {'$setOnInsert': payload}, upsert=True)

def get_user_doc(mongo, email):
    return mongo['users'].find_one({'email': email})

def check_user_password(doc, password):
    hashed = doc.get('password') or ''
    if not hashed:
        return False
    return check_password(password, hashed)

def soft_delete_user(mongo, email):
    mongo['users'].update_one({'email': email}, {'$set': {'is_active': False}})
