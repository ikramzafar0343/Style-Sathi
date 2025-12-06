from rest_framework import status, permissions
from django.db import models
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from .serializers import SignupSerializer, LoginSerializer, UserSerializer
from .models import User, ModerationReport
from django.utils import timezone
from django.conf import settings
import secrets
from catalog.models import Product, Category
from orders.models import Order, OrderItem
from .mongo import sync_user, soft_delete_user, create_user_doc, get_user_doc, check_user_password
from .jwt import create_tokens

RESET_TOKENS = {}
MODERATION_STATUSES = {}

def build_tokens(user):
    mongo = getattr(settings, 'MONGO_DB', None)
    if mongo:
        role = getattr(user, 'role', None) or 'customer'
        email = getattr(user, 'email', None)
        return create_tokens(email, role)
    refresh = RefreshToken.for_user(user)
    return {'access': str(refresh.access_token), 'refresh': str(refresh)}

class SignupView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        mongo = getattr(settings, 'MONGO_DB', None)
        if mongo:
            data = request.data or {}
            email = data.get('email')
            password = data.get('password')
            role = data.get('role', 'customer')
            if not email or not password:
                return Response({'detail': 'Email and password required'}, status=status.HTTP_400_BAD_REQUEST)
            try:
                create_user_doc(mongo, email, password, role, {
                    'phone': data.get('phone'),
                    'business_name': data.get('business_name'),
                    'business_type': data.get('business_type'),
                    'first_name': (data.get('fullName') or '').split(' ', 1)[0] if data.get('fullName') else '',
                    'last_name': (data.get('fullName') or '').split(' ', 1)[1] if data.get('fullName') and ' ' in data.get('fullName') else '',
                })
                doc = get_user_doc(mongo, email)
                tokens = create_tokens(email, role)
                return Response({'user': {
                    'email': doc.get('email'),
                    'username': doc.get('username') or doc.get('email'),
                    'first_name': doc.get('first_name') or '',
                    'last_name': doc.get('last_name') or '',
                    'role': doc.get('role')
                }, 'tokens': tokens}, status=status.HTTP_201_CREATED)
            except Exception:
                return Response({'detail': 'Signup failed'}, status=status.HTTP_400_BAD_REQUEST)
        serializer = SignupSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            try:
                sync_user(getattr(settings, 'MONGO_DB', None), user)
            except Exception:
                pass
            tokens = build_tokens(user)
            return Response({'user': UserSerializer(user).data, 'tokens': tokens}, status=status.HTTP_201_CREATED)
        return Response({'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

class SellerSignupView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        mongo = getattr(settings, 'MONGO_DB', None)
        if mongo:
            data = request.data or {}
            data = {**data, 'role': 'seller'}
            email = data.get('email')
            password = data.get('password')
            if not email or not password:
                return Response({'detail': 'Email and password required'}, status=status.HTTP_400_BAD_REQUEST)
            try:
                create_user_doc(mongo, email, password, 'seller', {
                    'phone': data.get('phone'),
                    'business_name': data.get('business_name'),
                    'business_type': data.get('business_type'),
                })
                doc = get_user_doc(mongo, email)
                tokens = create_tokens(email, 'seller')
                return Response({'user': {
                    'email': doc.get('email'),
                    'username': doc.get('username') or doc.get('email'),
                    'role': 'seller'
                }, 'tokens': tokens}, status=status.HTTP_201_CREATED)
            except Exception:
                return Response({'detail': 'Signup failed'}, status=status.HTTP_400_BAD_REQUEST)
        data = request.data.copy()
        data['role'] = 'seller'
        serializer = SignupSerializer(data=data)
        if serializer.is_valid():
            user = serializer.save()
            try:
                sync_user(getattr(settings, 'MONGO_DB', None), user)
            except Exception:
                pass
            tokens = build_tokens(user)
            return Response({'user': UserSerializer(user).data, 'tokens': tokens}, status=status.HTTP_201_CREATED)
        return Response({'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

class LoginView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_scope = 'login'

    def post(self, request):
        mongo = getattr(settings, 'MONGO_DB', None)
        if mongo:
            email = request.data.get('email')
            password = request.data.get('password')
            expected_role = request.data.get('expected_role')
            if not email or not password:
                return Response({'detail': 'Email and password required'}, status=status.HTTP_400_BAD_REQUEST)
            doc = get_user_doc(mongo, email)
            if not doc or not check_user_password(doc, password):
                return Response({'errors': {'detail': ['Invalid credentials']}}, status=status.HTTP_400_BAD_REQUEST)
            role = doc.get('role')
            if expected_role and role != expected_role:
                return Response({'errors': {'detail': ['Role mismatch']}}, status=status.HTTP_400_BAD_REQUEST)
            tokens = create_tokens(email, role)
            return Response({'user': {
                'email': doc.get('email'),
                'username': doc.get('username') or doc.get('email'),
                'role': role
            }, 'tokens': tokens})
        try:
            serializer = LoginSerializer(data=request.data)
            if serializer.is_valid():
                user = serializer.validated_data['user']
                tokens = build_tokens(user)
                return Response({'user': UserSerializer(user).data, 'tokens': tokens}, status=status.HTTP_200_OK)
            return Response({'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)
        except Exception:
            return Response({'detail': 'Login failed. Please try again later.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class ProfileView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        mongo = getattr(settings, 'MONGO_DB', None)
        if mongo:
            doc = get_user_doc(mongo, getattr(request.user, 'email', None))
            if not doc:
                return Response({'detail': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
            return Response({'user': {
                'email': doc.get('email'),
                'username': doc.get('username') or doc.get('email'),
                'first_name': doc.get('first_name') or '',
                'last_name': doc.get('last_name') or '',
                'role': doc.get('role')
            }})
        return Response({'user': UserSerializer(request.user).data})

    def patch(self, request):
        mongo = getattr(settings, 'MONGO_DB', None)
        if mongo:
            email = getattr(request.user, 'email', None)
            doc = get_user_doc(mongo, email)
            if not doc:
                return Response({'detail': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
            update = {}
            for k in ['first_name', 'last_name', 'phone', 'business_name', 'business_type']:
                v = request.data.get(k)
                if v is not None:
                    update[k] = v
            if update:
                mongo['users'].update_one({'email': email}, {'$set': update})
            doc.update(update)
            return Response({'user': {
                'email': doc.get('email'),
                'username': doc.get('username') or doc.get('email'),
                'first_name': doc.get('first_name') or '',
                'last_name': doc.get('last_name') or '',
                'role': doc.get('role')
            }})
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            try:
                sync_user(getattr(settings, 'MONGO_DB', None), request.user)
            except Exception:
                pass
            return Response({'user': serializer.data})
        return Response({'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request):
        mongo = getattr(settings, 'MONGO_DB', None)
        if mongo:
            email = getattr(request.user, 'email', None)
            soft_delete_user(mongo, email)
            return Response({'message': 'Account deleted'}, status=status.HTTP_200_OK)
        user = request.user
        user.delete()
        try:
            soft_delete_user(getattr(settings, 'MONGO_DB', None), getattr(user, 'email', None))
        except Exception:
            pass
        return Response({'message': 'Account deleted'}, status=status.HTTP_200_OK)

class ForgotPasswordView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_scope = 'password_forgot'

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
        mongo = getattr(settings, 'MONGO_DB', None)
        if mongo:
            try:
                docs = list(mongo['users'].find({'is_active': True}).sort('date_joined', -1).limit(1000))
                data = []
                for d in docs:
                    data.append({
                        'id': d.get('_id') and f"USER-{str(d['_id'])}",
                        'fullName': (d.get('first_name') or '') + ((' ' + d.get('last_name')) if d.get('last_name') else '') or d.get('username') or d.get('email'),
                        'email': d.get('email'),
                        'username': d.get('username'),
                        'phone': d.get('phone') or '',
                        'role': d.get('role'),
                        'registrationDate': '',
                        'status': 'approved'
                    })
                return Response({'users': data})
            except Exception:
                pass
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
        mongo = getattr(settings, 'MONGO_DB', None)
        if mongo:
            try:
                docs = list(mongo['moderation_reports'].find({}))
                data = []
                for d in docs:
                    data.append({
                        'id': str(d.get('report_id') or d.get('_id')),
                        'type': d.get('type') or '',
                        'user': d.get('user_email') or '',
                        'submittedBy': d.get('submitted_by') or '',
                        'time': d.get('time') or '',
                        'severity': (d.get('severity') or '').title(),
                        'status': (d.get('status') or '').title(),
                        'description': d.get('description') or '',
                    })
                return Response({'reports': data})
            except Exception:
                pass
        qs = ModerationReport.objects.all().order_by('-created_at')
        data = []
        for r in qs[:500]:
            data.append({
                'id': r.report_id,
                'type': r.type,
                'user': r.user_email,
                'submittedBy': r.submitted_by,
                'time': '',
                'severity': r.severity.title(),
                'status': r.status.title(),
                'description': r.description,
            })
        return Response({'reports': data})

    def patch(self, request):
        if getattr(request.user, 'role', 'customer') != 'admin':
            return Response({'detail': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
        data = getattr(request, 'data', {}) or {}
        rid = data.get('id')
        action = (data.get('action') or data.get('status') or '').lower()
        reason = data.get('reason') or ''
        if not rid or action not in ['resolve', 'resolved', 'reject', 'rejected']:
            return Response({'code': 'invalid_report_update', 'detail': 'Invalid report update'}, status=status.HTTP_400_BAD_REQUEST)
        new_status = 'resolved' if action.startswith('resol') else 'rejected'
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
                return Response({'id': rid, 'status': new_status.title()})
            except Exception:
                pass
        obj = ModerationReport.objects.filter(report_id=rid).first()
        if not obj:
            return Response({'code': 'report_not_found', 'detail': 'Report not found'}, status=status.HTTP_404_NOT_FOUND)
        obj.status = new_status
        obj.save(update_fields=['status'])
        return Response({'id': rid, 'status': new_status.title()})

    def post(self, request):
        if getattr(request.user, 'role', 'customer') != 'admin':
            return Response({'code': 'forbidden', 'detail': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
        data = getattr(request, 'data', {}) or {}
        type_ = (data.get('type') or '').strip()
        user_email = (data.get('user_email') or '').strip()
        submitted_by = getattr(request.user, 'email', '')
        description = (data.get('description') or '').strip()
        severity = (data.get('severity') or 'low').lower()
        if not type_:
            return Response({'code': 'invalid', 'detail': 'type is required'}, status=status.HTTP_400_BAD_REQUEST)
        if severity not in ['low', 'medium', 'high']:
            return Response({'code': 'invalid', 'detail': 'severity must be low|medium|high'}, status=status.HTTP_400_BAD_REQUEST)
        rid = f"REP-{timezone.now().strftime('%Y%m%d%H%M%S')}"
        mongo = getattr(settings, 'MONGO_DB', None)
        if mongo:
            try:
                mongo['moderation_reports'].insert_one({
                    'report_id': rid,
                    'type': type_,
                    'user_email': user_email,
                    'submitted_by': submitted_by,
                    'description': description,
                    'severity': severity,
                    'status': 'pending',
                    'time': timezone.now().isoformat(),
                })
            except Exception:
                pass
        ModerationReport.objects.create(
            report_id=rid,
            type=type_,
            user_email=user_email,
            submitted_by=submitted_by,
            description=description,
            severity=severity,
            status='pending',
        )
        return Response({'id': rid, 'status': 'Pending'})

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
