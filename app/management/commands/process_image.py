import os
import pyvips
import math
from django.core.management.base import BaseCommand
from django.conf import settings
from app.models import Image

class Command(BaseCommand):
    help = 'Нарезает исходное изображение на тайлы, создает превью, вычисляет max_zoom и обновляет статус.'

    def add_arguments(self, parser):
        parser.add_argument('image_id', type=int, help='ID объекта Image в базе данных')

    def handle(self, *args, **options):
        image_id = options['image_id']
        
        try:
            image_instance = Image.objects.get(id=image_id)
        except Image.DoesNotExist:
            self.stdout.write(self.style.ERROR(f'Изображение с ID {image_id} не найдено.'))
            return

        # 1. Устанавливаем статус "В процессе", чтобы в админке было видно, что работа началась
        image_instance.status = 'PROCESSING'
        image_instance.save()
        self.stdout.write(self.style.WARNING(f'Статус изображения "{image_instance.name}" изменен на PROCESSING.'))

        source_path = image_instance.source_file.path
        
        try:
            # Открываем исходный файл с помощью pyvips
            image = pyvips.Image.new_from_file(source_path)

            # --- Шаг 2: Создание и сохранение превью ---
            thumbnail_dir = os.path.join(settings.MEDIA_ROOT, 'thumbnails')
            os.makedirs(thumbnail_dir, exist_ok=True)
            thumbnail_filename = f'image_{image_instance.id}_thumb.jpeg'
            thumbnail_path = os.path.join(thumbnail_dir, thumbnail_filename)
            
            # Создаем превью шириной 512px, высота подбирается автоматически с сохранением пропорций
            # crop='centre' гарантирует, что если изображение очень вытянутое, мы возьмем центральную часть
            thumbnail_image = image.thumbnail_image(512, height=512, crop='centre')
            thumbnail_image.write_to_file(thumbnail_path)
            
            # Сохраняем относительный путь в модель для будущего использования в API
            image_instance.thumbnail = os.path.join('thumbnails', thumbnail_filename)
            self.stdout.write(self.style.SUCCESS(f'Превью сохранено в {thumbnail_path}'))

            # --- Шаг 3: Вычисление максимального уровня зума ---
            max_dimension = max(image.width, image.height)
            max_zoom_level = math.ceil(math.log2(max_dimension / 256)) # Более точная формула для тайлов 256px
            
            self.stdout.write(self.style.SUCCESS(
                f'Размеры изображения: {image.width}x{image.height}. '
                f'Вычисленный максимальный зум: {max_zoom_level}'
            ))

            # --- Шаг 4: Нарезка основного изображения на тайлы ---
            output_dir = os.path.join(settings.MEDIA_ROOT, 'tiles', f'image_{image_instance.id}')
            os.makedirs(output_dir, exist_ok=True)
            
            self.stdout.write(f'Начинаю нарезку на тайлы в папку: {output_dir}')
            image.dzsave(
                output_dir,
                # layout='google',
                suffix='.jpeg'
            )
            self.stdout.write(self.style.SUCCESS('Нарезка на тайлы завершена.'))

            # --- Шаг 5: Финальное сохранение всех данных в БД ---
            image_instance.status = 'COMPLETED'
            image_instance.max_zoom_level = max_zoom_level
            image_instance.save()
            
            self.stdout.write(self.style.SUCCESS(
                f'Работа с изображением "{image_instance.name}" полностью завершена. Статус: COMPLETED.'
            ))

        except Exception as e:
            # В случае любой ошибки на любом из этапов, помечаем изображение как ошибочное
            image_instance.status = 'FAILED'
            image_instance.save()
            self.stdout.write(self.style.ERROR(f'Произошла критическая ошибка: {e}'))
            self.stdout.write(self.style.ERROR(
                f'Статус изображения "{image_instance.name}" изменен на FAILED.'
            ))