from django.test import TestCase
from django.urls import reverse


class AuthEndpointTests(TestCase):
    def test_login_get_not_allowed(self):
        url = "/api/auth/login"
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, 405)

    def test_login_post_invalid_body(self):
        url = "/api/auth/login"
        resp = self.client.post(url, data={"email": "nobody@example.com", "password": "wrong"}, content_type="application/json")
        # Expect a JSON response with error or detail; status may be 400/401 depending on view
        self.assertIn(resp.status_code, (400, 401))
        self.assertIn("application/json", resp.headers.get("Content-Type", ""))

