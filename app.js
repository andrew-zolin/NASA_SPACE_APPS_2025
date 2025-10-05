
      
document.addEventListener('DOMContentLoaded', () => {

    // --- Получаем ссылки на все DOM-элементы ---
    const infoPanel = document.getElementById('info-panel');
    const panelTitle = document.getElementById('panel-title');
    const panelDescription = document.getElementById('panel-description');
    const closePanelBtn = document.getElementById('close-panel-btn');
    const chatComments = document.getElementById('chat-comments');
    const commentForm = document.getElementById('comment-form');
    const commentInput = document.getElementById('comment-input');
    const addMarkerBtn = document.getElementById('add-marker-btn');

    // --- Инициализируем OpenSeadragon ---
    const viewer = OpenSeadragon({
        id: "openseadragon-viewer",
        prefixUrl: "https://cdn.jsdelivr.net/npm/openseadragon@3.1/build/openseadragon/images/",
        tileSources: "data/heic0707a.dzi",
        gestureSettingsMouse: { clickToZoom: false } 
    });

    // --- Данные для меток (массив, который можно изменять) ---
    let markersData = [
        { 
            id: 'g1', x: 0.78, y: 0.45, title: "Скопление G1", 
            description: "Mayall II, или Скопление G1 — шаровое звёздное скопление в галактике Андромеды. Является ярчайшим скоплением в Местной группе.",
            comments: [{ user: "AstroFan", text: "Видел его в телескоп, потрясающе!" }, { user: "User123", text: "А сколько тут примерно звезд?" }]
        },
        { 
            id: 'dust-lane', x: 0.6, y: 0.5, title: "Пылевая полоса",
            description: "Темная полоса из холодной межзвездной пыли, которая поглощает свет от звезд, находящихся позади нее. Здесь формируются новые звезды.",
            comments: [{ user: "SpaceGeek", text: "Выглядит как река в космосе." }]
        }
    ];

    // --- Управление состоянием приложения ---
    let isAddMarkerMode = false;

    // Функция для переключения режима добавления метки
    function toggleAddMarkerMode(forceOff = false) {
        isAddMarkerMode = forceOff ? false : !isAddMarkerMode;
        
        if (isAddMarkerMode) {
            addMarkerBtn.classList.add('active');
            addMarkerBtn.textContent = '×';
            addMarkerBtn.title = 'Отменить добавление';
            viewer.element.classList.add('add-marker-mode');
        } else {
            addMarkerBtn.classList.remove('active');
            addMarkerBtn.textContent = '+';
            addMarkerBtn.title = 'Добавить новую метку';
            viewer.element.classList.remove('add-marker-mode');
        }
    }

    // --- Обработчики событий ---

    // Клик по кнопке "+"
    addMarkerBtn.addEventListener('click', () => toggleAddMarkerMode());

    // Функция для отрисовки одной метки
    function renderMarker(markerData) {
        const markerEl = document.createElement('div');
        markerEl.className = 'marker';
        viewer.addOverlay({
            element: markerEl,
            location: new OpenSeadragon.Point(markerData.x, markerData.y),
            placement: 'CENTER'
        });
    }

    // При открытии изображения рендерим все начальные метки
    viewer.addHandler('open', () => {
        markersData.forEach(markerData => renderMarker(markerData));
    });

    // Единый обработчик кликов по холсту (ключевая логика)
    viewer.addHandler('canvas-click', (event) => {
        // Если активен режим добавления метки
        if (isAddMarkerMode) {
            const viewportPoint = viewer.viewport.pointFromPixel(event.position);
            
            const title = prompt("Введите название для новой метки:", "");
            if (title === null || title.trim() === "") {
                toggleAddMarkerMode(true); // Отменяем, если пользователь ничего не ввел
                return;
            }
            const description = prompt("Введите краткое описание:", "");

            const newMarker = {
                id: 'user-marker-' + Date.now(),
                x: viewportPoint.x,
                y: viewportPoint.y,
                title: title,
                description: description || "Нет описания.",
                comments: []
            };

            markersData.push(newMarker); // Добавляем данные
            renderMarker(newMarker);     // Отрисовываем на холсте
            toggleAddMarkerMode(true);   // Выключаем режим
            
        } else { // Если активен обычный режим просмотра
            const clickWebPoint = event.position; 
            const clickThreshold = 20; // Радиус клика в пикселях
            for (const marker of markersData) {
                const markerWebPoint = viewer.viewport.viewportToWindowCoordinates(new OpenSeadragon.Point(marker.x, marker.y));
                const distance = clickWebPoint.distanceTo(markerWebPoint);
                if (distance < clickThreshold) {
                    showPanel(marker);
                    return;
                }
            }
        }
    });

    // --- Функции для работы с панелью ---
    function showPanel(marker) {
        panelTitle.textContent = marker.title;
        panelDescription.textContent = marker.description;
        chatComments.innerHTML = '';
        marker.comments.forEach(comment => addCommentToChat(comment.user, comment.text));
        infoPanel.classList.add('visible');
    }
    function addCommentToChat(user, text) {
        const commentEl = document.createElement('div');
        commentEl.className = 'comment';
        const userEl = document.createElement('b');
        userEl.textContent = `${user}:`;
        commentEl.appendChild(userEl);
        commentEl.append(` ${text}`);
        chatComments.appendChild(commentEl);
    }
    closePanelBtn.addEventListener('click', () => { infoPanel.classList.remove('visible'); });
    commentForm.addEventListener('submit', (event) => {
        event.preventDefault(); 
        const newCommentText = commentInput.value;
        if (newCommentText.trim() === '') return;
        addCommentToChat('You', newCommentText);
        commentInput.value = '';
        chatComments.scrollTop = chatComments.scrollHeight;
    });
});