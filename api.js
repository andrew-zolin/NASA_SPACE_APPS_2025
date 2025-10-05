const MOCK_DB = {
    images: {
        'andromeda': {
            name: "Галактика Андромеды (M31)",
            tileSource: "data/heic0707a.dzi"
        },
        'mars-gale-crater': {
            name: "Кратер Гейла, Марс",
            tileSource: "data/heic2105a.dzi" // Убедитесь, что у вас есть второй DZI
        }
    },
    markers: {
        'andromeda': [
            { id: 'g1', x: 0.78, y: 0.45, title: "Скопление G1" },
            { id: 'dust-lane', x: 0.6, y: 0.5, title: "Пылевая полоса" }
        ],
        'mars-gale-crater': [
            { id: 'mount-sharp', x: 0.5, y: 0.5, title: "Гора Шарпа" },
            { id: 'curiosity-landing', x: 0.45, y: 0.55, title: "Место посадки Curiosity" }
        ]
    },
    markerDetails: {
        'g1': {
            title: "Скопление G1",
            description: "Mayall II, или Скопление G1 — шаровое звёздное скопление в галактике Андромеды. Является ярчайшим скоплением в Местной группе.",
        },
        'dust-lane': {
            title: "Пылевая полоса",
            description: "Темная полоса из холодной межзвездной пыли, которая поглощает свет от звезд, находящихся позади нее."
        },
        'mount-sharp': {
            title: "Гора Шарпа (Эолида)",
            description: "Центральный пик в кратере Гейла. Марсоход Curiosity исследует его склоны с 2014 года."
        },
        'curiosity-landing': {
            title: "Место посадки Curiosity",
            description: "Марсоход миссии Mars Science Laboratory совершил посадку в этой точке 6 августа 2012 года."
        }
    },
    chats: {
        'g1': [
            { user: "AstroFan", text: "Видел его в телескоп, потрясающе!" },
            { user: "User123", text: "А сколько тут примерно звезд?" }
        ],
        'mount-sharp': [
            { user: "MarsExplorer", text: "Невероятные слоистые породы!" }
        ]
    }
};

// --- Имитация сетевой задержки ---
const networkDelay = (ms) => new Promise(res => setTimeout(res, ms));


// --- Функции API ---

const api = {
    // 1. Получить список всех изображений для главной страницы
    async fetchAllImages() {
        await networkDelay(500);
        console.log("API: Запрос списка всех изображений");
        const imageList = Object.keys(MOCK_DB.images).map(id => ({
            id: id,
            name: MOCK_DB.images[id].name
        }));
        return imageList;
    },

    // 2. Получить детальную информацию об одном изображении (для страницы viewer)
    async fetchImageById(imageId) {
        await networkDelay(700);
        console.log(`API: Запрос данных для изображения с ID: ${imageId}`);
        if (!MOCK_DB.images[imageId]) {
            throw new Error("Image not found");
        }
        return {
            id: imageId,
            name: MOCK_DB.images[imageId].name,
            tileSource: MOCK_DB.images[imageId].tileSource,
            markers: MOCK_DB.markers[imageId] || []
        };
    },
    
    // 3. Получить детали метки (описание и чат)
    async fetchMarkerDetails(markerId) {
        await networkDelay(400);
        console.log(`API: Запрос деталей для маркера с ID: ${markerId}`);
        if (!MOCK_DB.markerDetails[markerId]) {
            return null; // Или бросить ошибку
        }
        return {
            ...MOCK_DB.markerDetails[markerId],
            chat: MOCK_DB.chats[markerId] || []
        };
    },

    // 4. Отправить новое сообщение в чат
    async postChatMessage(markerId, messageText) {
        await networkDelay(300);
        console.log(`API: Отправка сообщения "${messageText}" для маркера ${markerId}`);
        if (!MOCK_DB.chats[markerId]) {
            MOCK_DB.chats[markerId] = [];
        }
        const newMessage = { user: "You", text: messageText };
        MOCK_DB.chats[markerId].push(newMessage);
        
        // Имитируем ответ от другого пользователя через некоторое время
        setTimeout(() => {
             if (MOCK_DB.chats[markerId]) {
                MOCK_DB.chats[markerId].push({ user: "Bot", text: "Интересное наблюдение!" });
             }
        }, 5000);

        return newMessage;
    },

    // 5. Добавить новую метку
    async postNewMarker(imageId, markerData) {
        await networkDelay(600);
        console.log(`API: Добавление новой метки на изображение ${imageId}`);
        const newMarkerId = 'user-marker-' + Date.now();
        const newMarker = {
            id: newMarkerId,
            x: markerData.x,
            y: markerData.y,
            title: markerData.title
        };
        const newMarkerDetails = {
            title: markerData.title,
            description: markerData.description
        };

        if (!MOCK_DB.markers[imageId]) MOCK_DB.markers[imageId] = [];
        MOCK_DB.markers[imageId].push(newMarker);
        MOCK_DB.markerDetails[newMarkerId] = newMarkerDetails;

        return newMarker;
    }
};