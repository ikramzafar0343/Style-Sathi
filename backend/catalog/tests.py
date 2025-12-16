from django.test import TestCase
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from .models import Category, Product
from .serializers import ProductSerializer


class ProductsCategoryFilterTests(TestCase):
    def test_filter_by_category_param(self):
        resp = self.client.get("/api/products/?category=Glasses")
        self.assertEqual(resp.status_code, 200)
        # Response should be JSON list or paginated object with results/products
        ct = resp.headers.get("Content-Type", "")
        self.assertIn("application/json", ct)

class CategoryStandardizationTests(TestCase):
    def test_category_name_standardizes_hat_cap_unique(self):
        c = Category(name='cap')
        c.save()
        self.assertEqual(c.name, 'Hat/Cap')
        from django.db import IntegrityError
        with self.assertRaises(IntegrityError):
            Category(name='hat').save()

class ProductFileValidationTests(TestCase):
    def test_rejects_invalid_image_type(self):
        cat = Category.objects.create(name='Glasses')
        bad_img = SimpleUploadedFile("bad.txt", b"content", content_type="text/plain")
        data = {
            'title': 'Test',
            'price': '10',
            'original_price': '12',
            'brand': 'X',
            'description': 'Y',
            'in_stock': 'true',
            'rating': '4.5',
            'features': [],
            'sku': 'SKU-TEST-001',
            'stock': '10',
            'category_id': cat.id,
        }
        ser = ProductSerializer(data=data, context={'request': type('obj', (), {'FILES': {'image': bad_img}})()})
        self.assertFalse(ser.is_valid())
        self.assertIn('image', ser.errors)

    def test_accepts_valid_image_png(self):
        cat = Category.objects.create(name='Glasses')
        good_img = SimpleUploadedFile("ok.png", b"\x89PNG\r\n\x1a\n", content_type="image/png")
        data = {
            'title': 'Test',
            'price': '10',
            'original_price': '12',
            'brand': 'X',
            'description': 'Y',
            'in_stock': 'true',
            'rating': '4.5',
            'features': [],
            'sku': 'SKU-TEST-002',
            'stock': '10',
            'category_id': cat.id,
        }
        ser = ProductSerializer(data=data, context={'request': type('obj', (), {'FILES': {'image': good_img}})()})
        self.assertTrue(ser.is_valid())

    def test_rejects_invalid_glb_type(self):
        cat = Category.objects.create(name='Glasses')
        bad_glb = SimpleUploadedFile("ok.glb", b"data", content_type="application/octet-stream")
        data = {
            'title': 'Test',
            'price': '10',
            'original_price': '12',
            'brand': 'X',
            'description': 'Y',
            'in_stock': 'true',
            'rating': '4.5',
            'features': [],
            'sku': 'SKU-TEST-003',
            'stock': '10',
            'category_id': cat.id,
        }
        ser = ProductSerializer(data=data, context={'request': type('obj', (), {'FILES': {'model_glb': bad_glb}})()})
        self.assertFalse(ser.is_valid())
        self.assertIn('model_glb', ser.errors)
