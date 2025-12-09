import os
import secrets
from django.conf import settings
try:
    import cloudinary
    import cloudinary.uploader
except Exception:
    cloudinary = None

def _uploads_dir():
    return os.path.join(str(settings.MEDIA_ROOT), 'uploads')

def _save_file(f, name_prefix):
    if not f:
        return ''
    try:
        if cloudinary and hasattr(cloudinary, 'config') and getattr(cloudinary, 'config') and os.environ.get('CLOUDINARY_CLOUD_NAME'):
            try:
                upload_res = cloudinary.uploader.upload(
                    f,
                    resource_type='auto',
                    folder=os.environ.get('CLOUDINARY_UPLOAD_FOLDER', 'stylesathi/uploads'),
                    use_filename=True,
                    unique_filename=True,
                )
                return upload_res.get('secure_url') or upload_res.get('url') or ''
            except Exception:
                pass
    except Exception:
        pass
    os.makedirs(_uploads_dir(), exist_ok=True)
    filename = f"{name_prefix}_{f.name}"
    safe_path = os.path.join(_uploads_dir(), filename)
    with open(safe_path, 'wb') as dst:
        for chunk in f.chunks():
            dst.write(chunk)
    return settings.absolute_media_url('uploads/' + filename)

def product_doc_from_request(data, files, owner_email):
    sku = (data.get('sku') or '').strip()
    if not sku:
        sku = 'SKU-' + secrets.token_hex(4).upper()
    image_url = data.get('image_url') if data.get('image_url') not in (None, '') else None
    model_glb_url = data.get('model_glb_url') if data.get('model_glb_url') not in (None, '') else None
    img = files.get('image') if files else None
    glb = files.get('model_glb') if files else None
    if img:
        image_url = _save_file(img, f"product_{secrets.token_hex(2)}")
    if glb:
        model_glb_url = _save_file(glb, f"product_{secrets.token_hex(2)}")
    cat = data.get('category') or data.get('category_name')
    try:
        price = float(data.get('price') or 0)
    except Exception:
        price = 0.0
    try:
        original_price = float(data.get('original_price') or 0)
    except Exception:
        original_price = 0.0
    try:
        stock = int(data.get('stock') or 0)
    except Exception:
        stock = 0
    feats = data.get('features') or []
    if isinstance(feats, str):
        feats = [s.strip() for s in feats.split(',') if s.strip()]
    return {
        'title': (data.get('title') or data.get('name') or '').strip(),
        'price': price,
        'original_price': original_price,
        'category': cat,
        'brand': ((data.get('brand') or '').strip() or None),
        'description': ((data.get('description') or '').strip() or None),
        'image_url': image_url,
        'model_glb_url': model_glb_url,
        'sketchfab_embed_url': ((data.get('sketchfab_embed_url') or '').strip() or None),
        'in_stock': bool(data.get('in_stock', stock > 0)),
        'rating': float(data.get('rating') or 0),
        'features': list(feats) if isinstance(feats, list) else [],
        'owner_email': owner_email,
        'sku': sku,
        'stock': stock,
    }

def product_public(doc):
    cat_name = doc.get('category') if isinstance(doc.get('category'), str) else (doc.get('category', {}).get('name') if isinstance(doc.get('category'), dict) else '')
    img = doc.get('image_url') or ''
    if isinstance(img, str) and img.startswith('/'):
        base = os.environ.get('PUBLIC_BACKEND_URL') or ('http://127.0.0.1:8000' if getattr(settings, 'DEBUG', False) else 'https://stylesathi-backend.onrender.com')
        img = base.rstrip('/') + img
    glb = doc.get('model_glb_url') or ''
    if isinstance(glb, str) and glb.startswith('/'):
        base = os.environ.get('PUBLIC_BACKEND_URL') or ('http://127.0.0.1:8000' if getattr(settings, 'DEBUG', False) else 'https://stylesathi-backend.onrender.com')
        glb = base.rstrip('/') + glb
    return {
        'id': str(doc.get('_id')),
        'title': doc.get('title') or doc.get('name'),
        'price': float(doc.get('price') or 0),
        'original_price': float(doc.get('original_price') or 0),
        'category': {'id': None, 'name': cat_name},
        'brand': doc.get('brand') or '',
        'description': doc.get('description') or '',
        'image_url': img,
        'model_glb_url': glb,
        'sketchfab_embed_url': doc.get('sketchfab_embed_url') or '',
        'in_stock': bool(doc.get('in_stock', True)),
        'rating': float(doc.get('rating') or 0),
        'features': doc.get('features') or [],
        'owner': None,
        'sku': doc.get('sku') or '',
        'stock': int(doc.get('stock') or 0),
    }

def ensure_indexes(mongo):
    try:
        mongo['categories'].create_index('name', unique=True)
        mongo['products'].create_index('sku', unique=True)
        mongo['products'].create_index([('category', 1)])
        mongo['products'].create_index([('title', 'text'), ('brand', 'text'), ('description', 'text')])
    except Exception:
        pass
