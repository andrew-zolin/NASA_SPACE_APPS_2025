// main.js

document.addEventListener('DOMContentLoaded', async () => {
    const container = document.getElementById('image-list-container');

    try {
        const images = await api.fetchAllImages();
        
        container.innerHTML = ''; 
        
        if (images.length === 0) {
            container.innerHTML = '<p>Нет доступных для исследования изображений.</p>';
            return;
        }

        const ul = document.createElement('ul');
        ul.className = 'image-list';

        images.forEach(image => {
            // Создаем элементы
            const li = document.createElement('li');
            const a = document.createElement('a');
            const img = document.createElement('img');
            const span = document.createElement('span');

            // Настраиваем ссылку
            a.href = `viewer.html?id=${image.id}`;
            
            // Настраиваем превью
            img.src = image.thumbnail;
            img.alt = image.name;
            img.className = 'gallery-thumbnail';

            // Настраиваем текст
            span.textContent = image.name;

            // Собираем все вместе: <img> и <span> внутри <a>
            a.appendChild(img);
            a.appendChild(span);
            
            // <a> внутри <li>
            li.appendChild(a);
            
            // <li> внутри <ul>
            ul.appendChild(li);
        });

        container.appendChild(ul);

    } catch (error) {
        console.error("Ошибка при загрузке списка изображений:", error);
        container.innerHTML = '<p class="error">Не удалось загрузить список изображений. Пожалуйста, попробуйте обновить страницу позже.</p>';
    }
});