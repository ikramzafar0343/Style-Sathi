from rest_framework import generics, filters, permissions
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from django.conf import settings
from django.utils import timezone
from .models import Product, Category
from .mongo import product_doc_from_request, product_public
from cart.models import CartItem
from .serializers import ProductSerializer, CategorySerializer

class ProductListView(generics.ListAPIView):
    queryset = Product.objects.select_related('category', 'owner').all().order_by('-id')
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
            try:
                page = max(1, int(params.get('page', '1')))
            except Exception:
                page = 1
            try:
                page_size = min(100, max(1, int(params.get('page_size', '20'))))
            except Exception:
                page_size = 20
            query = {'in_stock': True}
            if cat:
                query['category'] = cat
            if search:
                query['$text'] = {'$search': search}
            try:
                cursor = mongo['products'].find(query).sort('_id', -1)
                total = cursor.count() if hasattr(cursor, 'count') else mongo['products'].count_documents(query)
                docs = list(cursor.skip((page-1)*page_size).limit(page_size))
                data = [product_public(d) for d in docs]
                # Fallback to ORM if collection empty
                if not data:
                    return super().list(request, *args, **kwargs)
                return Response({'results': data, 'page': page, 'page_size': page_size, 'total': total})
            except Exception:
                # Any Mongo error -> fallback
                return super().list(request, *args, **kwargs)
        return super().list(request, *args, **kwargs)

class ProductDetailView(generics.RetrieveAPIView):
    queryset = Product.objects.select_related('category', 'owner').all()
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

    def list(self, request, *args, **kwargs):
        mongo = getattr(settings, 'MONGO_DB', None)
        if mongo:
            email = getattr(request.user, 'email', None)
            try:
                docs = list(mongo['products'].find({'owner_email': email}).sort('_id', -1).limit(500))
                data = [product_public(d) for d in docs]
                return Response(data)
            except Exception:
                pass
        return super().list(request, *args, **kwargs)

class ProductCreateView(generics.CreateAPIView):
    serializer_class = ProductSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def create(self, request, *args, **kwargs):
        user = request.user
        if getattr(user, 'role', 'customer') not in ['seller', 'admin']:
            return Response({'detail': 'Only sellers or admins can create products'}, status=403)
        mongo = getattr(settings, 'MONGO_DB', None)
        if mongo:
            try:
                doc = product_doc_from_request(request.data, getattr(request, 'FILES', None), getattr(user, 'email', None))
                mongo['products'].update_one({'sku': doc['sku']}, {'$set': doc}, upsert=True)
                mongo['categories'].update_one({'name': doc['category']}, {'$set': {'name': doc['category']}}, upsert=True)
                out = mongo['products'].find_one({'sku': doc['sku']})
                return Response(product_public(out), status=201)
            except Exception:
                return Response({'detail': 'Failed to create product'}, status=400)
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            return Response({'errors': serializer.errors}, status=400)
        try:
            product = serializer.save()
        except Exception:
            return Response({'detail': 'Failed to create product'}, status=400)
        mongo = getattr(settings, 'MONGO_DB', None)
        if mongo:
            try:
                doc = product_doc_from_request({'title': product.title,
                                                'price': product.price,
                                                'original_price': product.original_price,
                                                'category': product.category.name,
                                                'brand': product.brand,
                                                'description': product.description,
                                                'image_url': product.image_url,
                                                'model_glb_url': product.model_glb_url,
                                                'sketchfab_embed_url': getattr(product, 'sketchfab_embed_url', ''),
                                                'in_stock': bool(product.in_stock),
                                                'rating': product.rating,
                                                'features': list(product.features or []),
                                                'sku': product.sku,
                                                'stock': product.stock}, {}, getattr(product.owner, 'email', None))
                mongo['products'].update_one({'sku': doc['sku']}, {'$set': doc}, upsert=True)
                mongo['categories'].update_one({'name': doc['category']}, {'$set': {'name': doc['category']}}, upsert=True)
            except Exception:
                pass
        return Response(ProductSerializer(product).data, status=201)

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
        mongo = getattr(settings, 'MONGO_DB', None)
        if mongo:
            try:
                product = self.get_object()
                doc = product_doc_from_request(self.request.data, getattr(self.request, 'FILES', None), getattr(self.request.user, 'email', None))
                doc['sku'] = self.request.data.get('sku') or product.sku
                mongo['products'].update_one({'sku': doc['sku']}, {'$set': doc}, upsert=True)
                if doc.get('category'):
                    mongo['categories'].update_one({'name': doc['category']}, {'$set': {'name': doc['category']}}, upsert=True)
            except Exception:
                pass
        product = serializer.save()

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
