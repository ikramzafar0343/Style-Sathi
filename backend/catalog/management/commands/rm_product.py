from django.core.management.base import BaseCommand
from django.conf import settings
from catalog.models import Product
import os

class Command(BaseCommand):
    help = 'Delete a product by id and optionally remove related static files'

    def add_arguments(self, parser):
        parser.add_argument('product_id', type=int)
        parser.add_argument('--purge-files', action='store_true', help='Also delete static files referenced by image_url/model_glb_url')

    def handle(self, *args, **options):
        pid = options['product_id']
        purge = options['purge_files']
        p = Product.objects.filter(pk=pid).first()
        if not p:
            self.stdout.write(f'Product {pid} not found')
            return
        files = []
        for u in [getattr(p, 'image_url', ''), getattr(p, 'model_glb_url', '')]:
            if not u:
                continue
            i = u.find('/static/')
            if i >= 0:
                rel = u[i + len('/static/'):]
                full = os.path.join(settings.BASE_DIR, 'static', *str(rel).split('/'))
                files.append(full)
        p.delete()
        self.stdout.write(f'Deleted product {pid}')
        if purge:
            for f in files:
                try:
                    if os.path.exists(f):
                        os.remove(f)
                        self.stdout.write(f'Removed file: {f}')
                    else:
                        self.stdout.write(f'No file at: {f}')
                except Exception as e:
                    self.stdout.write(f'Failed to remove {f}: {e}')
