import os
from pathlib import Path
from urllib.parse import urlparse

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY', 'replace-me-in-production')
DEBUG = os.environ.get('DJANGO_DEBUG', 'False').lower() in ('1', 'true', 'yes')
ALLOWED_HOSTS = [h for h in os.environ.get('DJANGO_ALLOWED_HOSTS', '*').split(',') if h]

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'corsheaders',
    'users',
    'catalog',
    'cart',
    'orders',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'stylesathi_backend.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'stylesathi_backend.wsgi.application'

DB_ENGINE = os.environ.get('DB_ENGINE', 'sqlite').lower()
USE_DJONGO = os.environ.get('USE_DJONGO', '').lower()
USE_DJONGO = (USE_DJONGO in ('1', 'true', 'yes')) if USE_DJONGO != '' else None
try:
    import djongo  # noqa: F401
    DJONGO_AVAILABLE = True
except Exception:
    DJONGO_AVAILABLE = False
DATABASE_URL = os.environ.get('DATABASE_URL', '')

# Prefer DATABASE_URL when present (Render/Postgres)
if DATABASE_URL:
    _url = urlparse(DATABASE_URL)
    _name = (_url.path or '').lstrip('/')
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': _name,
            'USER': _url.username or '',
            'PASSWORD': _url.password or '',
            'HOST': _url.hostname or '127.0.0.1',
            'PORT': str(_url.port or '5432'),
        }
    }
elif DB_ENGINE == 'postgres':
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': os.environ.get('DB_NAME', 'stylesathi'),
            'USER': os.environ.get('DB_USER', 'postgres'),
            'PASSWORD': os.environ.get('DB_PASSWORD', 'postgres'),
            'HOST': os.environ.get('DB_HOST', '127.0.0.1'),
            'PORT': os.environ.get('DB_PORT', '5432'),
        }
    }
elif (
    (DB_ENGINE == 'mongodb' and (USE_DJONGO is True))
    or (os.environ.get('MONGO_URI', '') and (USE_DJONGO is not False))
) and DJONGO_AVAILABLE:
    _mongo_uri = os.environ.get('MONGO_URI', '')
    _client_cfg = {
        'host': os.environ.get('DB_HOST', '127.0.0.1'),
        'port': int(os.environ.get('DB_PORT', '27017')),
        'username': os.environ.get('DB_USER', ''),
        'password': os.environ.get('DB_PASSWORD', ''),
        'authSource': os.environ.get('DB_AUTH_SOURCE', 'admin'),
    }
    if _mongo_uri:
        _client_cfg = {'host': _mongo_uri}
    DATABASES = {
        'default': {
            'ENGINE': 'djongo',
            'NAME': os.environ.get('DB_NAME', 'stylesathi'),
            'ENFORCE_SCHEMA': False,
            'CLIENT': _client_cfg,
        }
    }
else:
    _render_env = os.environ.get('RENDER') or os.environ.get('RENDER_EXTERNAL_HOSTNAME')
    _sqlite_path = os.environ.get('SQLITE_PATH')
    if not _sqlite_path:
        _sqlite_path = '/tmp/db.sqlite3' if _render_env else str(BASE_DIR / 'db.sqlite3')
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': _sqlite_path,
        }
    }

# Optional direct MongoDB client for hybrid usage
if DB_ENGINE == 'mongodb' and (USE_DJONGO is False):
    MONGO_HOST = os.environ.get('DB_HOST', '127.0.0.1')
    MONGO_PORT = int(os.environ.get('DB_PORT', '27017'))
    MONGO_NAME = os.environ.get('DB_NAME', 'stylesathi')
    MONGO_USER = os.environ.get('DB_USER', '')
    MONGO_PASSWORD = os.environ.get('DB_PASSWORD', '')
    MONGO_AUTH_SOURCE = os.environ.get('DB_AUTH_SOURCE', 'admin')
    MONGO_URI = os.environ.get('MONGO_URI', '')
    try:
        import pymongo
        _uri = MONGO_URI or f"mongodb://{MONGO_USER}:{MONGO_PASSWORD}@{MONGO_HOST}:{MONGO_PORT}/?authSource={MONGO_AUTH_SOURCE}" if MONGO_USER else f"mongodb://{MONGO_HOST}:{MONGO_PORT}/"
        MONGO_CLIENT = pymongo.MongoClient(_uri)
        MONGO_DB = MONGO_CLIENT[MONGO_NAME]
    except Exception:
        MONGO_CLIENT = None
        MONGO_DB = None

AUTH_USER_MODEL = 'users.User'

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'users.auth.MongoJWTAuthentication',
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.AllowAny',
    ),
    'DEFAULT_THROTTLE_CLASSES': (
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
        'rest_framework.throttling.ScopedRateThrottle',
    ),
    'DEFAULT_THROTTLE_RATES': {
        'anon': '100/hour',
        'user': '1000/hour',
        'login': '20/hour',
        'password_forgot': '10/hour',
    },
    'EXCEPTION_HANDLER': 'stylesathi_backend.exceptions.custom_exception_handler',
}

from datetime import timedelta
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'AUTH_HEADER_TYPES': ('Bearer',),
}

_default_frontend = 'https://stylesathi-frontend.onrender.com'
_railway_frontend = 'https://stylesathi-frontend-production.up.railway.app'
default_cors = 'http://localhost:5173,http://127.0.0.1:5173,' + _default_frontend + ',' + _railway_frontend
CORS_ALLOWED_ORIGINS = [o for o in os.environ.get('CORS_ALLOWED_ORIGINS', default_cors).split(',') if o]
CORS_ALLOW_ALL_ORIGINS = os.environ.get('CORS_ALLOW_ALL_ORIGINS', str(DEBUG)).lower() in ('1', 'true', 'yes')
CORS_URLS_REGEX = r'^.*$'

_csrf_default = _default_frontend + ',' + _railway_frontend
CSRF_TRUSTED_ORIGINS = [o for o in os.environ.get('CSRF_TRUSTED_ORIGINS', _csrf_default).split(',') if o]

STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_DIRS = [BASE_DIR / 'static']
MEDIA_URL = '/media/'
_is_render = os.environ.get('RENDER') or os.environ.get('RENDER_EXTERNAL_HOSTNAME')
MEDIA_ROOT = (Path('/tmp/media') if _is_render else (BASE_DIR / 'media'))
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'
def whitenoise_add_headers(headers, path, url):
    headers['Access-Control-Allow-Origin'] = '*'
    headers['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
    headers['Access-Control-Allow-Headers'] = 'Origin, Content-Type, Accept, Range'
    if str(path).lower().endswith(('.gltf', '.glb', '.bin', '.png', '.jpg', '.jpeg', '.webp')):
        headers['Cache-Control'] = 'public, max-age=31536000, immutable'
WHITENOISE_ADD_HEADERS_FUNCTION = whitenoise_add_headers
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY')
GROQ_API_KEY = os.environ.get('GROQ_API_KEY')
