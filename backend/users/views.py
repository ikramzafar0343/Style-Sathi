from rest_framework import status, permissions
from django.db import models
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from .serializers import SignupSerializer, LoginSerializer, UserSerializer
from .models import User
from django.utils import timezone
from django.conf import settings
import secrets
from catalog.models import Product, Category
from orders.models import Order, OrderItem

RESET_TOKENS = {}
MODERATION_STATUSES = {}

def build_tokens(user):
    refresh = RefreshToken.for_user(user)
    return {
        'access': str(refresh.access_token),
        'refresh': str(refresh),
    }

class SignupView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = SignupSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            tokens = build_tokens(user)
            return Response({
                'user': UserSerializer(user).data,
                'tokens': tokens
            }, status=status.HTTP_201_CREATED)
        return Response({'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

class SellerSignupView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        data = request.data.copy()
        data['role'] = 'seller'
        serializer = SignupSerializer(data=data)
        if serializer.is_valid():
            user = serializer.save()
            tokens = build_tokens(user)
            return Response({
                'user': UserSerializer(user).data,
                'tokens': tokens
            }, status=status.HTTP_201_CREATED)
        return Response({'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        try:
            serializer = LoginSerializer(data=request.data)
            if serializer.is_valid():
                user = serializer.validated_data['user']
                tokens = build_tokens(user)
                return Response({
                    'user': UserSerializer(user).data,
                    'tokens': tokens
                }, status=status.HTTP_200_OK)
            return Response({'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)
        except Exception:
            return Response({'detail': 'Login failed. Please try again later.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class ProfileView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response({'user': UserSerializer(request.user).data})

    def patch(self, request):
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response({'user': serializer.data})
        return Response({'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request):
        user = request.user
        user.delete()
        return Response({'message': 'Account deleted'}, status=status.HTTP_200_OK)

class ForgotPasswordView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email')
        if not email:
            return Response({'detail': 'Email is required'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            # Avoid disclosing existence; still return success
            return Response({'message': 'If the email exists, a reset token has been sent.'})
        token = secrets.token_hex(3)  # short token for demo
        RESET_TOKENS[email] = {
            'token': token,
            'expires_at': timezone.now() + timezone.timedelta(minutes=15)
        }
        # In real app: send email with token
        return Response({'message': 'Reset token generated. Check your email.', 'token': token})

class ResetPasswordView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email')
        token = request.data.get('token')
        new_password = request.data.get('new_password')
        if not all([email, token, new_password]):
            return Response({'detail': 'Email, token and new_password are required'}, status=status.HTTP_400_BAD_REQUEST)
        data = RESET_TOKENS.get(email)
        if not data or data['token'] != token or timezone.now() > data['expires_at']:
            return Response({'detail': 'Invalid or expired token'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({'detail': 'Invalid email'}, status=status.HTTP_400_BAD_REQUEST)
        user.set_password(new_password)
        user.save()
        RESET_TOKENS.pop(email, None)
        return Response({'message': 'Password updated successfully'})
PHONE_CODES = {}

class PhoneVerificationRequestView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        phone = request.data.get('phone') or request.user.phone
        if not phone:
            return Response({'detail': 'Phone is required'}, status=status.HTTP_400_BAD_REQUEST)
        code = secrets.token_hex(2)  # demo code
        PHONE_CODES[request.user.id] = {
            'code': code,
            'expires_at': timezone.now() + timezone.timedelta(minutes=10)
        }
        # In real app: send SMS
        return Response({'message': 'Verification code sent', 'code': code})

class PhoneVerificationVerifyView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        code = request.data.get('code')
        data = PHONE_CODES.get(request.user.id)
        if not data or data['code'] != code or timezone.now() > data['expires_at']:
            return Response({'detail': 'Invalid or expired code'}, status=status.HTTP_400_BAD_REQUEST)
        # mark verified by saving phone unchanged (or adding a verified flag if model extended)
        PHONE_CODES.pop(request.user.id, None)
        return Response({'message': 'Phone verified'})

class AdminUsersListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if getattr(request.user, 'role', 'customer') != 'admin':
            return Response({'detail': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
        users = User.objects.filter(is_active=True).order_by('-date_joined')
        data = []
        for u in users:
            data.append({
                'id': f"USER-{u.id:04d}",
                'fullName': u.get_full_name() or u.username or u.email,
                'email': u.email,
                'username': u.username,
                'phone': u.phone or '',
                'role': u.role,
                'registrationDate': u.date_joined.date().isoformat() if u.date_joined else '',
                'status': 'approved'
            })
        return Response({'users': data})

    def delete(self, request):
        if getattr(request.user, 'role', 'customer') != 'admin':
            return Response({'detail': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
        data = getattr(request, 'data', {}) or {}
        reason = data.get('reason')
        if not reason:
            return Response({'detail': 'Reason is required for deletion'}, status=status.HTTP_400_BAD_REQUEST)

        id_str = data.get('id') or data.get('userId') or request.query_params.get('id')
        target_email = data.get('email') or request.query_params.get('email')
        target = None
        if id_str:
            try:
                raw_id = int(str(id_str).replace('USER-', '').strip())
                target = User.objects.filter(id=raw_id).first()
            except Exception:
                target = None
        if not target and target_email:
            target = User.objects.filter(email=target_email).first()
        if not target:
            return Response({'detail': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

        if target.id == request.user.id:
            return Response({'detail': 'Cannot delete your own account'}, status=status.HTTP_400_BAD_REQUEST)
        if getattr(target, 'is_superuser', False):
            return Response({'detail': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
        if getattr(target, 'role', 'customer') == 'admin' and not getattr(request.user, 'is_superuser', False):
            return Response({'detail': 'Only superuser can delete admin users'}, status=status.HTTP_403_FORBIDDEN)

        # Soft delete: deactivate account, preserve relational integrity
        try:
            target.is_active = False
            target.save(update_fields=['is_active'])
        except Exception:
            return Response({'detail': 'Failed to delete user'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # Audit log (Mongo optional)
        mongo = getattr(settings, 'MONGO_DB', None)
        if mongo:
            try:
                mongo['audit'].insert_one({
                    'type': 'user_delete',
                    'user_id': target.pk,
                    'email': target.email,
                    'reason': reason,
                    'by': getattr(request.user, 'email', None),
                    'time': timezone.now().isoformat()
                })
            except Exception:
                pass

        return Response({'detail': 'User deleted', 'id': f"USER-{target.id:04d}", 'reason': reason})

class AdminReportsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if getattr(request.user, 'role', 'customer') != 'admin':
            return Response({'detail': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
        reports = [
            {
                'id': 'REP-2024-001',
                'type': 'Inappropriate Behavior',
                'user': 'customer2@stylesathi.com',
                'submittedBy': 'moderator@stylesathi.com',
                'time': '2 hours ago',
                'severity': 'High',
                'status': 'Under Review',
                'description': 'User engaged in inappropriate communication with other users.'
            },
            {
                'id': 'REP-2024-002',
                'type': 'Fake Product',
                'user': 'seller3@stylesathi.com',
                'submittedBy': 'customer5@stylesathi.com',
                'time': '5 hours ago',
                'severity': 'Medium',
                'status': 'Pending',
                'description': 'Product appears counterfeit based on images and description.'
            }
        ]
        mongo = getattr(settings, 'MONGO_DB', None)
        statuses = {}
        if mongo:
            try:
                for doc in mongo['moderation_reports'].find({}):
                    rid = doc.get('report_id')
                    st = doc.get('status')
                    if rid and st:
                        statuses[str(rid)] = st
            except Exception:
                statuses = {}
        else:
            statuses = MODERATION_STATUSES.copy()
        filtered = [r for r in reports if statuses.get(r['id']) not in ['Resolved', 'Rejected']]
        return Response({'reports': filtered})

    def patch(self, request):
        if getattr(request.user, 'role', 'customer') != 'admin':
            return Response({'detail': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
        data = getattr(request, 'data', {}) or {}
        rid = data.get('id')
        action = (data.get('action') or data.get('status') or '').lower()
        reason = data.get('reason') or ''
        if not rid or action not in ['resolve', 'resolved', 'reject', 'rejected']:
            return Response({'detail': 'Invalid report update'}, status=status.HTTP_400_BAD_REQUEST)
        new_status = 'Resolved' if action.startswith('resol') else 'Rejected'
        mongo = getattr(settings, 'MONGO_DB', None)
        if mongo:
            try:
                mongo['moderation_reports'].update_one(
                    {'report_id': rid},
                    {'$set': {
                        'status': new_status,
                        'reason': reason,
                        'by': getattr(request.user, 'email', None),
                        'time': timezone.now().isoformat()
                    }},
                    upsert=True
                )
            except Exception:
                pass
        else:
            MODERATION_STATUSES[str(rid)] = new_status
        return Response({'id': rid, 'status': new_status})

class AdminDashboardView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if getattr(request.user, 'role', 'customer') != 'admin':
            return Response({'detail': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
        try:
            total_users = User.objects.filter(is_active=True).count()
            total_products = Product.objects.count()
            total_orders = Order.objects.count()
            key_metrics = [
                { 'label': 'Total Users', 'value': str(total_users), 'icon': 'users', 'color': 'bg-primary' },
                { 'label': 'Pending Actions', 'value': '0', 'icon': 'check', 'color': 'bg-warning' },
                { 'label': 'Active Reports', 'value': '0', 'icon': 'flag', 'color': 'bg-danger' },
                { 'label': 'System Health', 'value': '99%', 'icon': 'chart', 'color': 'bg-success' },
            ]
            system_health = [
                { 'label': 'Server Status', 'value': 'Operational', 'icon': 'server', 'color': 'text-success' },
                { 'label': 'API Performance', 'value': '99%', 'icon': 'trend', 'color': 'text-success' },
                { 'label': 'Error Rate', 'value': '0.1%', 'icon': 'error', 'color': 'text-success' },
                { 'label': 'Active Sessions', 'value': str(total_users), 'icon': 'usercheck', 'color': 'text-success' },
            ]

            def fmt_time(dt):
                if not dt:
                    return ''
                try:
                    return timezone.localtime(dt).strftime('%I:%M %p')
                except Exception:
                    try:
                        return dt.strftime('%I:%M %p')
                    except Exception:
                        return ''

            recent_activities = []
            for o in Order.objects.order_by('-created_at')[:3]:
                recent_activities.append({
                    'id': f'ORD-{o.id:04d}',
                    'time': fmt_time(getattr(o, 'created_at', None)),
                    'action': 'Order Created',
                    'user': getattr(getattr(o, 'user', None), 'email', ''),
                    'status': (getattr(o, 'status', '') or '').title(),
                    'statusColor': 'badge bg-info',
                    'type': 'order_created',
                    'details': {
                        'fullName': (getattr(o.user, 'get_full_name', lambda: '')() or getattr(o.user, 'username', '')) if getattr(o, 'user', None) else '',
                        'email': getattr(getattr(o, 'user', None), 'email', ''),
                        'phone': getattr(getattr(o, 'user', None), 'phone', '') or '',
                        'username': getattr(getattr(o, 'user', None), 'username', ''),
                        'role': getattr(getattr(o, 'user', None), 'role', ''),
                        'registrationDate': (getattr(o.user, 'date_joined', None).date().isoformat() if getattr(getattr(o, 'user', None), 'date_joined', None) else ''),
                        'productDetails': {}
                    }
                })
            for u in User.objects.filter(is_active=True).order_by('-date_joined')[:2]:
                recent_activities.append({
                    'id': f'USR-{u.id:04d}',
                    'time': fmt_time(getattr(u, 'date_joined', None)),
                    'action': 'User Registered',
                    'user': u.email,
                    'status': 'New',
                    'statusColor': 'badge bg-warning',
                    'type': 'user_registered',
                    'details': {
                        'fullName': (u.get_full_name() or u.username),
                        'email': u.email,
                        'phone': u.phone or '',
                        'username': u.username,
                        'role': u.role,
                        'registrationDate': (u.date_joined.date().isoformat() if getattr(u, 'date_joined', None) else '')
                    }
                })

            notifications = []
            ords = list(Order.objects.order_by('-created_at')[:3])
            if ords:
                notifications.append({
                    'id': 'admin-notif-orders',
                    'type': 'orders',
                    'title': 'New Orders',
                    'message': f'{len(ords)} new orders created',
                    'time': 'just now',
                    'read': False
                })
            usrs = list(User.objects.filter(is_active=True).order_by('-date_joined')[:2])
            if usrs:
                notifications.append({
                    'id': 'admin-notif-users',
                    'type': 'users',
                    'title': 'New Users',
                    'message': f'{len(usrs)} users registered',
                    'time': 'just now',
                    'read': False
                })

            return Response({
                'keyMetrics': key_metrics,
                'systemHealth': system_health,
                'recentActivities': recent_activities,
                'notifications': notifications
            })
        except Exception:
            return Response({
                'keyMetrics': [],
                'systemHealth': [],
                'recentActivities': [],
                'notifications': []
            })

class AdminAnalyticsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if getattr(request.user, 'role', 'customer') != 'admin':
            return Response({'detail': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
        total_revenue = Order.objects.aggregate(models.Sum('total')).get('total__sum') or 0
        total_users = User.objects.filter(is_active=True).count()
        total_sellers = User.objects.filter(role='seller', is_active=True).count()
        total_customers = User.objects.filter(role='customer', is_active=True).count()
        total_orders = Order.objects.count()
        active_products = Product.objects.filter(in_stock=True).count()
        overview = {
            'totalRevenue': int(total_revenue),
            'totalUsers': total_users,
            'totalSellers': total_sellers,
            'totalCustomers': total_customers,
            'totalOrders': total_orders,
            'activeProducts': active_products,
            'pendingVerifications': 0,
            'averageOrderValue': int(total_orders and total_revenue / max(total_orders, 1) or 0),
            'monthlyGrowth': {
                'revenue': 0,
                'users': 0,
                'orders': 0
            }
        }
        now = timezone.now().date()
        daily = []
        for i in range(30):
            day = now - timezone.timedelta(days=29 - i)
            day_orders = Order.objects.filter(created_at__date=day)
            revenue_sum = day_orders.aggregate(models.Sum('total')).get('total__sum') or 0
            daily.append({ 'date': day.isoformat(), 'revenue': int(revenue_sum), 'orders': day_orders.count() })
        revenue = {
            'daily': daily,
            'monthly': []
        }
        user_daily = []
        for i in range(14):
            day = now - timezone.timedelta(days=13 - i)
            nu = User.objects.filter(date_joined__date=day, is_active=True).count()
            ns = User.objects.filter(role='seller', date_joined__date=day, is_active=True).count()
            nc = User.objects.filter(role='customer', date_joined__date=day, is_active=True).count()
            user_daily.append({ 'date': day.isoformat(), 'newUsers': nu, 'newSellers': ns, 'newCustomers': nc })
        user_growth = {
            'daily': user_daily,
            'monthly': []
        }
        categories = []
        for c in Category.objects.all()[:5]:
            categories.append({ 'category': c.name, 'revenue': 0, 'orders': 0, 'growth': 0 })
        analytics = {
            'overview': overview,
            'revenue': revenue,
            'userGrowth': user_growth,
            'categoryPerformance': categories,
            'topSellers': [],
            'userEngagement': {
                'dailyActiveUsers': 0,
                'weeklyActiveUsers': 0,
                'conversionRate': 0,
                'retentionRate': 0
            },
            'orderStatus': {
                'completed': Order.objects.filter(status='delivered').count(),
                'pending': Order.objects.filter(status='confirmed').count(),
                'processing': Order.objects.filter(status='processing').count(),
                'cancelled': Order.objects.filter(status='cancelled').count()
            },
            'reports': []
        }
        return Response({'analytics': analytics})
