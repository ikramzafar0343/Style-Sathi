from django.apps import AppConfig
from django.db.models.signals import post_migrate
from django.contrib.auth import get_user_model

class UsersConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'users'

    def ready(self):
        def _seed(sender=None, app_config=None, **kwargs):
            if app_config and app_config.name != 'users':
                return
            User = get_user_model()
            ae = 'admin@stylesathi.com'
            if not User.objects.filter(email=ae).exists():
                User.objects.create_superuser(username=ae, email=ae, password='admin123', role='admin')
            se = 'seller@stylesathi.com'
            if not User.objects.filter(email=se).exists():
                User.objects.create_user(username=se, email=se, password='seller123', role='seller')
            ce = 'customer@stylesathi.com'
            if not User.objects.filter(email=ce).exists():
                User.objects.create_user(username=ce, email=ce, password='customer123', role='customer')
        post_migrate.connect(_seed, dispatch_uid='users_seed_defaults')
