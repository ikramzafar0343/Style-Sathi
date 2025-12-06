from django.core.management.base import BaseCommand
from django.conf import settings
from users.models import User
import os

class Command(BaseCommand):
    help = 'Bootstrap an admin user if not present. Controlled by env vars.'

    def handle(self, *args, **options):
        email = os.getenv('BOOTSTRAP_ADMIN_EMAIL', 'admin@stylesathi.com')
        password = os.getenv('BOOTSTRAP_ADMIN_PASSWORD', 'StyleSathiAdmin!2025')
        run = os.getenv('BOOTSTRAP_ADMIN_RUN', 'false').lower() in ('1', 'true', 'yes')
        if not run:
            self.stdout.write('Bootstrap admin skipped (set BOOTSTRAP_ADMIN_RUN=true to enable).')
            return
        user = User.objects.filter(email=email).first()
        if user:
            self.stdout.write(f'Admin user already exists: {email}')
            return
        user = User(email=email, username=email.split('@')[0], role='admin', is_staff=True, is_superuser=False)
        user.set_password(password)
        user.save()
        self.stdout.write(f'Admin user created: {email}')
