from django.contrib import admin
from unfold.admin import ModelAdmin as UnfoldModelAdmin, TabularInline as UnfoldTabularInline, StackedInline as UnfoldStackedInline

from .models import (
    Image,
    PointOfInterest,
    Comment,
    GeminiInteraction,
    SearchableObject,
)

# Для удобства можно использовать инлайны, чтобы видеть комментарии прямо на странице POI
class CommentInline(UnfoldTabularInline):
    model = Comment
    extra = 0  # Не показывать пустые формы для добавления по умолчанию
    fields = ('author', 'text', 'parent_comment', 'created_at')
    readonly_fields = ('created_at',)
    autocomplete_fields = ('author', 'parent_comment')


@admin.register(Image)
class ImageAdmin(UnfoldModelAdmin):
    list_display = ('name', 'max_zoom_level', 'uploaded_at')
    search_fields = ('name', 'description')
    readonly_fields = ('uploaded_at',)
    fieldsets = (
        (None, {
            'fields': ('name', 'description')
        }),
        ('Техническая информация', {
            'fields': ('max_zoom_level', 'source_url', 'uploaded_at')
        }),
    )

@admin.register(PointOfInterest)
class PointOfInterestAdmin(UnfoldModelAdmin):
    list_display = ('name', 'image', 'owner', 'created_at')
    list_filter = ('image', 'created_at')
    search_fields = ('name', 'owner__username', 'image__name')
    autocomplete_fields = ('image', 'owner')
    readonly_fields = ('created_at',)
    inlines = [CommentInline]  # Показываем комментарии на странице точки
    fieldsets = (
        (None, {
            'fields': ('name', 'image', 'owner')
        }),
        ('Координаты на изображении', {
            'fields': ('x', 'y')
        }),
    )

@admin.register(Comment)
class CommentAdmin(UnfoldModelAdmin):
    list_display = ('author', 'point', 'short_text', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('text', 'author__username', 'point__name')
    autocomplete_fields = ('point', 'author', 'parent_comment')
    readonly_fields = ('created_at',)

    def short_text(self, obj):
        return obj.text[:50] + '...' if len(obj.text) > 50 else obj.text
    short_text.short_description = 'Текст комментария'

@admin.register(SearchableObject)
class SearchableObjectAdmin(UnfoldModelAdmin):
    list_display = ('name', 'object_type', 'image', 'created_at')
    list_filter = ('object_type', 'image')
    search_fields = ('name', 'description', 'object_type')
    autocomplete_fields = ('image',)
    readonly_fields = ('vector_id', 'created_at')
    fieldsets = (
        ('Основная информация', {
            'fields': ('name', 'image', 'object_type', 'description')
        }),
        ('Расположение и размеры', {
            'fields': ('x', 'y', 'width', 'height')
        }),
        ('Системная информация', {
            'fields': ('vector_id', 'created_at')
        }),
    )
    
    # ВАЖНО: Логику по созданию эмбеддинга и отправке в Upstash
    # лучше всего реализовать через сигналы Django (post_save)
    # или переопределив метод save_model() здесь в админке.
    # Это гарантирует, что при каждом сохранении объекта его вектор будет обновлен.

@admin.register(GeminiInteraction)
class GeminiInteractionAdmin(UnfoldModelAdmin):
    list_display = ('user', 'point', 'timestamp')
    list_filter = ('timestamp', 'user')
    search_fields = ('prompt', 'response', 'user__username', 'point__name')
    readonly_fields = [f.name for f in GeminiInteraction._meta.fields] # Сделать все поля только для чтения

    def has_add_permission(self, request):
        return False # Запретить создание записей вручную

    def has_change_permission(self, request, obj=None):
        return False # Запретить редактирование