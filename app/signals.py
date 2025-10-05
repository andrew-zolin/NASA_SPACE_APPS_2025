# app/signals.py

import sys
import subprocess
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.conf import settings
from .models import Image
import tifffile  # <--- ИМПОРТИРУЕМ НОВУЮ БИБЛИОТЕКУ

@receiver(post_save, sender=Image)
def start_image_processing(sender, instance, created, **kwargs):
    """
    Запускает команду нарезки в фоновом режиме.
    """
    # Запускаем, только если объект новый И у него статус PENDING
    if created and instance.status == 'PENDING':
        print(f'Сигнал получен: новый Image с ID {instance.id} создан.')
        
        # =================================================================
        # НОВАЯ ПРОВЕРКА С ПОМОЩЬЮ TIFFFILE
        # =================================================================
        try:
            # Попытаемся открыть файл. Если это не TIFF или он поврежден,
            # библиотека вызовет исключение.
            with tifffile.TiffFile(instance.source_file.path) as tif:
                # Просто успешное открытие - это уже хорошая проверка
                print(f"Файл {instance.source_file.path} успешно открыт как TIFF.")
        except Exception as e:
            print(f"ОШИБКА: Файл {instance.source_file.path} не является валидным TIFF. Ошибка: {e}")
            # Помечаем изображение как ошибочное и прекращаем работу
            instance.status = 'FAILED'
            instance.save()
            return # <-- ВАЖНО: выходим из функции
        # =================================================================

        # Если проверка прошла, запускаем тяжелый процесс нарезки
        command = [
            sys.executable,
            str(settings.BASE_DIR / "manage.py"),
            "process_image",
            str(instance.id)
        ]
        
        print(f'Запуск фонового процесса: {" ".join(command)}')
        subprocess.Popen(command)