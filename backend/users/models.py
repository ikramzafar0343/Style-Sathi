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

class ModerationReport(models.Model):
    REPORT_STATUS = (
        ('pending', 'Pending'),
        ('under_review', 'Under Review'),
        ('resolved', 'Resolved'),
        ('rejected', 'Rejected'),
    )
    REPORT_SEVERITY = (
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
    )
    report_id = models.CharField(max_length=64, unique=True)
    type = models.CharField(max_length=128)
    user_email = models.EmailField(blank=True)
    submitted_by = models.EmailField(blank=True)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=32, choices=REPORT_STATUS, default='pending')
    severity = models.CharField(max_length=16, choices=REPORT_SEVERITY, default='low')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['severity']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return self.report_id
