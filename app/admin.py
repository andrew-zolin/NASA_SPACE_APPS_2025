# app/admin.py
from django.contrib import admin
from unfold.admin import ModelAdmin as UnfoldModelAdmin, TabularInline as UnfoldTabularInline
from .models import Image, PointOfInterest, GeminiInteraction, SearchableObject, Comment

@admin.register(Image)
class ImageAdmin(UnfoldModelAdmin):
    list_display = ('name', 'source_file', 'status', 'max_zoom_level', 'uploaded_at')
    
    # Добавляем max_zoom_level в поля только для чтения
    readonly_fields = ('uploaded_at', 'status', 'max_zoom_level') 
    
    search_fields = ('name', 'description')
    list_filter = ('status',)
    
    fieldsets = (
        (None, {
            'fields': ('name', 'description', 'source_file')
        }),
        ('Техническая информация', {
            # Поле max_zoom_level теперь здесь, и оно будет отображаться, но не редактироваться
            'fields': ('max_zoom_level', 'source_url', 'status', 'uploaded_at')
        }),
    )

class CommentInline(UnfoldTabularInline):
    model = Comment
    extra = 0
    fields = ('author_name', 'text', 'created_at')
    readonly_fields = ('created_at',)

@admin.register(PointOfInterest)
class PointOfInterestAdmin(UnfoldModelAdmin):
    # Убрали инлайн для комментариев, добавили description
    list_display = ('name', 'image', 'owner', 'created_at')
    list_filter = ('image', 'created_at')
    search_fields = ('name', 'owner__username', 'image__name')
    autocomplete_fields = ('image', 'owner')
    readonly_fields = ('created_at',)
    fieldsets = (
        (None, {
            'fields': ('name', 'image', 'owner', 'description')
        }),
        ('Координаты на изображении', {
            'fields': ('x', 'y')
        }),
    )
    inlines = [CommentInline]


# Эти модели пока просто регистрируем, чтобы их можно было видеть в админке,
# но основная логика для них отключена.
@admin.register(SearchableObject)
class SearchableObjectAdmin(UnfoldModelAdmin):
    list_display = ('name', 'object_type', 'image', 'created_at')
    readonly_fields = ('vector_id', 'created_at')

@admin.register(GeminiInteraction)
class GeminiInteractionAdmin(UnfoldModelAdmin):
    list_display = ('user', 'point', 'timestamp')
    readonly_fields = [f.name for f in GeminiInteraction._meta.fields]

@admin.register(Comment)
class CommentAdmin(UnfoldModelAdmin):
    list_display = ('author_name', 'point', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('text', 'author_name', 'point__name')
    readonly_fields = ('created_at',)