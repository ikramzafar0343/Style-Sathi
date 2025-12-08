from django.core.management.base import BaseCommand
from catalog.models import Category, Product
from django.contrib.auth import get_user_model
from django.conf import settings

class Command(BaseCommand):
    help = 'Seed initial categories and products'

    def handle(self, *args, **options):
        User = get_user_model()
        seller = User.objects.filter(email='seller@stylesathi.com').first()
        categories = ['Rings', 'Glasses', 'Watches', 'Shoes', 'Cap/Hat', 'Hairs', 'Makeup', 'Jewelry']
        cat_objs = {}
        for name in categories:
            cat, _ = Category.objects.get_or_create(name=name)
            cat_objs[name] = cat
        products = [
            {
                'title': 'Premium Diamond Ring',
                'price': 1299.99,
                'original_price': 1599.99,
                'category': 'Rings',
                'brand': 'Tiffany & Co.',
                'description': 'Exquisite premium diamond ring with exceptional clarity and cut.',
                'image_url': 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=500&h=500&fit=crop',
                'in_stock': True,
                'rating': 4.8,
                'features': ['18K White Gold', '2.5 Carat Diamond', 'VS1 Clarity', 'Excellent Cut'],
                'stock': 12,
                'sku': 'RING-PREM-001',
            },
            {
                'title': 'Luxury Watch Collection',
                'price': 899.99,
                'original_price': 1199.99,
                'category': 'Watches',
                'brand': 'Rolex',
                'description': 'Elegant luxury watch with precision movement and premium materials.',
                'image_url': 'https://images.unsplash.com/photo-1511415512303-3e63b6fd49fa?w=500&h=500&fit=crop',
                'in_stock': True,
                'rating': 4.9,
                'features': ['Swiss Movement', 'Sapphire Crystal', 'Water Resistant', 'Stainless Steel'],
                'stock': 7,
                'sku': 'WATCH-LUX-001',
            },
            {
                'title': 'Designer Sunglasses',
                'price': 299.99,
                'original_price': 399.99,
                'category': 'Glasses',
                'brand': 'Ray-Ban',
                'description': 'Stylish designer sunglasses with UV protection and polarized lenses.',
                'image_url': 'https://images.unsplash.com/photo-1574258495973-f010dfbb5371?w=500&h=500&fit=crop',
                'in_stock': True,
                'rating': 4.6,
                'features': ['Polarized Lenses', 'UV Protection', 'Lightweight Frame', 'Case Included'],
                'stock': 20,
                'sku': 'GLASS-DES-001',
            },
            {
                'title': 'Ray-Ban Stories (AR Test)',
                'price': 349.99,
                'original_price': 399.99,
                'category': 'Glasses',
                'brand': 'Ray-Ban',
                'description': 'Sample product to test Sketchfab AR embed for smart glasses.',
                'image_url': 'https://images.unsplash.com/photo-1574258495973-f010dfbb5371?w=500&h=500&fit=crop',
                'in_stock': True,
                'rating': 4.7,
                'features': ['Sketchfab AR', 'Smart Glasses'],
                'stock': 10,
                'sku': 'GLASS-AR-TEST-001',
                'sketchfab_embed_url': 'https://sketchfab.com/models/1afc16df397c40d8a0ff4b61c74ea652/embed?preload=1&transparent=1&ui_theme=dark',
                'model_glb_url': 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/master/Models/DamagedHelmet/glTF-Binary/DamagedHelmet.glb',
            },
            {
                'title': 'GLB Sample (Damaged Helmet)',
                'price': 0.00,
                'original_price': 0.00,
                'category': 'Glasses',
                'brand': 'Sample',
                'description': 'Public sample GLB from Khronos, for try-on testing.',
                'image_url': 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?w=500&h=500&fit=crop',
                'in_stock': True,
                'rating': 5.0,
                'features': ['Sample GLB'],
                'stock': 100,
                'sku': 'GLB-SAMPLE-001',
                'model_glb_url': 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/master/Models/DamagedHelmet/glTF-Binary/DamagedHelmet.glb',
            },
            {
                'title': 'Classic Loafers',
                'price': 199.99,
                'original_price': 249.99,
                'category': 'Shoes',
                'brand': 'Cole Haan',
                'description': 'Comfortable classic loafers made from genuine leather with cushioned insoles.',
                'image_url': 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=500&h=500&fit=crop',
                'in_stock': True,
                'rating': 4.5,
                'features': ['Genuine Leather', 'Cushioned Insole', 'Rubber Sole', 'Multiple Colors'],
                'stock': 15,
                'sku': 'SHOE-CLASS-001',
            },
        ]
        for p in products:
            prod, _ = Product.objects.get_or_create(
                title=p['title'],
                defaults={
                    'price': p['price'],
                    'original_price': p['original_price'],
                    'category': cat_objs[p['category']],
                    'brand': p['brand'],
                    'description': p['description'],
                    'image_url': p['image_url'],
                    'sketchfab_embed_url': p.get('sketchfab_embed_url', ''),
                    'in_stock': p['in_stock'],
                    'rating': p['rating'],
                    'features': p['features'],
                    'owner': seller,
                    'stock': p['stock'],
                    'sku': p['sku'],
                }
            )
        mongo = getattr(settings, 'MONGO_DB', None)
        if mongo is not None:
            try:
                mongo['categories'].create_index('name', unique=True)
                mongo['products'].create_index('sku', unique=True)
                for name in categories:
                    mongo['categories'].update_one({'name': name}, {'$set': {'name': name}}, upsert=True)
                for p in products:
                    doc = {
                        'title': p['title'],
                        'price': float(p['price'] or 0),
                        'original_price': float(p['original_price'] or 0),
                        'category': p['category'],
                        'brand': p['brand'],
                        'description': p['description'],
                        'image_url': p['image_url'],
                        'sketchfab_embed_url': p.get('sketchfab_embed_url', ''),
                        'in_stock': bool(p['in_stock']),
                        'rating': float(p['rating'] or 0),
                        'features': list(p['features'] or []),
                        'owner_email': getattr(seller, 'email', None),
                        'sku': p['sku'],
                        'stock': int(p['stock'] or 0),
                    }
                    mongo['products'].update_one({'sku': p['sku']}, {'$set': doc}, upsert=True)
            except Exception:
                pass
        self.stdout.write(self.style.SUCCESS('Seeded categories and products'))
