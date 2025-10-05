# app/signals.py

import sys
import subprocess
from django.db import transaction  # <--- НОВЫЙ ИМПОРТ
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.conf import settings
from .models import Image
import tifffile

def process_image_task(image_id):
    """
    Эта функция будет запущена ПОСЛЕ успешного сохранения.
    Она содержит всю логику, которая раньше была в сигнале.
    """
    try:
        instance = Image.objects.get(id=image_id)
    except Image.DoesNotExist:
        print(f"ОШИБКА: Не удалось найти Image с ID {image_id} для фоновой обработки.")
        return

    # Проверка TIFF файла
    try:
        with tifffile.TiffFile(instance.source_file.path) as tif:
            print(f"Файл {instance.source_file.path} успешно открыт как TIFF для обработки.")
    except Exception as e:
        print(f"ОШИБКА: Файл {instance.source_file.path} не является валидным TIFF. Ошибка: {e}")
        instance.status = 'FAILED'
        instance.save()
        return

    # Запуск тяжелого процесса нарезки
    command = [
        sys.executable,
        str(settings.BASE_DIR / "manage.py"),
        "process_image",
        str(instance.id)
    ]
    
    print(f'Запуск фонового процесса: {" ".join(command)}')
    subprocess.Popen(command)


@receiver(post_save, sender=Image)
def start_image_processing(sender, instance, created, **kwargs):
    """
    Этот сигнал теперь ТОЛЬКО планирует запуск фоновой задачи.
    """
    if created and instance.status == 'PENDING':
        print(f'Сигнал получен для нового Image с ID {instance.id}. Планирую запуск обработки.')
        
        # --- ГЛАВНОЕ ИЗМЕНЕНИЕ ---
        # Мы говорим Django: "Когда текущая транзакция (сохранение модели и файла)
        # будет успешно завершена, вызови функцию process_image_task".
        transaction.on_commit(lambda: process_image_task(instance.id))