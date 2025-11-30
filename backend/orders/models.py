from django.db import models
from django.conf import settings
from catalog.models import Product

class Order(models.Model):
    STATUS_CHOICES = (
        ('confirmed', 'Confirmed'),
        ('processing', 'Processing'),
        ('in_transit', 'In Transit'),
        ('delivered', 'Delivered'),
        ('cancelled', 'Cancelled'),
    )
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    status = models.CharField(max_length=32, choices=STATUS_CHOICES, default='confirmed')
    total = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    estimated_delivery = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    # shipping fields
    full_name = models.CharField(max_length=255, blank=True)
    email = models.EmailField(blank=True)
    phone_number = models.CharField(max_length=32, blank=True)
    street_address = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=64, blank=True)
    zip_code = models.CharField(max_length=16, blank=True)
    country = models.CharField(max_length=64, blank=True)

    # payment summary
    payment_method = models.CharField(max_length=32, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=['user']),
            models.Index(fields=['status']),
            models.Index(fields=['created_at']),
        ]

class OrderItem(models.Model):
    order = models.ForeignKey(Order, related_name='items', on_delete=models.CASCADE)
    product = models.ForeignKey(Product, on_delete=models.PROTECT)
    quantity = models.PositiveIntegerField(default=1)
    price = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        indexes = [
            models.Index(fields=['order']),
            models.Index(fields=['product']),
        ]
