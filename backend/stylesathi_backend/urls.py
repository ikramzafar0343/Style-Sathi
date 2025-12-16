from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import HttpResponse, JsonResponse
from rest_framework.schemas import get_schema_view
from rest_framework import permissions
from rest_framework.schemas.openapi import SchemaGenerator

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('users.urls')),
    path('api/products/', include('catalog.urls')),
    path('api/cart/', include('cart.urls')),
    path('api/orders/', include('orders.urls')),
    path('api/profile/', include('users.profile_urls')),
    path('api/skin/', include('tryon.urls')),
]

urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

# OpenAPI schema (JSON)
def openapi_json_view(request):
    gen = SchemaGenerator(
        title="STYLE SATHI API",
        description="API documentation for STYLE SATHI backend",
        version="1.0.0",
    )
    schema = gen.get_schema(request=request, public=True)
    data = schema.to_dict() if hasattr(schema, 'to_dict') else schema
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
    window.ui = SwaggerUIBundle({
      url: "{schema_url}",
      dom_id: '#swagger-ui',
      deepLinking: true,
      presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
      layout: "StandaloneLayout"
    });
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
