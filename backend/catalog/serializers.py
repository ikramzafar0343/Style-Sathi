from rest_framework import serializers
from django.conf import settings
import os
import json
from .models import Product, Category
from .models import ProductImage
try:
    import cloudinary  # type: ignore
    import cloudinary.uploader  # type: ignore
except Exception:
    cloudinary = None

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name']

class ProductSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    category_name = serializers.CharField(write_only=True, required=False)
    category_id = serializers.IntegerField(write_only=True, required=False)
    image = serializers.ImageField(write_only=True, required=False)
    model_glb = serializers.FileField(write_only=True, required=False)
    images = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = ['id', 'title', 'price', 'original_price', 'category', 'category_name', 'category_id', 'brand', 'description', 'image_url', 'images', 'image', 'model_glb', 'model_glb_url', 'sketchfab_embed_url', 'in_stock', 'rating', 'features', 'owner', 'sku', 'stock']
        read_only_fields = ['owner']

    def validate(self, attrs):
        features_raw = self.initial_data.get('features')
        if isinstance(features_raw, str):
            try:
                parsed = json.loads(features_raw)
                if isinstance(parsed, list):
                    attrs['features'] = parsed
                else:
                    attrs['features'] = [str(parsed)]
            except Exception:
                attrs['features'] = [s.strip() for s in features_raw.split(',') if s.strip()]
        elif isinstance(features_raw, list):
            attrs['features'] = features_raw
        images_raw = self.initial_data.get('images')
        if images_raw is not None and isinstance(images_raw, str):
            try:
                parsed = json.loads(images_raw)
                if isinstance(parsed, list):
                    attrs['images'] = parsed
            except Exception:
                attrs['images'] = [s.strip() for s in images_raw.split(',') if s.strip()]
        for k in ['brand', 'description', 'image_url', 'model_glb_url', 'sketchfab_embed_url']:
            if attrs.get(k) is None:
                attrs[k] = ''
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
        images_urls = validated_data.pop('images', []) or []
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
        # Save image file to cloud (if configured) or media uploads
        if image is not None:
            try:
                if cloudinary and hasattr(cloudinary, 'config') and getattr(cloudinary, 'config') and os.environ.get('CLOUDINARY_CLOUD_NAME'):
                    upload_res = cloudinary.uploader.upload(
                        image,
                        resource_type='auto',
                        folder=os.environ.get('CLOUDINARY_UPLOAD_FOLDER', 'stylesathi/uploads'),
                        use_filename=True,
                        unique_filename=True,
                    )
                    validated_data['image_url'] = upload_res.get('secure_url') or upload_res.get('url') or ''
                    if validated_data['image_url']:
                        images_urls = [validated_data['image_url']] + images_urls
                else:
                    uploads_dir = os.path.join(str(settings.MEDIA_ROOT), 'uploads')
                    os.makedirs(uploads_dir, exist_ok=True)
                    filename = f"product_{Category.objects.count()}_{image.name}"
                    safe_path = os.path.join(uploads_dir, filename)
                    with open(safe_path, 'wb') as f:
                        for chunk in image.chunks():
                            f.write(chunk)
                    validated_data['image_url'] = settings.absolute_media_url('uploads/' + filename)
                    images_urls = [validated_data['image_url']] + images_urls
            except Exception:
                validated_data['image_url'] = settings.absolute_media_url('uploads/placeholder.png')

        # Save GLB file if provided (cloud or media)
        if model_glb is not None:
            try:
                if cloudinary and hasattr(cloudinary, 'config') and getattr(cloudinary, 'config') and os.environ.get('CLOUDINARY_CLOUD_NAME'):
                    upload_res = cloudinary.uploader.upload(
                        model_glb,
                        resource_type='auto',
                        folder=os.environ.get('CLOUDINARY_UPLOAD_FOLDER', 'stylesathi/uploads'),
                        use_filename=True,
                        unique_filename=True,
                    )
                    validated_data['model_glb_url'] = upload_res.get('secure_url') or upload_res.get('url') or ''
                else:
                    uploads_dir = os.path.join(str(settings.MEDIA_ROOT), 'uploads')
                    os.makedirs(uploads_dir, exist_ok=True)
                    filename = f"product_{Category.objects.count()}_{model_glb.name}"
                    safe_path = os.path.join(uploads_dir, filename)
                    with open(safe_path, 'wb') as f:
                        for chunk in model_glb.chunks():
                            f.write(chunk)
                    validated_data['model_glb_url'] = settings.absolute_media_url('uploads/' + filename)
            except Exception:
                validated_data['model_glb_url'] = ''

        request = self.context.get('request')
        if request and hasattr(request, 'FILES'):
            try:
                fnlist = []
                try:
                    fnlist = request.FILES.getlist('images')
                except Exception:
                    pass
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
                                images_urls.append(u)
                        else:
                            uploads_dir = os.path.join(str(settings.MEDIA_ROOT), 'uploads')
                            os.makedirs(uploads_dir, exist_ok=True)
                            filename = f"product_{Category.objects.count()}_{imgf.name}"
                            safe_path = os.path.join(uploads_dir, filename)
                            with open(safe_path, 'wb') as f:
                                for chunk in imgf.chunks():
                                    f.write(chunk)
                            images_urls.append(settings.absolute_media_url('uploads/' + filename))
                    except Exception:
                        pass
            except Exception:
                pass

        if not validated_data.get('image_url') and images_urls:
            validated_data['image_url'] = images_urls[0]

        # Ensure SKU uniqueness
        sku = validated_data.get('sku')
        if not sku or Product.objects.filter(sku=sku).exists():
            import secrets
            validated_data['sku'] = f"SKU-{secrets.token_hex(4).upper()}"
        if request and request.user and request.user.is_authenticated:
            validated_data['owner'] = request.user
        product = Product.objects.create(**validated_data)
        if images_urls:
            for u in images_urls:
                try:
                    ProductImage.objects.create(product=product, url=u)
                except Exception:
                    pass
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
                if cloudinary and hasattr(cloudinary, 'config') and getattr(cloudinary, 'config') and os.environ.get('CLOUDINARY_CLOUD_NAME'):
                    upload_res = cloudinary.uploader.upload(
                        image,
                        resource_type='auto',
                        folder=os.environ.get('CLOUDINARY_UPLOAD_FOLDER', 'stylesathi/uploads'),
                        use_filename=True,
                        unique_filename=True,
                    )
                    instance.image_url = upload_res.get('secure_url') or upload_res.get('url') or instance.image_url
                    if instance.image_url:
                        try:
                            instance.images = [instance.image_url] + list(instance.images or [])
                        except Exception:
                            instance.images = [instance.image_url]
                else:
                    uploads_dir = os.path.join(str(settings.MEDIA_ROOT), 'uploads')
                    os.makedirs(uploads_dir, exist_ok=True)
                    filename = f"product_{instance.pk}_{image.name}"
                    safe_path = os.path.join(uploads_dir, filename)
                    with open(safe_path, 'wb') as f:
                        for chunk in image.chunks():
                            f.write(chunk)
                    instance.image_url = settings.absolute_media_url('uploads/' + filename)
                    try:
                        instance.images = [instance.image_url] + list(instance.images or [])
                    except Exception:
                        instance.images = [instance.image_url]
            except Exception:
                pass
        if model_glb is not None:
            try:
                if cloudinary and hasattr(cloudinary, 'config') and getattr(cloudinary, 'config') and os.environ.get('CLOUDINARY_CLOUD_NAME'):
                    upload_res = cloudinary.uploader.upload(
                        model_glb,
                        resource_type='auto',
                        folder=os.environ.get('CLOUDINARY_UPLOAD_FOLDER', 'stylesathi/uploads'),
                        use_filename=True,
                        unique_filename=True,
                    )
                    instance.model_glb_url = upload_res.get('secure_url') or upload_res.get('url') or instance.model_glb_url
                else:
                    uploads_dir = os.path.join(str(settings.MEDIA_ROOT), 'uploads')
                    os.makedirs(uploads_dir, exist_ok=True)
                    filename = f"product_{instance.pk}_{model_glb.name}"
                    safe_path = os.path.join(uploads_dir, filename)
                    with open(safe_path, 'wb') as f:
                        for chunk in model_glb.chunks():
                            f.write(chunk)
                    instance.model_glb_url = settings.absolute_media_url('uploads/' + filename)
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
                    for u in extra:
                        try:
                            ProductImage.objects.create(product=instance, url=u)
                        except Exception:
                            pass
            except Exception:
                pass
        if images_urls is not None and isinstance(images_urls, list):
            try:
                for u in images_urls:
                    ProductImage.objects.create(product=instance, url=u)
            except Exception:
                pass
        instance.save()
        return instance

    def get_images(self, obj):
        try:
            return [im.url for im in getattr(obj, 'images').all()]
        except Exception:
            return []
