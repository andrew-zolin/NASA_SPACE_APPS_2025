/**
 * main.js - Скрипт для главной страницы (index.html)
 *
 * Обязанности:
 * 1. После загрузки страницы сделать API-запрос для получения списка изображений.
 * 2. Показать состояние загрузки.
 * 3. Динамически создать и отобразить список изображений.
 * 4. Каждое изображение должно быть ссылкой на viewer.html с правильным ID.
 * 5. Обработать возможные ошибки при загрузке.
 */

document.addEventListener('DOMContentLoaded', async () => {
    // Находим контейнер, в который будем помещать наш список
    const container = document.getElementById('image-list-container');

    try {
        // 1. Делаем асинхронный запрос к нашему моковому API
        //    Функция `api.fetchAllImages` определена в файле `api.js`
        const images = await api.fetchAllImages();
        
        // 2. Очищаем контейнер от сообщения "Загрузка..."
        container.innerHTML = ''; 
        
        // 3. Проверяем, не пустой ли список
        if (images.length === 0) {
            container.innerHTML = '<p>Нет доступных для исследования изображений.</p>';
            return; // Завершаем выполнение скрипта
        }

        // 4. Создаем HTML-элемент списка (<ul>)
        const ul = document.createElement('ul');
        ul.className = 'image-list'; // Присваиваем класс для стилизации

        // 5. Проходим по каждому элементу в полученном массиве `images`
        images.forEach(image => {
            // Для каждого изображения создаем:
            // a) Элемент списка <li>
            const li = document.createElement('li');
            
            // b) Ссылку <a>
            const a = document.createElement('a');
            
            // c) Устанавливаем адрес ссылки. Это ключевой момент.
            //    Ссылка ведет на `viewer.html` и передает ID изображения как GET-параметр.
            //    Например: "viewer.html?id=andromeda"
            a.href = `viewer.html?id=${image.id}`;
            
            // d) Устанавливаем текст ссылки (название изображения)
            a.textContent = image.name;
            
            // e) Собираем структуру: <a> вкладывается в <li>
            li.appendChild(a);
            
            // f) Готовый <li> вкладывается в наш список <ul>
            ul.appendChild(li);
        });

        // 6. После того как все элементы созданы, добавляем готовый список в контейнер на странице
        container.appendChild(ul);

    } catch (error) {
        // 7. Если на этапе `await api.fetchAllImages()` произошла ошибка,
        //    этот блок кода выполнится.
        console.error("Ошибка при загрузке списка изображений:", error);
        container.innerHTML = '<p class="error">Не удалось загрузить список изображений. Пожалуйста, попробуйте обновить страницу позже.</p>';
    }
});