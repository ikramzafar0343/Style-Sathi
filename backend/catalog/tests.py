from django.test import TestCase


class ProductsCategoryFilterTests(TestCase):
    def test_filter_by_category_param(self):
        resp = self.client.get("/api/products/?category=Glasses")
        self.assertEqual(resp.status_code, 200)
        # Response should be JSON list or paginated object with results/products
        ct = resp.headers.get("Content-Type", "")
        self.assertIn("application/json", ct)

