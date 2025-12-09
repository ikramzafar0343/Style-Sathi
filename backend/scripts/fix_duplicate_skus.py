import secrets
from catalog.models import Product

seen = set()
updated = 0
for p in Product.objects.all().order_by('id'):
    s = p.sku or ''
    if (not s) or (s in seen):
        p.sku = 'SKU-' + secrets.token_hex(4).upper()
        p.save(update_fields=['sku'])
        updated += 1
    seen.add(p.sku)
print('SKUs deduplicated:', updated)
