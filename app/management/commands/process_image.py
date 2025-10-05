# app/management/commands/process_image.py

import os
import pyvips
import math
import tempfile
from django.core.management.base import BaseCommand
from django.conf import settings
from app.models import Image

class Command(BaseCommand):
    help = 'Нарезает исходное изображение на тайлы, создавая промежуточный файл для стабильности.'

    def add_arguments(self, parser):
        parser.add_argument('image_id', type=int, help='ID объекта Image в базе данных')

    def handle(self, *args, **options):
        image_id = options['image_id']
        
        try:
            image_instance = Image.objects.get(id=image_id)
        except Image.DoesNotExist:
            self.stdout.write(self.style.ERROR(f'Изображение с ID {image_id} не найдено.'))
            return

        image_instance.status = 'PROCESSING'
        image_instance.save()
        self.stdout.write(self.style.WARNING(f'Статус изображения "{image_instance.name}" изменен на PROCESSING.'))

        source_path = image_instance.source_file.path
        temp_vips_file = None

        try:
            image = pyvips.Image.new_from_file(source_path)

            # --- Создание превью ---
            thumbnail_dir = os.path.join(settings.MEDIA_ROOT, 'thumbnails')
            os.makedirs(thumbnail_dir, exist_ok=True)
            thumbnail_filename = f'image_{image_instance.id}_thumb.jpeg'
            thumbnail_path = os.path.join(thumbnail_dir, thumbnail_filename)
            thumbnail_image = image.thumbnail_image(512, height=512, crop='centre')
            thumbnail_image.write_to_file(thumbnail_path)
            image_instance.thumbnail = os.path.join('thumbnails', thumbnail_filename)
            self.stdout.write(self.style.SUCCESS(f'Превью сохранено в {thumbnail_path}'))

            # --- Вычисление максимального зума ---
            max_dimension = max(image.width, image.height)
            max_zoom_level = math.ceil(math.log2(max_dimension / 256))
            self.stdout.write(self.style.SUCCESS(f'Размеры: {image.width}x{image.height}. Макс. зум: {max_zoom_level}'))

            # --- "Нормализация" изображения ---
            fd, temp_vips_file = tempfile.mkstemp(suffix='.v')
            os.close(fd)
            self.stdout.write(f'Создаю временный файл для нормализации: {temp_vips_file}')
            image.write_to_file(temp_vips_file)
            image = pyvips.Image.new_from_file(temp_vips_file)

            # =================================================================
            # --- ИСПРАВЛЕНИЕ ЗДЕСЬ: Нарезка на тайлы с правильным путем ---
            # =================================================================
            # 1. Создаем целевую директорию
            output_dir = os.path.join(settings.MEDIA_ROOT, 'tiles', f'image_{image_instance.id}')
            os.makedirs(output_dir, exist_ok=True)
            
            # 2. Создаем ПОЛНЫЙ ПУТЬ-ПРЕФИКС для dzsave
            # Например: /path/to/media/tiles/image_11/image_11
            output_path_prefix = os.path.join(output_dir, f'image_{image_instance.id}')
            
            self.stdout.write(f'Начинаю нарезку на тайлы с префиксом: {output_path_prefix}')
            
            # 3. Вызываем dzsave с этим префиксом и УБИРАЕМ `basename`
            image.dzsave(
                output_path_prefix,
                suffix='.jpeg'
            )
            self.stdout.write(self.style.SUCCESS('Нарезка на тайлы завершена.'))
            # =================================================================

            # --- Финальное сохранение ---
            image_instance.status = 'COMPLETED'
            image_instance.max_zoom_level = max_zoom_level
            image_instance.save()
            self.stdout.write(self.style.SUCCESS(f'Работа с "{image_instance.name}" полностью завершена. Статус: COMPLETED.'))

        except Exception as e:
            image_instance.status = 'FAILED'
            image_instance.save()
            self.stdout.write(self.style.ERROR(f'Произошла критическая ошибка: {e}'))
            self.stdout.write(self.style.ERROR(f'Статус "{image_instance.name}" изменен на FAILED.'))
        
        finally:
            # --- Очистка ---
            if temp_vips_file and os.path.exists(temp_vips_file):
                os.remove(temp_vips_file)
                self.stdout.write(f'Временный файл {temp_vips_file} удален.')