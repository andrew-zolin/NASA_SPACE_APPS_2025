import uuid
from django.db import models
from django.contrib.auth.models import User

# =====================================================================
# Модель 1: Изображения
# Хранит метаданные о больших изображениях, загруженных в систему.
# Сами тайлы изображений хранятся в Cloudflare R2.
# =====================================================================
class Image(models.Model):
    name = models.CharField(
        max_length=255,
        unique=True,
        verbose_name="Название"
    )
    description = models.TextField(
        blank=True,
        verbose_name="Описание"
    )
    max_zoom_level = models.PositiveIntegerField(
        verbose_name="Максимальный уровень зума"
    )
    source_url = models.URLField(
        max_length=512,
        blank=True,
        verbose_name="URL источника"
    )
    uploaded_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Дата загрузки"
    )

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = "Изображение"
        verbose_name_plural = "Изображения"
        ordering = ['-uploaded_at']

# =====================================================================
# Модель 2: Точки Интереса (Points of Interest - POI)
# Точка, созданная пользователем на конкретном изображении для обсуждения.
# =====================================================================
class PointOfInterest(models.Model):
    image = models.ForeignKey(
        Image,
        on_delete=models.CASCADE,
        related_name='points',
        verbose_name="Изображение"
    )
    owner = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='points',
        verbose_name="Владелец"
    )
    x = models.BigIntegerField(
        verbose_name="Координата X"
    )
    y = models.BigIntegerField(
        verbose_name="Координата Y"
    )
    name = models.CharField(
        max_length=255,
        verbose_name="Название точки"
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Дата создания"
    )

    def __str__(self):
        return f'"{self.name}" на изображении "{self.image.name}"'

    class Meta:
        verbose_name = "Точка интереса"
        verbose_name_plural = "Точки интереса"
        ordering = ['-created_at']

# =====================================================================
# Модель 3: Комментарии
# Комментарий в треде обсуждения для конкретной точки интереса.
# Поддерживает вложенность (ответы на комментарии).
# =====================================================================
class Comment(models.Model):
    point = models.ForeignKey(
        PointOfInterest,
        on_delete=models.CASCADE,
        related_name='comments',
        verbose_name="Точка интереса"
    )
    author = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='comments',
        verbose_name="Автор"
    )
    text = models.TextField(
        verbose_name="Текст комментария"
    )
    parent_comment = models.ForeignKey(
        'self',
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name='replies',
        verbose_name="Родительский комментарий"
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Дата создания"
    )

    def __str__(self):
        return f'Комментарий от {self.author.username} к {self.point.name}'

    class Meta:
        verbose_name = "Комментарий"
        verbose_name_plural = "Комментарии"
        ordering = ['created_at']

# =====================================================================
# Модель 4: Взаимодействия с Gemini AI
# Логирует диалоги пользователя с AI по поводу конкретной точки.
# =====================================================================
class GeminiInteraction(models.Model):
    point = models.ForeignKey(
        PointOfInterest,
        on_delete=models.CASCADE,
        related_name='gemini_interactions',
        verbose_name="Точка интереса"
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='gemini_interactions',
        verbose_name="Пользователь"
    )
    prompt = models.TextField(
        verbose_name="Запрос (Prompt)"
    )
    response = models.TextField(
        verbose_name="Ответ (Response)"
    )
    timestamp = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Время"
    )

    def __str__(self):
        return f'Диалог {self.user.username} о {self.point.name} в {self.timestamp.strftime("%Y-%m-%d %H:%M")}'

    class Meta:
        verbose_name = "Взаимодействие с AI"
        verbose_name_plural = "Взаимодействия с AI"
        ordering = ['-timestamp']

# =====================================================================
# Модель 5: Объекты для векторного поиска
# Хранит метаданные объектов, чьи эмбеддинги загружены в Upstash Vector.
# Связывает ID вектора в Upstash с данными в PostgreSQL.
# =====================================================================
class SearchableObject(models.Model):
    vector_id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        verbose_name="ID Вектора (в Upstash)"
    )
    image = models.ForeignKey(
        Image,
        on_delete=models.CASCADE,
        related_name='searchable_objects',
        verbose_name="Изображение"
    )
    name = models.CharField(
        max_length=255,
        verbose_name="Название объекта"
    )
    description = models.TextField(
        verbose_name="Текстовое описание для эмбеддинга"
    )
    object_type = models.CharField(
        max_length=50,
        blank=True,
        verbose_name="Тип объекта (звезда, туманность и т.д.)"
    )
    x = models.BigIntegerField(
        verbose_name="Координата X центра"
    )
    y = models.BigIntegerField(
        verbose_name="Координата Y центра"
    )
    width = models.PositiveIntegerField(
        null=True,
        blank=True,
        verbose_name="Ширина (px)"
    )
    height = models.PositiveIntegerField(
        null=True,
        blank=True,
        verbose_name="Высота (px)"
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Дата добавления"
    )

    def __str__(self):
        return f'{self.name} ({self.object_type}) на изображении "{self.image.name}"'

    class Meta:
        verbose_name = "Объект для поиска"
        verbose_name_plural = "Объекты для поиска"
        ordering = ['-created_at']