from rest_framework import status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Cart, CartItem
from catalog.models import Product
from .serializers import CartSerializer, CartItemSerializer
from django.conf import settings
from catalog.mongo import product_public
from .mongo import ensure_indexes, get_cart, public_cart, add_item, update_item, remove_item

def get_or_create_cart(user):
    cart, _ = Cart.objects.get_or_create(user=user)
    return cart

class CartView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        mongo = getattr(settings, 'MONGO_DB', None)
        if mongo is not None:
            try:
                doc = get_cart(mongo, getattr(request.user, 'email', None))
                return Response(public_cart(doc))
            except Exception:
                pass
        cart = get_or_create_cart(request.user)
        return Response(CartSerializer(cart).data)

class CartItemsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        mongo = getattr(settings, 'MONGO_DB', None)
        if mongo is not None:
            try:
                product_id = request.data.get('product_id')
                quantity = int(request.data.get('quantity', 1))
                prod_doc = None
                try:
                    prod = Product.objects.get(id=product_id)
                    prod_doc = {
                        'sku': prod.sku,
                        'title': prod.title,
                        'image_url': prod.image_url,
                        'price': float(prod.price),
                    }
                except Product.DoesNotExist:
                    prod_doc = mongo['products'].find_one({'id': product_id})
                if not prod_doc:
                    return Response({'error': 'Product not found'}, status=status.HTTP_404_NOT_FOUND)
                item_id = add_item(mongo, getattr(request.user, 'email', None), prod_doc, quantity)
                doc = get_cart(mongo, getattr(request.user, 'email', None))
                return Response(public_cart(doc), status=status.HTTP_201_CREATED)
            except Exception:
                return Response({'error': 'Failed to add item'}, status=status.HTTP_400_BAD_REQUEST)
        cart = get_or_create_cart(request.user)
        product_id = request.data.get('product_id')
        quantity = int(request.data.get('quantity', 1))
        try:
            product = Product.objects.get(id=product_id)
        except Product.DoesNotExist:
            return Response({'error': 'Product not found'}, status=status.HTTP_404_NOT_FOUND)
        item, created = CartItem.objects.get_or_create(cart=cart, product=product, defaults={'quantity': quantity})
        if not created:
            item.quantity += quantity
            item.save()
        return Response(CartItemSerializer(item).data, status=status.HTTP_201_CREATED)

class CartItemDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, pk):
        mongo = getattr(settings, 'MONGO_DB', None)
        if mongo is not None:
            try:
                quantity = int(request.data.get('quantity', 1))
                item_id = update_item(mongo, getattr(request.user, 'email', None), str(pk), quantity)
                if item_id is None:
                    return Response(status=status.HTTP_204_NO_CONTENT)
                doc = get_cart(mongo, getattr(request.user, 'email', None))
                return Response(public_cart(doc))
            except Exception:
                return Response({'error': 'Failed to update item'}, status=status.HTTP_400_BAD_REQUEST)
        cart = get_or_create_cart(request.user)
        try:
            item = CartItem.objects.get(id=pk, cart=cart)
        except CartItem.DoesNotExist:
            return Response({'error': 'Item not found'}, status=status.HTTP_404_NOT_FOUND)
        quantity = int(request.data.get('quantity', item.quantity))
        item.quantity = max(0, quantity)
        if item.quantity == 0:
            item.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        item.save()
        return Response(CartItemSerializer(item).data)

    def delete(self, request, pk):
        mongo = getattr(settings, 'MONGO_DB', None)
        if mongo is not None:
            try:
                remove_item(mongo, getattr(request.user, 'email', None), str(pk))
                return Response(status=status.HTTP_204_NO_CONTENT)
            except Exception:
                return Response({'error': 'Failed to remove item'}, status=status.HTTP_400_BAD_REQUEST)
        cart = get_or_create_cart(request.user)
        try:
            item = CartItem.objects.get(id=pk, cart=cart)
        except CartItem.DoesNotExist:
            return Response(status=status.HTTP_204_NO_CONTENT)
        item.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
