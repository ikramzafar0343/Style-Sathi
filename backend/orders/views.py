from datetime import date, timedelta
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Order, OrderItem
from cart.models import Cart, CartItem
from catalog.models import Product
from .serializers import OrderSerializer
from django.conf import settings
from .mongo import ensure_indexes, build_order_doc, public_order

class OrderCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        items = request.data.get('items', [])
        shipping = request.data.get('shipping', {})
        payment_method = request.data.get('payment_method', 'card')
        if not items:
            return Response({'error': 'No items'}, status=status.HTTP_400_BAD_REQUEST)
        mongo = getattr(settings, 'MONGO_DB', None)
        if mongo:
            try:
                ensure_indexes(mongo)
                doc = build_order_doc(mongo, getattr(request.user, 'email', None), items, shipping, payment_method)
                mongo['orders'].insert_one(doc)
                # clear cart (optional, still using ORM cart for now)
                try:
                    cart, _ = Cart.objects.get_or_create(user=request.user)
                    CartItem.objects.filter(cart=cart).delete()
                except Exception:
                    pass
                return Response(public_order(doc), status=status.HTTP_201_CREATED)
            except ValueError as e:
                return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
            except Exception:
                return Response({'error': 'Failed to create order'}, status=status.HTTP_400_BAD_REQUEST)
        order = Order.objects.create(
            user=request.user,
            status='confirmed',
            estimated_delivery=date.today() + timedelta(days=5),
            full_name=shipping.get('fullName', ''),
            email=shipping.get('email', ''),
            phone_number=shipping.get('phoneNumber', ''),
            street_address=shipping.get('streetAddress', ''),
            city=shipping.get('city', ''),
            zip_code=shipping.get('zipCode', ''),
            country=shipping.get('country', ''),
            payment_method=payment_method,
        )
        total = 0
        for it in items:
            try:
                product = Product.objects.get(id=it['product_id'])
            except Product.DoesNotExist:
                return Response({'error': f"Product {it['product_id']} not found"}, status=status.HTTP_404_NOT_FOUND)
            qty = int(it.get('quantity', 1))
            price = product.price
            OrderItem.objects.create(order=order, product=product, quantity=qty, price=price)
            total += price * qty
        order.total = total
        order.save()
        cart, _ = Cart.objects.get_or_create(user=request.user)
        CartItem.objects.filter(cart=cart).delete()
        return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)

class OrderDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        mongo = getattr(settings, 'MONGO_DB', None)
        if mongo:
            try:
                doc = mongo['orders'].find_one({'order_id': str(pk), 'user_email': getattr(request.user, 'email', None)})
                if not doc:
                    return Response({'error': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)
                return Response(public_order(doc))
            except Exception:
                pass
        try:
            order = Order.objects.get(id=pk, user=request.user)
        except Order.DoesNotExist:
            return Response({'error': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)
        return Response(OrderSerializer(order).data)

class SellerOrderListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        role = getattr(request.user, 'role', 'customer')
        if role not in ['seller', 'admin']:
            return Response({'detail': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
        mongo = getattr(settings, 'MONGO_DB', None)
        if mongo:
            try:
                email = getattr(request.user, 'email', None)
                cursor = mongo['orders'].find({'items.owner_email': email}).sort('created_at', -1)
                docs = list(cursor.limit(500))
                return Response([public_order(d) for d in docs])
            except Exception:
                pass
        order_ids = (
            OrderItem.objects.filter(product__owner=request.user)
            .values_list('order_id', flat=True)
            .distinct()
        )
        orders = (
            Order.objects.filter(id__in=order_ids)
            .order_by('-created_at')
            .prefetch_related('items__product__category', 'items__product')
        )
        data = OrderSerializer(orders, many=True).data
        return Response(data)

class SellerOrderDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        role = getattr(request.user, 'role', 'customer')
        if role not in ['seller', 'admin']:
            return Response({'detail': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
        mongo = getattr(settings, 'MONGO_DB', None)
        if mongo:
            try:
                email = getattr(request.user, 'email', None)
                doc = mongo['orders'].find_one({'order_id': str(pk), 'items.owner_email': email})
                if not doc and role == 'admin':
                    doc = mongo['orders'].find_one({'order_id': str(pk)})
                if not doc:
                    return Response({'error': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)
                return Response(public_order(doc))
            except Exception:
                pass
        try:
            order = (
                Order.objects.filter(id=pk)
                .prefetch_related('items__product__category', 'items__product')
            ).first()
        except Order.DoesNotExist:
            return Response({'error': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)
        if role != 'admin':
            owns_item = OrderItem.objects.filter(order=order, product__owner=request.user).exists()
            if not owns_item:
                return Response({'detail': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
        return Response(OrderSerializer(order).data)

class OrderStatusUpdateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, pk):
        role = getattr(request.user, 'role', 'customer')
        if role not in ['seller', 'admin']:
            return Response({'detail': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
        mongo = getattr(settings, 'MONGO_DB', None)
        if mongo:
            try:
                email = getattr(request.user, 'email', None)
                doc = mongo['orders'].find_one({'order_id': str(pk)})
                if not doc:
                    return Response({'error': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)
                if role != 'admin':
                    owns_item = any(it.get('owner_email') == email for it in (doc.get('items') or []))
                    if not owns_item:
                        return Response({'detail': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
                new_status = (request.data or {}).get('status')
                allowed = {'confirmed', 'processing', 'in_transit', 'delivered', 'cancelled'}
                if new_status not in allowed:
                    return Response({'error': 'Invalid status'}, status=status.HTTP_400_BAD_REQUEST)
                mongo['orders'].update_one({'order_id': str(pk)}, {'$set': {'status': new_status}})
                doc['status'] = new_status
                return Response(public_order(doc))
            except Exception:
                return Response({'error': 'Failed to update status'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            order = Order.objects.get(id=pk)
        except Order.DoesNotExist:
            return Response({'error': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)
        if role != 'admin':
            owns_item = OrderItem.objects.filter(order=order, product__owner=request.user).exists()
            if not owns_item:
                return Response({'detail': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
        new_status = (request.data or {}).get('status')
        allowed = {'confirmed', 'processing', 'in_transit', 'delivered', 'cancelled'}
        if new_status not in allowed:
            return Response({'error': 'Invalid status'}, status=status.HTTP_400_BAD_REQUEST)
        order.status = new_status
        order.save()
        return Response(OrderSerializer(order).data)

class AdminOrderListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        role = getattr(request.user, 'role', 'customer')
        if role != 'admin':
            return Response({'detail': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
        mongo = getattr(settings, 'MONGO_DB', None)
        if mongo:
            try:
                docs = list(mongo['orders'].find({}).sort('created_at', -1).limit(500))
                return Response([public_order(d) for d in docs])
            except Exception:
                pass
        orders = (
            Order.objects.all()
            .order_by('-created_at')
            .prefetch_related('items__product__category', 'items__product')
        )[:500]
        return Response(OrderSerializer(orders, many=True).data)
