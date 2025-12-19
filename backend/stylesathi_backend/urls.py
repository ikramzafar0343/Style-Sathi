from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from django.http import HttpResponse, JsonResponse
from rest_framework.schemas import get_schema_view
from rest_framework import permissions
from rest_framework.schemas.openapi import SchemaGenerator
from django.shortcuts import redirect
from django.views.static import serve as static_serve

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('users.urls')),
    path('api/products/', include('catalog.urls')),
    path('api/cart/', include('cart.urls')),
    path('api/orders/', include('orders.urls')),
    path('api/profile/', include('users.profile_urls')),
    path('api/skin/', include('tryon.urls')),
]

# Serve media files
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
if not settings.DEBUG:
    urlpatterns += [
        re_path(r'^media/(?P<path>.*)$', static_serve, {'document_root': settings.MEDIA_ROOT}),
    ]

# OpenAPI schema (JSON)
def openapi_json_view(request):
    try:
        gen = SchemaGenerator(
            title="STYLE SATHI API",
            description="API documentation for STYLE SATHI backend",
            version="1.0.0",
        )
        schema = gen.get_schema(request=request, public=True)
        data = schema.to_dict() if hasattr(schema, 'to_dict') else schema
        if not isinstance(data, dict):
            data = {}
    except Exception as e:
        data = {
            "openapi": "3.0.0",
            "info": {
                "title": "STYLE SATHI API",
                "version": "1.0.0",
                "description": "Fallback schema (schema generation failed)",
            },
            "paths": {},
            "components": {},
            "x_error": str(e),
        }
    try:
        tag_map = {
            '/api/auth': 'auth',
            '/api/products': 'catalog',
            '/api/cart': 'cart',
            '/api/orders': 'orders',
            '/api/skin': 'tryon',
            '/api/profile': 'auth',
        }
        tags_set = set(tag_map.values())
        for p, ops in (data.get('paths') or {}).items():
            t = None
            for prefix, tag in tag_map.items():
                if str(p).startswith(prefix):
                    t = tag
                    break
            if not t:
                t = 'default'
                tags_set.add('default')
            for method, op in (ops or {}).items():
                if isinstance(op, dict):
                    current = op.get('tags') or []
                    if t not in current:
                        op['tags'] = [t] + [x for x in current if x != t]
        data['tags'] = [{'name': n} for n in sorted(tags_set)]
        comps = data.get('components') or {}
        sec_schemes = comps.get('securitySchemes') or {}
        sec_schemes['bearerAuth'] = {'type': 'http', 'scheme': 'bearer', 'bearerFormat': 'JWT'}
        comps['securitySchemes'] = sec_schemes
        schemas = comps.get('schemas') or {}
        def add_schema(name, schema_obj):
            if name not in schemas:
                schemas[name] = schema_obj
        add_schema('User', {
            'type': 'object',
            'properties': {
                'id': {'type': 'integer'},
                'username': {'type': 'string'},
                'email': {'type': 'string', 'format': 'email'},
                'first_name': {'type': 'string'},
                'last_name': {'type': 'string'},
                'role': {'type': 'string', 'enum': ['customer', 'seller', 'admin']},
                'phone': {'type': 'string'},
                'business_name': {'type': 'string'},
                'business_type': {'type': 'string'},
                'registration_number': {'type': 'string'}
            }
        })
        add_schema('ShippingAddress', {
            'type': 'object',
            'properties': {
                'full_name': {'type': 'string'},
                'email': {'type': 'string', 'format': 'email'},
                'phone_number': {'type': 'string'},
                'street_address': {'type': 'string'},
                'city': {'type': 'string'},
                'zip_code': {'type': 'string'},
                'country': {'type': 'string'}
            }
        })
        add_schema('OrderItem', {
            'type': 'object',
            'properties': {
                'id': {'type': 'integer'},
                'product': {'$ref': '#/components/schemas/Product'},
                'quantity': {'type': 'integer'},
                'price': {'type': 'number', 'format': 'float'}
            }
        })
        add_schema('Order', {
            'type': 'object',
            'properties': {
                'id': {'type': 'integer'},
                'status': {'type': 'string', 'enum': ['confirmed', 'processing', 'in_transit', 'delivered', 'cancelled']},
                'total': {'type': 'number', 'format': 'float'},
                'estimated_delivery': {'type': 'string', 'format': 'date'},
                'created_at': {'type': 'string', 'format': 'date-time'},
                'full_name': {'type': 'string'},
                'email': {'type': 'string', 'format': 'email'},
                'phone_number': {'type': 'string'},
                'street_address': {'type': 'string'},
                'city': {'type': 'string'},
                'zip_code': {'type': 'string'},
                'country': {'type': 'string'},
                'payment_method': {'type': 'string'},
                'items': {'type': 'array', 'items': {'$ref': '#/components/schemas/OrderItem'}}
            }
        })
        add_schema('CartItem', {
            'type': 'object',
            'properties': {
                'product': {'$ref': '#/components/schemas/Product'},
                'quantity': {'type': 'integer'}
            }
        })
        add_schema('Cart', {
            'type': 'object',
            'properties': {
                'items': {'type': 'array', 'items': {'$ref': '#/components/schemas/CartItem'}},
                'updated_at': {'type': 'string', 'format': 'date-time'}
            }
        })
        add_schema('ModerationReport', {
            'type': 'object',
            'properties': {
                'report_id': {'type': 'string'},
                'type': {'type': 'string'},
                'user_email': {'type': 'string', 'format': 'email'},
                'submitted_by': {'type': 'string', 'format': 'email'},
                'description': {'type': 'string'},
                'status': {'type': 'string', 'enum': ['pending', 'under_review', 'resolved', 'rejected']},
                'severity': {'type': 'string', 'enum': ['low', 'medium', 'high']},
                'created_at': {'type': 'string', 'format': 'date-time'}
            }
        })
        add_schema('AuthTokens', {
            'type': 'object',
            'properties': {
                'access': {'type': 'string'},
                'refresh': {'type': 'string'}
            }
        })
        add_schema('LoginRequest', {
            'type': 'object',
            'properties': {
                'email': {'type': 'string', 'format': 'email'},
                'password': {'type': 'string'},
                'expected_role': {'type': 'string'}
            },
            'required': ['email', 'password']
        })
        add_schema('SignupRequest', {
            'type': 'object',
            'properties': {
                'email': {'type': 'string', 'format': 'email'},
                'password': {'type': 'string'},
                'phone': {'type': 'string'},
                'role': {'type': 'string'},
                'business_name': {'type': 'string'},
                'business_type': {'type': 'string'},
                'fullName': {'type': 'string'}
            },
            'required': ['email', 'password']
        })
        comps['schemas'] = schemas
        data['components'] = comps
        data['security'] = [{'bearerAuth': []}]
    except Exception:
        pass
    return JsonResponse(data)
urlpatterns += [
    path('api-docs/swagger.json', openapi_json_view, name='openapi-schema'),
]

# Swagger UI (served via CDN)
def swagger_ui_view(request):
    schema_url = request.build_absolute_uri('/api-docs/swagger.json')
    html = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>STYLE SATHI API Docs</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-standalone-preset.js"></script>
  <script>
    window.ui = SwaggerUIBundle({{
      url: "{schema_url}",
      dom_id: '#swagger-ui',
      deepLinking: true,
      presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
      layout: "StandaloneLayout"
    }});
  </script>
</body>
</html>"""
    return HttpResponse(html)

urlpatterns += [
    path('api-docs/', swagger_ui_view, name='swagger-ui'),
]

def redoc_view(request):
    schema_url = request.build_absolute_uri('/api-docs/swagger.json')
    html = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>STYLE SATHI API ReDoc</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/redoc@next/bundles/redoc.standalone.css" />
</head>
<body>
  <redoc spec-url="{schema_url}"></redoc>
  <script src="https://cdn.jsdelivr.net/npm/redoc@next/bundles/redoc.standalone.js"></script>
</body>
</html>"""
    return HttpResponse(html)

urlpatterns += [
    path('api-docs/redoc', redoc_view, name='redoc'),
]

def root_redirect(request):
    return redirect('/api-docs/', permanent=False)

urlpatterns += [
    path('', root_redirect, name='root'),
]
