from rest_framework import generics, filters, permissions
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from django.conf import settings
from django.utils import timezone
from .models import Product, Category
from cart.models import CartItem
from .serializers import ProductSerializer, CategorySerializer

class ProductListView(generics.ListAPIView):
    queryset = Product.objects.all().order_by('-id')
    serializer_class = ProductSerializer
    permission_classes = [permissions.AllowAny]
    filter_backends = [filters.SearchFilter]
    search_fields = ['title', 'brand', 'description']

    def get_queryset(self):
        qs = super().get_queryset().filter(in_stock=True)
        category = self.request.query_params.get('category')
        if category:
            qs = qs.filter(category__name__iexact=category)
        return qs

    def list(self, request, *args, **kwargs):
        mongo = getattr(settings, 'MONGO_DB', None)
        if mongo:
            params = request.query_params
            cat = params.get('category')
            search = params.get('search')
            query = {'in_stock': True}
            if cat:
                query['category'] = cat
            if search:
                query['$or'] = [
                    {'title': {'$regex': search, '$options': 'i'}},
                    {'brand': {'$regex': search, '$options': 'i'}},
                    {'description': {'$regex': search, '$options': 'i'}},
                ]
            try:
                docs = list(mongo['products'].find(query).sort('_id', -1).limit(200))
                data = []
                for d in docs:
                    cat_name = d.get('category') if isinstance(d.get('category'), str) else (d.get('category', {}).get('name') if isinstance(d.get('category'), dict) else '')
                    data.append({
                        'id': str(d.get('_id')),
                        'title': d.get('title') or d.get('name'),
                        'price': float(d.get('price') or 0),
                        'original_price': float(d.get('original_price') or 0),
                        'category': {'id': None, 'name': cat_name},
                        'brand': d.get('brand') or '',
                        'description': d.get('description') or '',
                        'image_url': d.get('image_url') or d.get('image') or '',
                        'model_glb_url': d.get('model_glb_url') or '',
                        'in_stock': bool(d.get('in_stock', True)),
                        'rating': float(d.get('rating') or 0),
                        'features': d.get('features') or [],
                        'owner': None,
                        'sku': d.get('sku') or '',
                        'stock': int(d.get('stock') or 0),
                    })
                # Fallback to ORM if collection empty
                if not data:
                    return super().list(request, *args, **kwargs)
                return Response(data)
            except Exception:
                # Any Mongo error -> fallback
                return super().list(request, *args, **kwargs)
        return super().list(request, *args, **kwargs)

class ProductDetailView(generics.RetrieveAPIView):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    permission_classes = [permissions.AllowAny]

class CategoryListView(generics.ListAPIView):
    queryset = Category.objects.all().order_by('name')
    serializer_class = CategorySerializer
    permission_classes = [permissions.AllowAny]

    def list(self, request, *args, **kwargs):
        mongo = getattr(settings, 'MONGO_DB', None)
        if mongo:
            try:
                docs = list(mongo['categories'].find({}, {'name': 1}).sort('name', 1).limit(200))
                data = [{'id': str(d.get('_id')), 'name': d.get('name')} for d in docs if d.get('name')]
                if not data:
                    return super().list(request, *args, **kwargs)
                return Response(data)
            except Exception:
                return super().list(request, *args, **kwargs)
        return super().list(request, *args, **kwargs)

class MyProductListView(generics.ListAPIView):
    serializer_class = ProductSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Product.objects.filter(owner=self.request.user).order_by('-id')

class ProductCreateView(generics.CreateAPIView):
    serializer_class = ProductSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def perform_create(self, serializer):
        user = self.request.user
        if getattr(user, 'role', 'customer') not in ['seller', 'admin']:
            raise PermissionDenied('Only sellers or admins can create products')
        product = serializer.save()
        mongo = getattr(settings, 'MONGO_DB', None)
        if mongo:
            try:
                doc = {
                    'title': product.title,
                    'price': float(product.price or 0),
                    'original_price': float(product.original_price or 0),
                    'category': product.category.name,
                    'brand': product.brand,
                    'description': product.description,
                    'image_url': product.image_url,
                    'model_glb_url': product.model_glb_url,
                    'sketchfab_embed_url': getattr(product, 'sketchfab_embed_url', ''),
                    'in_stock': bool(product.in_stock),
                    'rating': float(product.rating or 0),
                    'features': list(product.features or []),
                    'owner_email': getattr(product.owner, 'email', None),
                    'sku': product.sku,
                    'stock': int(product.stock or 0),
                }
                mongo['products'].update_one({'sku': product.sku}, {'$set': doc}, upsert=True)
                mongo['categories'].update_one({'name': product.category.name}, {'$set': {'name': product.category.name}}, upsert=True)
            except Exception:
                pass

class ProductUpdateDeleteView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    permission_classes = [permissions.IsAuthenticated]

    def check_object_permissions(self, request, obj):
        super().check_object_permissions(request, obj)
        user = request.user
        if getattr(user, 'role', 'customer') == 'admin':
            return
        if obj.owner_id != user.id:
            raise PermissionDenied('Not allowed to modify this product')

    def perform_update(self, serializer):
        product = serializer.save()
        mongo = getattr(settings, 'MONGO_DB', None)
        if mongo:
            try:
                doc = {
                    'title': product.title,
                    'price': float(product.price or 0),
                    'original_price': float(product.original_price or 0),
                    'category': product.category.name,
                    'brand': product.brand,
                    'description': product.description,
                    'image_url': product.image_url,
                    'model_glb_url': product.model_glb_url,
                    'sketchfab_embed_url': getattr(product, 'sketchfab_embed_url', ''),
                    'in_stock': bool(product.in_stock),
                    'rating': float(product.rating or 0),
                    'features': list(product.features or []),
                    'owner_email': getattr(product.owner, 'email', None),
                    'sku': product.sku,
                    'stock': int(product.stock or 0),
                }
                mongo['products'].update_one({'sku': product.sku}, {'$set': doc}, upsert=True)
                mongo['categories'].update_one({'name': product.category.name}, {'$set': {'name': product.category.name}}, upsert=True)
            except Exception:
                pass

    def perform_destroy(self, instance):
        sku = instance.sku
        super().perform_destroy(instance)
        mongo = getattr(settings, 'MONGO_DB', None)
        if mongo and sku:
            try:
                mongo['products'].delete_one({'sku': sku})
            except Exception:
                pass

    def destroy(self, request, *args, **kwargs):
        reason = (request.data or {}).get('reason') if hasattr(request, 'data') else None
        if not reason:
            return Response({'detail': 'Reason is required for deletion'}, status=400)
        instance = self.get_object()
        try:
            CartItem.objects.filter(product=instance).delete()
        except Exception:
            pass
        sku = getattr(instance, 'sku', '')
        mongo = getattr(settings, 'MONGO_DB', None)
        if mongo:
            try:
                mongo['audit'].insert_one({
                    'type': 'product_delete',
                    'sku': sku,
                    'product_id': instance.pk,
                    'reason': reason,
                    'by': getattr(request.user, 'email', None),
                    'time': timezone.now().isoformat()
                })
            except Exception:
                pass
        # Perform actual deletion (hard delete) and remove from Mongo by SKU
        self.perform_destroy(instance)
        return Response({'detail': 'Product deleted', 'reason': reason, 'sku': sku}, status=200)
