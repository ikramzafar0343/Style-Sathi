from rest_framework import serializers
from .models import Order, OrderItem
from catalog.serializers import ProductSerializer

class OrderItemSerializer(serializers.ModelSerializer):
    product = ProductSerializer()

    class Meta:
        model = OrderItem
        fields = ['id', 'product', 'quantity', 'price']

class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True)

    class Meta:
        model = Order
        fields = [
            'id', 'status', 'total', 'estimated_delivery', 'created_at',
            'full_name', 'email', 'phone_number', 'street_address', 'city', 'zip_code', 'country',
            'payment_method', 'items'
        ]

