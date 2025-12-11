from rest_framework import serializers
from django.conf import settings
from django.core.files.storage import default_storage
import os
import json
from .models import Product, Category
from .models import ProductImage

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name']

class ProductSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    category_name = serializers.CharField(write_only=True, required=False)
    category_id = serializers.IntegerField(write_only=True, required=False)
    image = serializers.ImageField(write_only=True, required=False)
    images = serializers.SerializerMethodField()
    model_glb = serializers.FileField(write_only=True, required=False)
    features = serializers.ListField(child=serializers.CharField(), required=False, allow_empty=True)

    class Meta:
        model = Product
        fields = ['id', 'title', 'price', 'original_price', 'category', 'category_name', 'category_id', 'brand', 'description', 'image_url', 'images', 'image', 'model_glb', 'model_glb_url', 'sketchfab_embed_url', 'in_stock', 'rating', 'features', 'owner', 'sku', 'stock']
        read_only_fields = ['owner']

    def to_internal_value(self, data):
        # Normalize features if provided as JSON string
        if isinstance(data.get('features'), str):
            try:
                parsed = json.loads(data.get('features'))
                if isinstance(parsed, list):
                    data = {**data, 'features': parsed}
            except Exception:
                pass
        return super().to_internal_value(data)

    def validate(self, attrs):
        # Coerce booleans and numbers
        raw_in_stock = self.initial_data.get('in_stock', attrs.get('in_stock'))
        if isinstance(raw_in_stock, str):
            attrs['in_stock'] = raw_in_stock.strip().lower() in ('1', 'true', 'yes')
        # Prefer uploaded files if both file and image_url provided
        has_file = bool(self.initial_data.get('image')) or (hasattr(self.context.get('request'), 'FILES') and bool(self.context.get('request').FILES.get('image')))
        raw_url = self.initial_data.get('image_url')
        if has_file and raw_url:
            attrs['image_url'] = ''
        # Ensure numbers
        for num_field in ('price', 'original_price', 'stock'):
            val = self.initial_data.get(num_field, attrs.get(num_field))
            try:
                attrs[num_field] = float(val) if num_field != 'stock' else int(val)
            except Exception:
                pass
        return super().validate(attrs)

    def create(self, validated_data):
        category_name = validated_data.pop('category_name', None)
        category_id = validated_data.pop('category_id', None)
        # Also accept 'category' numeric id for robustness
        if not category_id:
            try:
                raw_cat = self.initial_data.get('category')
                category_id = int(raw_cat) if raw_cat is not None else None
            except Exception:
                category_id = None
        if not category_id and not category_name:
            raw_cat = self.initial_data.get('category')
            try:
                int(raw_cat)
            except Exception:
                if isinstance(raw_cat, str) and raw_cat.strip():
                    category_name = raw_cat.strip()
        # Pop files if present in validated data
        image = validated_data.pop('image', None)
        model_glb = validated_data.pop('model_glb', None)
        images_urls = []
        category_obj = None
        if category_id:
            try:
                cid = int(category_id)
                category_obj = Category.objects.get(pk=cid)
            except (ValueError, TypeError, Category.DoesNotExist):
                raise serializers.ValidationError({'category_id': 'Invalid category id'})
        elif category_name:
            category_obj, _ = Category.objects.get_or_create(name=category_name)
        else:
            raise serializers.ValidationError({'category_id': 'This field is required'})
        validated_data['category'] = category_obj

        # Create product first (without handling files) so we have an instance
        request = self.context.get('request')
        owner = getattr(request, 'user', None)
        if owner and owner.is_authenticated:
            validated_data['owner'] = owner
        product = Product.objects.create(**validated_data)

        # Save primary image if provided
        if image is not None:
            try:
                product.image.save(image.name, image, save=True)
                if getattr(product.image, 'url', ''):
                    url = product.image.url
                    if request:
                        url = request.build_absolute_uri(url)
                    product.image_url = url
                    product.save(update_fields=['image_url'])
            except Exception:
                pass

        # Save GLB file if provided using default storage
        if model_glb is not None:
            try:
                name = default_storage.save(f"uploads/{model_glb.name}", model_glb)
                url = default_storage.url(name)
                if request:
                    url = request.build_absolute_uri(url)
                product.model_glb_url = url
                product.save(update_fields=['model_glb_url'])
            except Exception:
                pass

        # Additional images
        if request and hasattr(request, 'FILES'):
            try:
                for imgf in request.FILES.getlist('images'):
                    try:
                        pi = ProductImage(product=product)
                        pi.image.save(imgf.name, imgf, save=True)
                        images_urls.append(request.build_absolute_uri(pi.image.url) if getattr(pi.image, 'url', '') else '')
                    except Exception:
                        pass
            except Exception:
                pass

        # Backfill image_url if missing but we have extra images
        if not product.image_url and images_urls:
            product.image_url = [u for u in images_urls if u][0]
            product.save(update_fields=['image_url'])
        return product

    def update(self, instance, validated_data):
        category_name = validated_data.pop('category_name', None)
        category_id = validated_data.pop('category_id', None)
        image = validated_data.pop('image', None)
        model_glb = validated_data.pop('model_glb', None)
        images_urls = validated_data.pop('images', None)
        if not category_id and not category_name:
            raw_cat = self.initial_data.get('category')
            try:
                int(raw_cat)
            except Exception:
                if isinstance(raw_cat, str) and raw_cat.strip():
                    category_name = raw_cat.strip()
        if category_id:
            try:
                cid = int(category_id)
                instance.category = Category.objects.get(pk=cid)
            except (ValueError, TypeError, Category.DoesNotExist):
                raise serializers.ValidationError({'category_id': 'Invalid category id'})
        elif category_name:
            category, _ = Category.objects.get_or_create(name=category_name)
            instance.category = category
        if 'sku' in validated_data:
            sku = validated_data.get('sku')
            if not sku or Product.objects.filter(sku=sku).exclude(pk=instance.pk).exists():
                import secrets
                validated_data['sku'] = f"SKU-{secrets.token_hex(4).upper()}"
        # File updates (cloud or media)
        if image is not None:
            try:
                instance.image.save(image.name, image, save=True)
                if getattr(instance.image, 'url', ''):
                    url = instance.image.url
                    request = self.context.get('request')
                    if request:
                        url = request.build_absolute_uri(url)
                    instance.image_url = url
            except Exception:
                pass
        if model_glb is not None:
            try:
                name = default_storage.save(f"uploads/{model_glb.name}", model_glb)
                url = default_storage.url(name)
                request = self.context.get('request')
                if request:
                    url = request.build_absolute_uri(url)
                instance.model_glb_url = url
            except Exception:
                pass

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        request = self.context.get('request')
        if request and hasattr(request, 'FILES'):
            try:
                fnlist = []
                try:
                    fnlist = request.FILES.getlist('images')
                except Exception:
                    pass
                extra = []
                for imgf in fnlist:
                    try:
                        if cloudinary and hasattr(cloudinary, 'config') and getattr(cloudinary, 'config') and os.environ.get('CLOUDINARY_CLOUD_NAME'):
                            up2 = cloudinary.uploader.upload(
                                imgf,
                                resource_type='auto',
                                folder=os.environ.get('CLOUDINARY_UPLOAD_FOLDER', 'stylesathi/uploads'),
                                use_filename=True,
                                unique_filename=True,
                            )
                            u = up2.get('secure_url') or up2.get('url') or ''
                            if u:
                                extra.append(u)
                        else:
                            uploads_dir = os.path.join(str(settings.MEDIA_ROOT), 'uploads')
                            os.makedirs(uploads_dir, exist_ok=True)
                            filename = f"product_{instance.pk}_{imgf.name}"
                            safe_path = os.path.join(uploads_dir, filename)
                            with open(safe_path, 'wb') as f:
                                for chunk in imgf.chunks():
                                    f.write(chunk)
                            extra.append(settings.absolute_media_url('uploads/' + filename))
                    except Exception:
                        pass
                if extra:
                    for imgf in request.FILES.getlist('images'):
                        try:
                            pi = ProductImage(product=instance)
                            pi.image.save(imgf.name, imgf, save=True)
                        except Exception:
                            pass
            except Exception:
                pass
        if images_urls is not None and isinstance(images_urls, list):
            # If image URLs are provided as strings, skip since we store images as files now
            pass
        instance.save()
        return instance

    def get_images(self, obj):
        request = self.context.get('request')
        urls = []
        try:
            for im in getattr(obj, 'images').all():
                u = getattr(im.image, 'url', '')
                if u:
                    urls.append(request.build_absolute_uri(u) if request else u)
        except Exception:
            pass
        return urls

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get('request')
        # Normalize image_url to absolute
        if getattr(instance, 'image', None) and getattr(instance.image, 'url', ''):
            url = instance.image.url
            data['image_url'] = request.build_absolute_uri(url) if request else url
        elif isinstance(data.get('image_url'), str):
            url = data['image_url']
            if request and url.startswith('/'):
                data['image_url'] = request.build_absolute_uri(url)
        # model_glb_url absolute
        if isinstance(data.get('model_glb_url'), str) and data['model_glb_url'] and request and data['model_glb_url'].startswith('/'):
            data['model_glb_url'] = request.build_absolute_uri(data['model_glb_url'])
        return data
