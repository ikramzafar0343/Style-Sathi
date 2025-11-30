from rest_framework import status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Cart, CartItem
from catalog.models import Product
from .serializers import CartSerializer, CartItemSerializer

def get_or_create_cart(user):
    cart, _ = Cart.objects.get_or_create(user=user)
    return cart

class CartView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        cart = get_or_create_cart(request.user)
        return Response(CartSerializer(cart).data)

class CartItemsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
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
        cart = get_or_create_cart(request.user)
        try:
            item = CartItem.objects.get(id=pk, cart=cart)
        except CartItem.DoesNotExist:
            return Response(status=status.HTTP_204_NO_CONTENT)
        item.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

