# app/serializers.py

import pyvips
from rest_framework import serializers
from django.urls import reverse
from django.conf import settings
from .models import Image, PointOfInterest, Comment

# --- Сериализаторы для Чатов (Комментариев) ---

class ChatMessageSerializer(serializers.ModelSerializer):
    user = serializers.CharField(source='author_name', read_only=True)
    class Meta:
        model = Comment
        fields = ['user', 'text']

class ChatMessageCreateSerializer(serializers.ModelSerializer):
    user = serializers.CharField(max_length=80, source='author_name')
    class Meta:
        model = Comment
        fields = ['user', 'text']
    def create(self, validated_data):
        point = self.context['point']
        return Comment.objects.create(point=point, **validated_data)

# --- Сериализаторы для Точек Интереса (Маркеров) ---

class MarkerSerializer(serializers.ModelSerializer):
    x = serializers.SerializerMethodField()
    y = serializers.SerializerMethodField()
    title = serializers.CharField(source='name')
    class Meta:
        model = PointOfInterest
        fields = ['id', 'x', 'y', 'title']
    def get_x(self, obj):
        # Берем размеры из контекста, как и раньше
        width = self.context.get('image_width')
        if width: return obj.x / width
        return None

    def get_y(self, obj):
        height = self.context.get('image_height')
        if height: return obj.y / height
        return None

class MarkerDetailSerializer(serializers.ModelSerializer):
    title = serializers.CharField(source='name')
    chat = ChatMessageSerializer(many=True, source='comments', read_only=True)
    class Meta:
        model = PointOfInterest
        fields = ['title', 'description', 'chat']

# --- Сериализаторы для Изображений ---

class GalleryImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Image
        fields = ['id', 'name', 'thumbnail']

class ImageDetailSerializer(serializers.ModelSerializer):
    tileSource = serializers.SerializerMethodField()
    markers = serializers.SerializerMethodField()
    class Meta:
        model = Image
        fields = ['id', 'name', 'tileSource', 'markers']

    def get_tileSource(self, obj):
        request = self.context.get('request')
        # ИСПРАВЛЕННЫЙ ПУТЬ: tiles/image_{id}/image_{id}.dzi
        dzi_filename = f'tiles/image_{obj.id}/image_{obj.id}.dzi'
        
        if request:
            return request.build_absolute_uri(f'{settings.MEDIA_URL}{dzi_filename}')
        return f'{settings.MEDIA_URL}{dzi_filename}'



    def get_markers(self, obj):
        # УБИРАЕМ ОТКРЫТИЕ ФАЙЛА!
        # Берем размеры напрямую из объекта Image
        width = obj.width
        height = obj.height
        
        context = self.context
        context.update({'image_width': width, 'image_height': height})
        
        return MarkerSerializer(obj.points.all(), many=True, context=context).data


class MarkerCreateSerializer(serializers.ModelSerializer):
    x = serializers.FloatField(write_only=True)
    y = serializers.FloatField(write_only=True)
    title = serializers.CharField(source='name')
    # Принимаем 'user' от фронтенда и связываем его с полем 'owner_name'
    user = serializers.CharField(max_length=80, source='owner_name')
    
    class Meta:
        model = PointOfInterest
        fields = ['title', 'description', 'x', 'y', 'user']

    def create(self, validated_data):
        image = self.context['image']
        
        # "Вытаскиваем" нормализованные координаты
        normalized_x = validated_data.pop('x')
        normalized_y = validated_data.pop('y')

        if not image.width or not image.height:
            raise serializers.ValidationError("Размеры исходного изображения не определены. Обработка еще не завершена.")

        # Используем переменные normalized_x и normalized_y
        pixel_x = int(normalized_x * image.width)
        pixel_y = int(normalized_y * image.height)

        # Добавляем пиксельные координаты обратно в словарь для создания объекта
        validated_data['x'] = pixel_x
        validated_data['y'] = pixel_y
        
        # owner_name уже находится в validated_data, так как мы его не "вытаскивали".
        # Просто создаем объект со всеми полученными и обработанными данными.
        return PointOfInterest.objects.create(image=image, **validated_data)