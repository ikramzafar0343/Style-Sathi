from django.db import models
from django.conf import settings

class Category(models.Model):
    name = models.CharField(max_length=64, unique=True)

    def __str__(self):
        return self.name

class Product(models.Model):
    title = models.CharField(max_length=255)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    original_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    category = models.ForeignKey(Category, related_name='products', on_delete=models.PROTECT)
    brand = models.CharField(max_length=128, blank=True)
    description = models.TextField(blank=True)
    image_url = models.URLField(blank=True)
    model_glb_url = models.URLField(blank=True)
    sketchfab_embed_url = models.URLField(blank=True)
    in_stock = models.BooleanField(default=True)
    rating = models.FloatField(default=0)
    features = models.JSONField(default=list, blank=True)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='products', on_delete=models.CASCADE, null=True, blank=True)
    sku = models.CharField(max_length=64, blank=True, unique=True)
    stock = models.PositiveIntegerField(default=0)

    class Meta:
        indexes = [
            models.Index(fields=['category']),
            models.Index(fields=['title']),
            models.Index(fields=['in_stock']),
            models.Index(fields=['owner']),
            models.Index(fields=['price']),
        ]

    def __str__(self):
        return self.title
