// Ждем, пока весь HTML-документ будет готов
document.addEventListener('DOMContentLoaded', () => {
    
    // --- Получаем все DOM-элементы ОДИН РАЗ в начале ---
    const dom = {
        loader: document.getElementById('loader'),
        viewerContainer: document.getElementById('openseadragon-viewer'),
        addMarkerBtn: document.getElementById('add-marker-btn'),
        infoPanel: document.getElementById('info-panel'),
        panelTitle: document.getElementById('panel-title'),
        panelDescription: document.getElementById('panel-description'),
        closePanelBtn: document.getElementById('close-panel-btn'),
        chatComments: document.getElementById('chat-comments'),
        commentForm: document.getElementById('comment-form'),
        commentInput: document.getElementById('comment-input'),
    };

    // --- Состояние приложения ---
    const state = {
        viewer: null,
        imageId: null,
        markers: [],
        isAddMarkerMode: false,
        chatPollInterval: null,
        currentOpenMarkerId: null,
    };

    // --- ГЛАВНАЯ ФУНКЦИЯ ---
    async function main() {
        console.log("Viewer Main: Запуск инициализации...");
        document.body.classList.add('viewer-page');

        // 1. Получаем ID из URL
        const params = new URLSearchParams(window.location.search);
        state.imageId = params.get('id');
        if (!state.imageId) {
            alert("Ошибка: ID изображения не найден.");
            window.location.href = 'index.html';
            return;
        }

        try {
            // 2. Загружаем данные с API
            const imageData = await api.fetchImageById(state.imageId);
            console.log("Viewer Main: Данные изображения получены", imageData);
            state.markers = imageData.markers;
            document.title = imageData.name;

            // 3. Инициализируем OpenSeadragon
            state.viewer = OpenSeadragon({
                id: "openseadragon-viewer",
                prefixUrl: "https://cdn.jsdelivr.net/npm/openseadragon@3.1/build/openseadragon/images/",
                tileSources: imageData.tileSource,
                gestureSettingsMouse: { clickToZoom: false }
            });

            // 4. После инициализации OSD, настраиваем все обработчики
            setupEventHandlers();

        } catch (error) {
            console.error("Критическая ошибка при инициализации:", error);
            dom.loader.innerHTML = `<p class="error">Не удалось загрузить данные. <a href="index.html">На главную</a></p>`;
        }
    }

    function setupEventHandlers() {
        // OSD готов, тайлы загружены - рендерим маркеры и скрываем лоадер
        state.viewer.addHandler('open', () => {
            console.log("OSD Event: 'open' - рендерим маркеры");
            renderAllMarkers();
            dom.loader.style.display = 'none';
            dom.addMarkerBtn.style.display = 'block';
        });

        // Единый обработчик кликов по холсту
        state.viewer.addHandler('canvas-click', handleCanvasClick);

        // Обработчики для кнопок и форм
        dom.addMarkerBtn.addEventListener('click', () => toggleAddMarkerMode());
        dom.closePanelBtn.addEventListener('click', closeMarkerPanel);
        dom.commentForm.addEventListener('submit', handlePostComment);
    }

    function handleCanvasClick(event) {
        console.log("Canvas Clicked. Режим добавления:", state.isAddMarkerMode);
        if (state.isAddMarkerMode) {
            addNewMarker(event.position);
        } else {
            const marker = findClickedMarker(event.position);
            if (marker) {
                openMarkerPanel(marker);
            }
        }
    }
    
    // Остальные функции (без изменений в логике, но используют новые переменные `dom` и `state`)
    // ... (полный код этих функций приведен ниже для целостности) ...
    function findClickedMarker(clickPosition) {
        const clickThreshold = 20;
        for (const marker of state.markers) {
            const markerWebPoint = state.viewer.viewport.viewportToWindowCoordinates(new OpenSeadragon.Point(marker.x, marker.y));
            if (clickPosition.distanceTo(markerWebPoint) < clickThreshold) return marker;
        }
        return null;
    }

    async function openMarkerPanel(marker) {
        if (state.currentOpenMarkerId === marker.id && dom.infoPanel.classList.contains('visible')) return;
        console.log("Открытие панели для маркера:", marker.id);
        
        state.currentOpenMarkerId = marker.id;
        dom.panelTitle.textContent = marker.title;
        dom.panelDescription.textContent = "Загрузка...";
        dom.chatComments.innerHTML = '';
        dom.infoPanel.classList.add('visible');

        if (state.chatPollInterval) clearInterval(state.chatPollInterval);
        
        const details = await api.fetchMarkerDetails(marker.id);
        dom.panelDescription.textContent = details.description;
        updateChatView(details.chat);
        
        state.chatPollInterval = setInterval(async () => {
            const updatedDetails = await api.fetchMarkerDetails(marker.id);
            updateChatView(updatedDetails.chat);
        }, 5000);
    }

    function closeMarkerPanel() {
        dom.infoPanel.classList.remove('visible');
        if (state.chatPollInterval) clearInterval(state.chatPollInterval);
        state.currentOpenMarkerId = null;
    }

    async function handlePostComment(event) {
        event.preventDefault();
        const text = dom.commentInput.value;
        if (text.trim() === '' || !state.currentOpenMarkerId) return;
        dom.commentInput.disabled = true;
        await api.postChatMessage(state.currentOpenMarkerId, text);
        dom.commentInput.value = '';
        dom.commentInput.disabled = false;
        // Чат обновится при следующем поллинге
    }
    
    async function addNewMarker(pixelPosition) {
        const viewportPoint = state.viewer.viewport.pointFromPixel(pixelPosition);
        const title = prompt("Название метки:");
        if (!title) { toggleAddMarkerMode(true); return; }
        const description = prompt("Описание:");

        const newMarkerData = { x: viewportPoint.x, y: viewportPoint.y, title, description };
        const createdMarker = await api.postNewMarker(state.imageId, newMarkerData);
        state.markers.push(createdMarker);
        renderMarker(createdMarker);
        toggleAddMarkerMode(true);
    }
    
    function renderAllMarkers() {
        state.viewer.clearOverlays();
        state.markers.forEach(renderMarker);
    }
    
    function renderMarker(markerData) {
        const el = document.createElement('div');
        el.className = 'marker';
        state.viewer.addOverlay({ element: el, location: new OpenSeadragon.Point(markerData.x, markerData.y), placement: 'CENTER' });
    }

    function updateChatView(chatMessages) {
        if (dom.chatComments.children.length === chatMessages.length) return;
        dom.chatComments.innerHTML = '';
        chatMessages.forEach(msg => addCommentToChatView(msg.user, msg.text));
    }

    function addCommentToChatView(user, text) {
        const commentEl = document.createElement('div');
        commentEl.className = 'comment';
        const userEl = document.createElement('b');
        userEl.textContent = `${user}:`;
        commentEl.appendChild(userEl);
        commentEl.append(` ${text}`);
        dom.chatComments.appendChild(commentEl);
    }
    
    function toggleAddMarkerMode(forceOff = false) {
        state.isAddMarkerMode = forceOff ? false : !state.isAddMarkerMode;
        if (state.isAddMarkerMode) {
            dom.addMarkerBtn.classList.add('active');
            dom.addMarkerBtn.textContent = '×';
            dom.viewerContainer.classList.add('add-marker-mode');
        } else {
            dom.addMarkerBtn.classList.remove('active');
            dom.addMarkerBtn.textContent = '+';
            dom.viewerContainer.classList.remove('add-marker-mode');
        }
    }

    // --- ЗАПУСК ---
    main();
});