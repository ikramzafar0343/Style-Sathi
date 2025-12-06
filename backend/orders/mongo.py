import secrets
from datetime import date, timedelta

def ensure_indexes(mongo):
    try:
        mongo['orders'].create_index('order_id', unique=True)
        mongo['orders'].create_index('user_email')
        mongo['orders'].create_index('status')
        mongo['orders'].create_index('created_at')
    except Exception:
        pass

def _product_for_item(mongo, item):
    sku = item.get('product_sku') or item.get('sku')
    if sku:
        return mongo['products'].find_one({'sku': sku})
    pid = item.get('product_id')
    if pid:
        # Fallback: try numeric id mapped to SKU if present
        doc = mongo['products'].find_one({'id': pid})
        if doc:
            return doc
    return None

def build_order_doc(mongo, user_email, items, shipping, payment_method):
    if not items:
        raise ValueError('No items')
    order_items = []
    total = 0.0
    for it in items:
        qty = int(it.get('quantity', 1))
        prod = _product_for_item(mongo, it)
        if not prod:
            raise ValueError(f"Product not found for item {it}")
        price = float(prod.get('price') or 0)
        total += price * qty
        order_items.append({
            'product_sku': prod.get('sku'),
            'title': prod.get('title') or prod.get('name'),
            'image_url': prod.get('image_url') or '',
            'category': prod.get('category'),
            'price': price,
            'quantity': qty,
            'owner_email': prod.get('owner_email'),
        })
    doc = {
        'order_id': 'ORD-' + secrets.token_hex(6).upper(),
        'user_email': user_email,
        'status': 'confirmed',
        'total': round(total, 2),
        'estimated_delivery': (date.today() + timedelta(days=5)).isoformat(),
        'created_at': date.today().isoformat(),
        'full_name': shipping.get('fullName', ''),
        'email': shipping.get('email', ''),
        'phone_number': shipping.get('phoneNumber', ''),
        'street_address': shipping.get('streetAddress', ''),
        'city': shipping.get('city', ''),
        'zip_code': shipping.get('zipCode', ''),
        'country': shipping.get('country', ''),
        'payment_method': payment_method or 'card',
        'items': order_items,
    }
    return doc

def public_order(doc):
    return {
        'id': doc.get('order_id'),
        'status': doc.get('status'),
        'total': float(doc.get('total') or 0),
        'estimated_delivery': doc.get('estimated_delivery'),
        'created_at': doc.get('created_at'),
        'full_name': doc.get('full_name'),
        'email': doc.get('email'),
        'phone_number': doc.get('phone_number'),
        'street_address': doc.get('street_address'),
        'city': doc.get('city'),
        'zip_code': doc.get('zip_code'),
        'country': doc.get('country'),
        'payment_method': doc.get('payment_method'),
        'items': [
            {
                'product': {
                    'title': it.get('title'),
                    'image_url': it.get('image_url'),
                    'category': {'id': None, 'name': it.get('category')},
                    'price': float(it.get('price') or 0),
                    'sku': it.get('product_sku'),
                },
                'quantity': int(it.get('quantity') or 1),
                'price': float(it.get('price') or 0),
            }
            for it in (doc.get('items') or [])
        ],
    }
