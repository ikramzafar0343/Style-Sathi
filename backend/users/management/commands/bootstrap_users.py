from django.core.management.base import BaseCommand
from users.models import User
import os

def ensure_user(email: str, password: str, role: str, is_staff=False, is_superuser=False):
    if not email or not password:
        return 'skipped'
    u = User.objects.filter(email=email).first()
    if u:
        return 'exists'
    u = User(email=email, username=(email.split('@')[0] if '@' in email else email), role=role, is_staff=is_staff, is_superuser=is_superuser)
    u.set_password(password)
    u.save()
    return 'created'

class Command(BaseCommand):
    help = 'Bootstrap admin/seller/customer users on deploy when enabled via env vars'

    def handle(self, *args, **options):
        # Admin
        admin_run = os.getenv('BOOTSTRAP_ADMIN_RUN', 'false').lower() in ('1', 'true', 'yes')
        admin_email = os.getenv('BOOTSTRAP_ADMIN_EMAIL', '')
        admin_password = os.getenv('BOOTSTRAP_ADMIN_PASSWORD', '')
        if admin_run:
            r = ensure_user(admin_email, admin_password, role='admin', is_staff=True, is_superuser=False)
            self.stdout.write(f'Admin {r}: {admin_email}')
        else:
            self.stdout.write('Admin bootstrap disabled')

        # Seller
        seller_run = os.getenv('SELLER_SEED_RUN', 'false').lower() in ('1', 'true', 'yes')
        seller_email = os.getenv('SELLER_SEED_EMAIL', '')
        seller_password = os.getenv('SELLER_SEED_PASSWORD', '')
        if seller_run:
            r = ensure_user(seller_email, seller_password, role='seller', is_staff=False, is_superuser=False)
            self.stdout.write(f'Seller {r}: {seller_email}')
        else:
            self.stdout.write('Seller bootstrap disabled')

        # Customer
        customer_run = os.getenv('CUSTOMER_SEED_RUN', 'false').lower() in ('1', 'true', 'yes')
        customer_email = os.getenv('CUSTOMER_SEED_EMAIL', '')
        customer_password = os.getenv('CUSTOMER_SEED_PASSWORD', '')
        if customer_run:
            r = ensure_user(customer_email, customer_password, role='customer', is_staff=False, is_superuser=False)
            self.stdout.write(f'Customer {r}: {customer_email}')
        else:
            self.stdout.write('Customer bootstrap disabled')
