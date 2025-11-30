from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

class Command(BaseCommand):
    help = 'Create default admin/seller/customer users'

    def handle(self, *args, **options):
        User = get_user_model()
        # Admin
        admin_email = 'admin@stylesathi.com'
        if not User.objects.filter(email=admin_email).exists():
            admin = User.objects.create_superuser(username=admin_email, email=admin_email, password='admin123', role='admin')
            self.stdout.write(self.style.SUCCESS(f'Created admin {admin_email} / admin123'))
        # Seller
        seller_email = 'seller@stylesathi.com'
        if not User.objects.filter(email=seller_email).exists():
            s = User.objects.create_user(username=seller_email, email=seller_email, password='seller123', role='seller')
            self.stdout.write(self.style.SUCCESS(f'Created seller {seller_email} / seller123'))
        # Customer
        customer_email = 'customer@stylesathi.com'
        if not User.objects.filter(email=customer_email).exists():
            c = User.objects.create_user(username=customer_email, email=customer_email, password='customer123', role='customer')
            self.stdout.write(self.style.SUCCESS(f'Created customer {customer_email} / customer123'))

