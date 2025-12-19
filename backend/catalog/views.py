from rest_framework import generics, filters, permissions
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from django.conf import settings
from django.utils import timezone
from .models import Product, Category
SEED_SKUS = {
    'RING-PREM-001',
    'WATCH-LUX-001',
    'GLASS-DES-001',
    'GLASS-AR-TEST-001',
    'GLB-SAMPLE-001',
    'SHOE-CLASS-001',
}
SEED_BRAND = 'Sample'
SEED_OWNER_EMAIL = 'seller@stylesathi.com'
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
        qs = super().get_queryset().filter(in_stock=True).exclude(sku__in=SEED_SKUS).exclude(brand__iexact=SEED_BRAND)
        category = self.request.query_params.get('category')
        if category:
            qs = qs.filter(category__name__iexact=category)
        return qs

    def list(self, request, *args, **kwargs):
        mongo = getattr(settings, 'MONGO_DB', None)
        if mongo is not None:
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
            query = {'in_stock': True, 'brand': {'$ne': SEED_BRAND}, 'sku': {'$nin': list(SEED_SKUS)}, 'owner_email': {'$ne': SEED_OWNER_EMAIL}}
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
        if mongo is not None:
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
        return Product.objects.filter(owner=self.request.user).exclude(sku__in=SEED_SKUS).exclude(brand__iexact=SEED_BRAND).order_by('-id')

    def list(self, request, *args, **kwargs):
        mongo = getattr(settings, 'MONGO_DB', None)
        if mongo is not None:
            email = getattr(request.user, 'email', None)
            try:
                docs = list(mongo['products'].find({'owner_email': email, 'brand': {'$ne': SEED_BRAND}, 'sku': {'$nin': list(SEED_SKUS)}}).sort('_id', -1).limit(500))
                data = [product_public(d) for d in docs]
                return Response(data)
            except Exception:
                pass
        return super().list(request, *args, **kwargs)

class ProductCreateView(generics.CreateAPIView):
    serializer_class = ProductSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def create(self, request, *args, **kwargs):
        user = request.user
        if getattr(user, 'role', 'customer') not in ['seller', 'admin']:
            return Response({'detail': 'Only sellers or admins can create products'}, status=403)
        mongo = getattr(settings, 'MONGO_DB', None)
        if mongo is not None:
            import secrets
            owner_email = getattr(user, 'email', None)
            doc = product_doc_from_request(request.data, getattr(request, 'FILES', None), owner_email)
            existing_doc = None
            try:
                existing_doc = mongo['products'].find_one({'sku': doc['sku']})
            except Exception:
                existing_doc = None
            if existing_doc and existing_doc.get('owner_email') != owner_email:
                doc['sku'] = 'SKU-' + secrets.token_hex(4).upper()
            try:
                mongo['products'].update_one({'sku': doc['sku']}, {'$set': doc}, upsert=True)
            except Exception:
                return Response({'detail': 'Failed to save product to database'}, status=400)
            try:
                mongo['categories'].update_one({'name': doc['category']}, {'$set': {'name': doc['category']}}, upsert=True)
            except Exception:
                pass
            try:
                cat, _ = Category.objects.get_or_create(name=doc.get('category') or '')
                orm_existing = Product.objects.filter(sku=doc.get('sku') or '').first()
                if orm_existing:
                    orm_existing.title = doc.get('title') or orm_existing.title
                    orm_existing.price = doc.get('price') or orm_existing.price
                    orm_existing.original_price = doc.get('original_price') or orm_existing.original_price
                    orm_existing.category = cat
                    orm_existing.brand = doc.get('brand') or ''
                    orm_existing.description = doc.get('description') or ''
                    orm_existing.image_url = doc.get('image_url') or ''
                    orm_existing.model_glb_url = doc.get('model_glb_url') or ''
                    orm_existing.sketchfab_embed_url = doc.get('sketchfab_embed_url') or ''
                    orm_existing.in_stock = bool(doc.get('in_stock'))
                    orm_existing.rating = float(doc.get('rating') or 0)
                    orm_existing.features = list(doc.get('features') or [])
                    orm_existing.owner = user
                    orm_existing.stock = int(doc.get('stock') or 0)
                    orm_existing.save()
                    # Ignore extra image URLs for ORM sync; primary URL stored in image_url
                else:
                    p = Product.objects.create(
                        title=doc.get('title') or '',
                        price=doc.get('price') or 0,
                        original_price=doc.get('original_price') or 0,
                        category=cat,
                        brand=doc.get('brand') or '',
                        description=doc.get('description') or '',
                        image_url=doc.get('image_url') or '',
                        model_glb_url=doc.get('model_glb_url') or '',
                        sketchfab_embed_url=doc.get('sketchfab_embed_url') or '',
                        in_stock=bool(doc.get('in_stock')),
                        rating=float(doc.get('rating') or 0),
                        features=list(doc.get('features') or []),
                        owner=user,
                        sku=doc.get('sku') or '',
                        stock=int(doc.get('stock') or 0)
                    )
                    # Ignore extra image URLs for ORM sync; primary URL stored in image_url
            except Exception:
                pass
            try:
                out = mongo['products'].find_one({'sku': doc['sku']})
                return Response(product_public(out), status=201)
            except Exception:
                return Response({'detail': 'Failed to return product'}, status=400)
        allowed = {
            'title', 'price', 'original_price', 'category_name', 'category_id', 'brand', 'description',
            'image_url', 'images', 'image', 'model_glb', 'model_glb_url', 'sketchfab_embed_url', 'in_stock',
            'rating', 'features', 'sku', 'stock'
        }
        clean_data = {k: v for k, v in request.data.items() if k in allowed}
        if hasattr(request, 'FILES'):
            for fk in ['image', 'model_glb']:
                if fk in request.FILES:
                    clean_data[fk] = request.FILES[fk]
        serializer = self.get_serializer(data=clean_data)
        if not serializer.is_valid():
            return Response({'errors': serializer.errors}, status=400)
        try:
            product = serializer.save()
        except Exception as e:
            return Response({'detail': str(e) or 'Failed to create product'}, status=400)
        mongo = getattr(settings, 'MONGO_DB', None)
        if mongo is not None:
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
        if mongo is not None:
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
        if mongo is not None and sku:
            try:
                mongo['products'].delete_one({'sku': sku})
            except Exception:
                pass

    def destroy(self, request, *args, **kwargs):
        reason = (request.data or {}).get('reason') if hasattr(request, 'data') else None
        if not reason:
            return Response({'detail': 'Reason is required for deletion'}, status=400)
        try:
            instance = self.get_object()
        except Exception:
            instance = None
        if instance is not None:
            try:
                CartItem.objects.filter(product=instance).delete()
            except Exception:
                pass
            sku = getattr(instance, 'sku', '')
            mongo = getattr(settings, 'MONGO_DB', None)
            if mongo is not None:
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
            self.perform_destroy(instance)
            if mongo is not None and sku:
                try:
                    mongo['products'].delete_one({'sku': sku})
                except Exception:
                    pass
            return Response({'detail': 'Product deleted', 'reason': reason, 'sku': sku}, status=200)
        mongo = getattr(settings, 'MONGO_DB', None)
        if mongo is None:
            return Response({'detail': 'Product not found'}, status=404)
        try:
            from bson import ObjectId
        except Exception:
            ObjectId = None
        pk = str(self.kwargs.get('pk'))
        query = {}
        doc = None
        if ObjectId is not None:
            try:
                oid = ObjectId(pk)
                query = {'_id': oid}
                doc = mongo['products'].find_one(query)
            except Exception:
                doc = None
        if doc is None:
            query = {'sku': pk}
            doc = mongo['products'].find_one(query)
        if not doc:
            return Response({'detail': 'Product not found'}, status=404)
        email = getattr(request.user, 'email', None)
        role = getattr(request.user, 'role', 'customer')
        if role != 'admin' and doc.get('owner_email') != email:
            return Response({'detail': 'Forbidden'}, status=403)
        try:
            mongo['audit'].insert_one({
                'type': 'product_delete',
                'sku': doc.get('sku') or '',
                'product_id': None,
                'reason': reason,
                'by': email,
                'time': timezone.now().isoformat()
            })
        except Exception:
            pass
        mongo['products'].delete_one(query)
        try:
            Product.objects.filter(sku=doc.get('sku') or '').delete()
            CartItem.objects.filter(product__sku=doc.get('sku') or '').delete()
        except Exception:
            pass
        return Response({'detail': 'Product deleted', 'reason': reason, 'sku': doc.get('sku') or ''}, status=200)
