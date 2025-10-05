// viewer.js (С УСИЛЕННОЙ ОТЛАДКОЙ)

document.addEventListener('DOMContentLoaded', () => {
    
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
        modalOverlay: document.getElementById('modal-overlay'),
        modal: document.getElementById('modal'),
        modalTitle: document.getElementById('modal-title'),
        modalContent: document.getElementById('modal-content'),
        modalFooter: document.getElementById('modal-footer'),
    };

    const state = {
        viewer: null, imageId: null, markers: [],
        isAddMarkerMode: false, chatPollInterval: null, currentOpenMarkerId: null,
    };

    let guestUserName = localStorage.getItem('guestUserName');

    // ... (showModal, closeModal, showAlert, ensureUserName - без изменений) ...
    function showModal({ title, content, buttons }) {
        return new Promise((resolve) => {
            dom.modalTitle.textContent = title;
            dom.modalContent.innerHTML = content;
            dom.modalFooter.innerHTML = '';
            buttons.forEach(buttonConfig => {
                const button = document.createElement('button');
                button.textContent = buttonConfig.text;
                button.className = `modal-button ${buttonConfig.class}`;
                button.addEventListener('click', () => {
                    let result = null;
                    if (buttonConfig.value === 'submit') {
                        const form = dom.modal.querySelector('form');
                        const formData = new FormData(form);
                        result = Object.fromEntries(formData.entries());
                    }
                    closeModal();
                    resolve(result);
                }, { once: true });
                dom.modalFooter.appendChild(button);
            });
            dom.modalOverlay.classList.add('visible');
            const firstInput = dom.modal.querySelector('input, textarea');
            if (firstInput) firstInput.focus();
        });
    }
    function closeModal() { dom.modalOverlay.classList.remove('visible'); }
    async function showAlert(message) {
        await showModal({
            title: "Уведомление",
            content: `<p>${message}</p>`,
            buttons: [{ text: "OK", class: "primary", value: "ok" }]
        });
    }
    async function ensureUserName() {
        if (guestUserName) return guestUserName;
        const result = await showModal({
            title: "Добро пожаловать!",
            content: `<form id="modal-form"><div class="form-group"><label for="username">Введите ваше имя для участия в обсуждениях:</label><input type="text" id="username" name="username" required autocomplete="off"></div></form>`,
            buttons: [{ text: "Сохранить", class: "primary", value: "submit" }]
        });
        if (result && result.username) {
            guestUserName = result.username.trim();
            localStorage.setItem('guestUserName', guestUserName);
            return guestUserName;
        }
        return null;
    }

    // =================================================================
    // --- ФУНКЦИЯ addNewMarker С ОТЛАДКОЙ ---
    // =================================================================
    async function addNewMarker(pixelPosition) {
        toggleAddMarkerMode(true);
        const userName = await ensureUserName();
        if (!userName) return;

        const result = await showModal({
            title: "Добавить новую метку",
            content: `<form id="modal-form"><div class="form-group"><label for="marker-title">Название</label><input type="text" id="marker-title" name="title" required></div><div class="form-group"><label for="marker-desc">Описание</label><textarea id="marker-desc" name="description"></textarea></div></form>`,
            buttons: [
                { text: "Отмена", class: "secondary", value: "cancel" },
                { text: "Сохранить", class: "primary", value: "submit" }
            ]
        });

        if (!result) return;

        const viewportPoint = state.viewer.viewport.pointFromPixel(pixelPosition);
        const newMarkerData = {
            title: result.title,
            description: result.description || "",
            x: viewportPoint.x,
            y: viewportPoint.y,
            user: userName
        };

        try {
            const createdMarker = await api.postNewMarker(state.imageId, newMarkerData);
            
            // --- ОТЛАДКА №1: Что именно вернул сервер? ---
            console.log("DEBUG: Ответ от сервера (createdMarker):", createdMarker);

            state.markers.push(createdMarker);

            // --- ОТЛАДКА №2: Как выглядит состояние после добавления? ---
            console.log("DEBUG: Состояние state.markers после push:", JSON.parse(JSON.stringify(state.markers)));
            
            renderAllMarkers();
            
        } catch (error) {
            console.error("Ошибка добавления маркера:", error);
            await showAlert("Не удалось сохранить метку. Попробуйте снова.");
        }
    }

    // =================================================================
    // --- ФУНКЦИЯ renderAllMarkers С ОТЛАДКОЙ ---
    // =================================================================
    function renderAllMarkers() {
        // --- ОТЛАДКА №3: Вызывается ли эта функция и с какими данными? ---
        console.log(`DEBUG: Вызов renderAllMarkers. Количество маркеров для отрисовки: ${state.markers.length}`);
        console.log("DEBUG: Текущее состояние state.markers:", JSON.parse(JSON.stringify(state.markers)));

        state.viewer.clearOverlays();
        state.markers.forEach(renderMarker);
    }

    function renderMarker(markerData) {
        if (!markerData || typeof markerData.x !== 'number' || typeof markerData.y !== 'number') {
            console.error("ОШИБКА: renderMarker получил некорректные данные!", markerData);
            return;
        }
        const el = document.createElement('div');
        el.className = 'marker';
        state.viewer.addOverlay({ element: el, location: new OpenSeadragon.Point(markerData.x, markerData.y), placement: 'CENTER' });
    }

    // ... (остальные функции без изменений: main, setupEventHandlers, и т.д.) ...
    async function handlePostComment(event) {
        event.preventDefault();
        const text = dom.commentInput.value;
        if (text.trim() === '' || !state.currentOpenMarkerId) return;
        const userName = await ensureUserName();
        if (!userName) return;
        dom.commentInput.disabled = true;
        try {
            await api.postChatMessage(state.currentOpenMarkerId, userName, text);
        } catch (error) {
            await showAlert("Ошибка отправки сообщения. Попробуйте снова.");
        } finally {
            dom.commentInput.value = '';
            dom.commentInput.disabled = false;
        }
    }
    async function main() {
        document.body.classList.add('viewer-page');
        const params = new URLSearchParams(window.location.search);
        state.imageId = params.get('id');
        if (!state.imageId) {
            window.location.href = 'index.html';
            return;
        }
        try {
            const imageData = await api.fetchImageById(state.imageId);
            state.markers = imageData.markers;
            document.title = imageData.name;
            state.viewer = OpenSeadragon({
                id: "openseadragon-viewer",
                prefixUrl: "https://cdn.jsdelivr.net/npm/openseadragon@3.1/build/openseadragon/images/",
                tileSources: imageData.tileSource,
                gestureSettingsMouse: { clickToZoom: false }
            });
            setupEventHandlers();
        } catch (error) {
            console.error("Критическая ошибка при инициализации:", error);
            dom.loader.innerHTML = `<p class="error">Не удалось загрузить данные. <a href="index.html">На главную</a></p>`;
        }
    }
    function setupEventHandlers() {
        state.viewer.addHandler('open', () => {
            renderAllMarkers();
            dom.loader.style.display = 'none';
            dom.addMarkerBtn.style.display = 'block';
        });
        state.viewer.addHandler('canvas-click', handleCanvasClick);
        dom.addMarkerBtn.addEventListener('click', () => toggleAddMarkerMode());
        dom.closePanelBtn.addEventListener('click', closeMarkerPanel);
        dom.commentForm.addEventListener('submit', handlePostComment);
    }
    function handleCanvasClick(event) {
        if (state.isAddMarkerMode) {
            addNewMarker(event.position);
        } else {
            const marker = findClickedMarker(event.position);
            if (marker) openMarkerPanel(marker);
        }
    }
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
        state.currentOpenMarkerId = marker.id;
        dom.panelTitle.textContent = marker.title;
        dom.panelDescription.textContent = "Загрузка...";
        dom.chatComments.innerHTML = '';
        dom.infoPanel.classList.add('visible');
        if (state.chatPollInterval) clearInterval(state.chatPollInterval);
        const fetchAndUpdate = async () => {
            try {
                const details = await api.fetchMarkerDetails(marker.id);
                if (marker.id === state.currentOpenMarkerId) {
                    dom.panelDescription.textContent = details.description;
                    updateChatView(details.chat);
                }
            } catch (error) {
                console.error("Ошибка обновления деталей маркера:", error);
                if (marker.id === state.currentOpenMarkerId) {
                    dom.panelDescription.textContent = "Ошибка загрузки.";
                }
                clearInterval(state.chatPollInterval);
            }
        };
        await fetchAndUpdate();
        state.chatPollInterval = setInterval(fetchAndUpdate, 5000);
    }
    function closeMarkerPanel() {
        dom.infoPanel.classList.remove('visible');
        if (state.chatPollInterval) clearInterval(state.chatPollInterval);
        state.currentOpenMarkerId = null;
    }
    function updateChatView(chatMessages) {
        const currentMessages = Array.from(dom.chatComments.children).map(c => c.textContent).join();
        const newMessages = chatMessages.map(m => `${m.user}:${m.text}`).join();
        if (currentMessages === newMessages) return;
        dom.chatComments.innerHTML = '';
        if (chatMessages.length === 0) {
            dom.chatComments.innerHTML = '<p>Обсуждений пока нет.</p>';
        } else {
            chatMessages.forEach(msg => addCommentToChatView(msg.user, msg.text));
        }
    }
    function addCommentToChatView(user, text) {
        if(dom.chatComments.querySelector('p')) dom.chatComments.innerHTML = '';
        const commentEl = document.createElement('div');
        commentEl.className = 'comment';
        const authorEl = document.createElement('span');
        authorEl.className = 'comment-author';
        authorEl.textContent = user;
        const textEl = document.createElement('span');
        textEl.className = 'comment-text';
        textEl.textContent = text;
        commentEl.appendChild(authorEl);
        commentEl.appendChild(textEl);
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
    main();
});