document.addEventListener('DOMContentLoaded', () => {

    // --- Глобальные переменные и состояние ---
    let viewer;
    let currentImageId = null;
    let currentMarkers = [];
    let isAddMarkerMode = false;
    let chatPollInterval = null;
    let currentOpenMarkerId = null;

    // --- Получаем ссылки на DOM-элементы ---
    const loader = document.getElementById('loader');
    const addMarkerBtn = document.getElementById('add-marker-btn');
    const infoPanel = document.getElementById('info-panel');
    const panelTitle = document.getElementById('panel-title');
    const panelDescription = document.getElementById('panel-description');
    const closePanelBtn = document.getElementById('close-panel-btn');
    const chatComments = document.getElementById('chat-comments');
    const commentForm = document.getElementById('comment-form');
    const commentInput = document.getElementById('comment-input');

    // --- Основная функция инициализации приложения ---
    async function init() {
        document.body.classList.add('viewer-page');
        const params = new URLSearchParams(window.location.search);
        currentImageId = params.get('id');

        if (!currentImageId) {
            alert("Ошибка: ID изображения не найден. Возврат на главную страницу.");
            window.location.href = 'index.html';
            return;
        }

        try {
            // Запрашиваем данные с нашего мокового API
            const imageData = await api.fetchImageById(currentImageId);
            document.title = imageData.name;
            currentMarkers = imageData.markers;

            // Инициализируем OpenSeadragon с полученным tileSource
            viewer = OpenSeadragon({
                id: "openseadragon-viewer",
                prefixUrl: "https://cdn.jsdelivr.net/npm/openseadragon@3.1/build/openseadragon/images/",
                tileSources: imageData.tileSource,
                gestureSettingsMouse: { clickToZoom: false }
            });
            
            setupEventHandlers();
            
            // Как только тайлы загрузятся, показываем маркеры и убираем лоадер
            viewer.addHandler('open', () => {
                renderAllMarkers();
                loader.style.display = 'none';
                addMarkerBtn.style.display = 'block';
            });

        } catch (error) {
            console.error("Ошибка при инициализации viewer:", error);
            loader.innerHTML = `<p class="error">Не удалось загрузить данные для изображения. <a href="index.html">Вернуться на главную</a></p>`;
        }
    }

    // --- Настройка всех обработчиков событий ---
    function setupEventHandlers() {
        viewer.addHandler('canvas-click', handleCanvasClick);
        addMarkerBtn.addEventListener('click', () => toggleAddMarkerMode());
        closePanelBtn.addEventListener('click', closeMarkerPanel);
        commentForm.addEventListener('submit', handlePostComment);
    }
    
    // --- Главный обработчик кликов по холсту ---
    async function handleCanvasClick(event) {
        if (isAddMarkerMode) {
            await addNewMarker(event.position);
        } else {
            const marker = findClickedMarker(event.position);
            if (marker) {
                openMarkerPanel(marker);
            }
        }
    }
    
    // --- Поиск метки по координатам клика ---
    function findClickedMarker(clickPosition) {
        const clickThreshold = 20; // Радиус клика в пикселях
        for (const marker of currentMarkers) {
            const markerWebPoint = viewer.viewport.viewportToWindowCoordinates(new OpenSeadragon.Point(marker.x, marker.y));
            if (clickPosition.distanceTo(markerWebPoint) < clickThreshold) {
                return marker;
            }
        }
        return null;
    }

    // --- Открытие и заполнение инфо-панели ---
    async function openMarkerPanel(marker) {
        if (currentOpenMarkerId === marker.id && infoPanel.classList.contains('visible')) return;
        
        currentOpenMarkerId = marker.id;
        panelTitle.textContent = marker.title;
        panelDescription.textContent = "Загрузка данных...";
        chatComments.innerHTML = '<p class="loader">Загрузка чата...</p>';
        infoPanel.classList.add('visible');

        if (chatPollInterval) clearInterval(chatPollInterval);

        try {
            const details = await api.fetchMarkerDetails(marker.id);
            updatePanelContent(details);
            
            // Запускаем периодическое обновление чата
            chatPollInterval = setInterval(async () => {
                console.log(`Polling chat for marker ${marker.id}`);
                const updatedDetails = await api.fetchMarkerDetails(marker.id);
                updateChatView(updatedDetails.chat);
            }, 5000); // каждые 5 секунд
        } catch (error) {
            console.error("Не удалось загрузить детали метки:", error);
            panelDescription.textContent = "Ошибка загрузки данных.";
        }
    }
    
    // --- Закрытие инфо-панели ---
    function closeMarkerPanel() {
        infoPanel.classList.remove('visible');
        if (chatPollInterval) clearInterval(chatPollInterval);
        currentOpenMarkerId = null;
    }

    // --- Отправка нового комментария ---
    async function handlePostComment(event) {
        event.preventDefault();
        const text = commentInput.value;
        if (text.trim() === '' || !currentOpenMarkerId) return;

        commentInput.disabled = true; // Блокируем поле на время отправки
        try {
            const newMessage = await api.postChatMessage(currentOpenMarkerId, text);
            addCommentToChatView(newMessage.user, newMessage.text);
            commentInput.value = '';
            chatComments.scrollTop = chatComments.scrollHeight;
        } catch (error) {
            console.error("Ошибка отправки сообщения:", error);
        } finally {
            commentInput.disabled = false;
            commentInput.focus();
        }
    }
    
    // --- Добавление новой метки ---
    async function addNewMarker(pixelPosition) {
        const viewportPoint = viewer.viewport.pointFromPixel(pixelPosition);
        const title = prompt("Введите название для новой метки:", "");
        if (!title || title.trim() === "") { toggleAddMarkerMode(true); return; }
        const description = prompt("Введите краткое описание:", "");

        const newMarkerData = {
            x: viewportPoint.x, y: viewportPoint.y,
            title, description: description || "Нет описания."
        };

        try {
            const createdMarker = await api.postNewMarker(currentImageId, newMarkerData);
            currentMarkers.push(createdMarker);
            renderMarker(createdMarker);
        } catch (error) {
            console.error("Ошибка добавления метки:", error);
            alert("Не удалось сохранить метку.");
        } finally {
            toggleAddMarkerMode(true); // Всегда выключаем режим
        }
    }
    
    // --- Функции рендеринга ---
    function renderAllMarkers() {
        viewer.clearOverlays();
        currentMarkers.forEach(marker => renderMarker(marker));
    }
    
    function renderMarker(markerData) {
        const el = document.createElement('div');
        el.className = 'marker';
        viewer.addOverlay({ element: el, location: new OpenSeadragon.Point(markerData.x, markerData.y), placement: 'CENTER' });
    }
    
    function updatePanelContent(details) {
        panelDescription.textContent = details.description;
        updateChatView(details.chat);
    }

    function updateChatView(chat) {
        chatComments.innerHTML = '';
        if (chat.length === 0) {
            chatComments.innerHTML = '<p>Обсуждений пока нет.</p>';
        } else {
            chat.forEach(msg => addCommentToChatView(msg.user, msg.text));
        }
    }

    function addCommentToChatView(user, text) {
        if(chatComments.querySelector('p')) chatComments.innerHTML = '';

        const commentEl = document.createElement('div');
        commentEl.className = 'comment';
        const userEl = document.createElement('b');
        userEl.textContent = `${user}:`;
        commentEl.appendChild(userEl);
        commentEl.append(` ${text}`);
        chatComments.appendChild(commentEl);
    }
    
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

    // --- Запускаем все ---
    init();
});