# app/serializers.py

from django.conf import settings
import pyvips
from rest_framework import serializers
from django.urls import reverse
from .models import Image, PointOfInterest, Comment

# --- Сериализаторы для Чатов (Комментариев) ---

class ChatMessageSerializer(serializers.ModelSerializer):
    # 'user' - это имя поля в JSON, 'author_name' - имя поля в модели
    user = serializers.CharField(source='author_name', read_only=True)

    class Meta:
        model = Comment
        fields = ['user', 'text']

class ChatMessageCreateSerializer(serializers.ModelSerializer):
    # Фронтенд будет присылать поле 'user' с именем из cookie
    user = serializers.CharField(max_length=80, source='author_name')

    class Meta:
        model = Comment
        fields = ['user', 'text']

    def create(self, validated_data):
        # Теперь мы не берем юзера из request, а просто сохраняем присланные данные
        point = self.context['point']
        return Comment.objects.create(point=point, **validated_data)

# ... (остальные сериализаторы MarkerSerializer, ImageDetailSerializer и т.д. остаются без изменений) ...
# Убедитесь, что они здесь присутствуют. Я их скрыл для краткости.

# --- Сериализаторы для Точек Интереса (Маркеров) ---

class MarkerSerializer(serializers.ModelSerializer):
    x = serializers.SerializerMethodField()
    y = serializers.SerializerMethodField()
    title = serializers.CharField(source='name')

    class Meta:
        model = PointOfInterest
        fields = ['id', 'x', 'y', 'title']

    def get_x(self, obj):
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
    """
    Сериализатор для детальной информации об одном изображении.
    """
    tileSource = serializers.SerializerMethodField()
    markers = serializers.SerializerMethodField()

    class Meta:
        model = Image
        fields = ['id', 'name', 'tileSource', 'markers']

    def get_tileSource(self, obj):
        # --- ИЗМЕНЕНИЕ ЗДЕСЬ ---
        # Вместо reverse() мы просто строим прямой URL к медиа-файлу.
        # Django сам добавит хост и MEDIA_URL.
        request = self.context.get('request')
        
        # Имя .dzi файла, которое создает process_image.py
        dzi_filename = f'tiles/image_{obj.id}/image_{obj.id}.dzi'
        
        # Получаем полный URL
        if request:
            return request.build_absolute_uri(f'{settings.MEDIA_URL}{dzi_filename}')
        
        # Запасной вариант, если request недоступен
        return f'{settings.MEDIA_URL}{dzi_filename}'

    def get_markers(self, obj):
        # ... (этот метод остается без изменений) ...
        try:
            with pyvips.Image.new_from_file(obj.source_file.path) as img:
                width, height = img.width, img.height
        except Exception:
            width, height = None, None
        
        context = self.context
        context.update({'image_width': width, 'image_height': height})
        
        return MarkerSerializer(obj.points.all(), many=True, context=context).data

# --- Сериализаторы для создания новых объектов ---

class MarkerCreateSerializer(serializers.ModelSerializer):
    x = serializers.FloatField(write_only=True)
    y = serializers.FloatField(write_only=True)
    title = serializers.CharField(source='name')
    
    class Meta:
        model = PointOfInterest
        fields = ['title', 'description', 'x', 'y']

    def create(self, validated_data):
        context = self.context
        image = context['image']
        owner = context['request'].user

        normalized_x = validated_data.pop('x')
        normalized_y = validated_data.pop('y')

        try:
            with pyvips.Image.new_from_file(image.source_file.path) as img:
                pixel_x = int(normalized_x * img.width)
                pixel_y = int(normalized_y * img.height)
        except Exception:
            raise serializers.ValidationError("Не удалось обработать исходное изображение.")

        validated_data['x'] = pixel_x
        validated_data['y'] = pixel_y
        return PointOfInterest.objects.create(image=image, owner=owner, **validated_data)