import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY', 'replace-me-in-production')
DEBUG = os.environ.get('DJANGO_DEBUG', 'True').lower() in ('1', 'true', 'yes')
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
USE_DJONGO = os.environ.get('USE_DJONGO', 'False').lower() in ('1', 'true', 'yes')
if DB_ENGINE == 'postgres':
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
elif DB_ENGINE == 'mongodb' and USE_DJONGO:
    DATABASES = {
        'default': {
            'ENGINE': 'djongo',
            'NAME': os.environ.get('DB_NAME', 'stylesathi'),
            'ENFORCE_SCHEMA': False,
            'CLIENT': {
                'host': os.environ.get('DB_HOST', '127.0.0.1'),
                'port': int(os.environ.get('DB_PORT', '27017')),
                'username': os.environ.get('DB_USER', ''),
                'password': os.environ.get('DB_PASSWORD', ''),
                'authSource': os.environ.get('DB_AUTH_SOURCE', 'admin'),
            }
        }
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }

# Optional direct MongoDB client for hybrid usage
if DB_ENGINE == 'mongodb' and not USE_DJONGO:
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
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.AllowAny',
    ),
}

from datetime import timedelta
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'AUTH_HEADER_TYPES': ('Bearer',),
}

CORS_ALLOW_ALL_ORIGINS = os.environ.get('CORS_ALLOW_ALL', 'False').lower() in ('1', 'true', 'yes')
default_cors = 'http://localhost:5173,http://127.0.0.1:5173'
CORS_ALLOWED_ORIGINS = [o for o in os.environ.get('CORS_ALLOWED_ORIGINS', default_cors).split(',') if o]

CSRF_TRUSTED_ORIGINS = [o for o in os.environ.get('CSRF_TRUSTED_ORIGINS', '').split(',') if o]

STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
