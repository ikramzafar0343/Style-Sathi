from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    ROLE_CHOICES = (
        ('customer', 'Customer'),
        ('seller', 'Seller'),
        ('admin', 'Admin'),
    )
    email = models.EmailField(unique=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='customer')
    phone = models.CharField(max_length=32, blank=True)
    business_name = models.CharField(max_length=255, blank=True)
    business_type = models.CharField(max_length=64, blank=True)
    registration_number = models.CharField(max_length=32, unique=True, null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=['role']),
        ]

    def __str__(self):
        return f"{self.email} ({self.role})"
