from django.apps import AppConfig
from django.conf import settings
from .mongo import ensure_indexes

class CatalogConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'catalog'

    def ready(self):
        mongo = getattr(settings, 'MONGO_DB', None)
        if mongo:
            ensure_indexes(mongo)
