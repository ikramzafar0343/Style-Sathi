from django.contrib.auth import authenticate
from rest_framework import serializers
from .models import User

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'role', 'phone', 'business_name', 'business_type', 'registration_number']

class SignupSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    fullName = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = User
        fields = ['email', 'password', 'phone', 'role', 'business_name', 'business_type', 'fullName']

    def create(self, validated_data):
        full_name = validated_data.pop('fullName', '')
        role = validated_data.get('role', 'customer')
        user = User(
            email=validated_data['email'],
            username=validated_data['email'],
            role=role,
            phone=validated_data.get('phone', ''),
            business_name=validated_data.get('business_name', ''),
            business_type=validated_data.get('business_type', ''),
        )
        if full_name:
            parts = full_name.split(' ', 1)
            user.first_name = parts[0]
            if len(parts) > 1:
                user.last_name = parts[1]
        user.set_password(validated_data['password'])
        user.save()
        if not user.registration_number:
            user.registration_number = f"REG-{user.id:06d}"
            user.save(update_fields=['registration_number'])
        return user

class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField()
    expected_role = serializers.CharField(required=False)

    def validate(self, data):
        email = data.get('email')
        password = data.get('password')
        expected_role = data.get('expected_role')
        try:
            user_obj = User.objects.get(email=email)
            user = authenticate(username=user_obj.username, password=password)
        except User.DoesNotExist:
            user = None
        if user is None:
            raise serializers.ValidationError('Invalid credentials')
        if expected_role and user.role != expected_role:
            raise serializers.ValidationError('Role mismatch')
        data['user'] = user
        return data
