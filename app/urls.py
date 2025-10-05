# app/urls.py
from django.contrib import admin
from django.urls import path
from django.conf import settings
from django.conf.urls.static import static
from django.shortcuts import redirect
from . import views

urlpatterns = [
    path('admin/', admin.site.urls),
    path("", lambda request: redirect("admin/")),

    # 1. Галерея
    path('api/gallery/', views.GalleryListView.as_view(), name='gallery-list'),
    # 2. Детали изображения
    path('api/images/<int:id>/', views.ImageDetailView.as_view(), name='image-detail'),
    # 3. Детали маркера
    path('api/markers/<int:id>/', views.MarkerDetailView.as_view(), name='marker-detail'),
    # 4. Отправка сообщения в чат
    path('api/markers/<int:marker_id>/chat/', views.ChatMessageCreateView.as_view(), name='chat-message-create'),
    # 5. Создание маркера
    path('api/images/<int:image_id>/markers/', views.MarkerCreateView.as_view(), name='marker-create'),
    
    # Вспомогательный эндпоинт для DZI
    # path('dzi/<int:image_id>/', views.DziView.as_view(), name='dzi-view'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)