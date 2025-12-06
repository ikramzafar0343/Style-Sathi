import secrets

def ensure_indexes(mongo):
    try:
        mongo['carts'].create_index('user_email', unique=True)
        mongo['carts'].create_index('items.product_sku')
    except Exception:
        pass

def get_cart(mongo, email):
    ensure_indexes(mongo)
    doc = mongo['carts'].find_one({'user_email': email})
    if not doc:
        doc = {'user_email': email, 'items': []}
        mongo['carts'].insert_one(doc)
    return doc

def add_item(mongo, email, product_doc, quantity):
    ensure_indexes(mongo)
    item_id = 'CITEM-' + secrets.token_hex(6)
    mongo['carts'].update_one(
        {'user_email': email},
        {'$push': {'items': {
            'item_id': item_id,
            'product_sku': product_doc.get('sku'),
            'title': product_doc.get('title') or product_doc.get('name'),
            'image_url': product_doc.get('image_url') or '',
            'price': float(product_doc.get('price') or 0),
            'quantity': int(quantity or 1),
        }}},
        upsert=True
    )
    return item_id

def update_item(mongo, email, item_id, quantity):
    ensure_indexes(mongo)
    if int(quantity or 0) <= 0:
        mongo['carts'].update_one({'user_email': email}, {'$pull': {'items': {'item_id': item_id}}})
        return None
    mongo['carts'].update_one(
        {'user_email': email, 'items.item_id': item_id},
        {'$set': {'items.$.quantity': int(quantity)}}
    )
    return item_id

def remove_item(mongo, email, item_id):
    ensure_indexes(mongo)
    mongo['carts'].update_one({'user_email': email}, {'$pull': {'items': {'item_id': item_id}}})

def public_cart(doc):
    return {
        'id': str(doc.get('_id')) if doc.get('_id') else None,
        'items': [
            {
                'id': it.get('item_id'),
                'quantity': int(it.get('quantity') or 1),
                'product': {
                    'title': it.get('title'),
                    'image_url': it.get('image_url') or '',
                    'price': float(it.get('price') or 0),
                    'sku': it.get('product_sku'),
                    'category': {'id': None, 'name': ''},
                }
            } for it in (doc.get('items') or [])
        ]
    }
