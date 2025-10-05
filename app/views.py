# app/views.py
from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.http import HttpResponse, Http404 
from django.conf import settings
import os
from .models import Image, PointOfInterest, Comment
from .serializers import (
    GalleryImageSerializer, 
    ImageDetailSerializer,
    MarkerDetailSerializer,
    MarkerCreateSerializer,
    MarkerSerializer,
    ChatMessageSerializer,
    ChatMessageCreateSerializer
)

# 1. API для галереи
class GalleryListView(generics.ListAPIView):
    queryset = Image.objects.filter(status='COMPLETED')
    serializer_class = GalleryImageSerializer
    permission_classes = [permissions.AllowAny]

# 2. API для деталей изображения
class ImageDetailView(generics.RetrieveAPIView):
    queryset = Image.objects.filter(status='COMPLETED')
    serializer_class = ImageDetailSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = 'id'

# 3. API для деталей маркера
class MarkerDetailView(generics.RetrieveAPIView):
    queryset = PointOfInterest.objects.all()
    serializer_class = MarkerDetailSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = 'id'

# 4. API для создания сообщения в чате
class ChatMessageCreateView(generics.CreateAPIView):
    serializer_class = ChatMessageCreateSerializer
    # ЗАМЕНЯЕМ IsAuthenticated НА AllowAny
    permission_classes = [permissions.AllowAny]

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['point'] = PointOfInterest.objects.get(id=self.kwargs['marker_id'])
        # Нам больше не нужен request.user, но request все еще полезен
        context['request'] = self.request 
        return context
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()
        response_serializer = ChatMessageSerializer(instance)
        headers = self.get_success_headers(response_serializer.data)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED, headers=headers)

class MarkerCreateView(generics.CreateAPIView):
    serializer_class = MarkerCreateSerializer
    # УБЕДИТЕСЬ, ЧТО ЗДЕСЬ СТОИТ AllowAny
    permission_classes = [permissions.AllowAny]

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['image'] = Image.objects.get(id=self.kwargs['image_id'])
        context['request'] = self.request
        return context

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()
        response_serializer = MarkerSerializer(instance, context=self.get_serializer_context())
        headers = self.get_success_headers(response_serializer.data)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED, headers=headers)

