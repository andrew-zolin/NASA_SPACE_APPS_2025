// api.js

// --- Конфигурация ---
// Укажите здесь адрес вашего Django-сервера.
// Судя по вашим логам, это http://127.0.0.1:5002
const API_BASE_URL = 'http://127.0.0.1:5002';
// const API_BASE_URL = 'http://62.113.58.80:5757';
// const API_BASE_URL = 'https://admin.lovinad.com';

// --- Вспомогательная функция для всех запросов ---
async function apiRequest(endpoint, method = 'GET', body = null) {
    const url = `${API_BASE_URL}${endpoint}`;
    const options = {
        method,
        headers: {},
    };

    // Для POST/PUT запросов добавляем тело и заголовок
    if (body) {
        options.headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify(body);
    }
    
    // Django требует CSRF-токен для POST запросов от аутентифицированных пользователей.
    // Эта функция (ниже) будет его находить и добавлять в заголовок.
    if (method === 'POST' || method === 'PUT') {
        options.headers['X-CSRFToken'] = getCookie('csrftoken');
    }

    try {
        const response = await fetch(url, options);
        if (!response.ok) {
            // Если сервер вернул ошибку, пытаемся прочитать ее и выбросить
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Ошибка сети: ${response.status} ${response.statusText}. ${errorData.detail || ''}`);
        }
        // Для запросов, которые не возвращают тело (например, DELETE), возвращаем success
        if (response.status === 204) {
            return { success: true };
        }
        return await response.json();
    } catch (error) {
        console.error(`Ошибка API запроса к ${endpoint}:`, error);
        throw error; // Перебрасываем ошибку дальше, чтобы ее мог поймать UI
    }
}

// Функция для получения CSRF-токена из cookie
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}


// --- Реализация API ---

const api = {
    // 1. Получить список всех изображений для главной страницы
    async fetchAllImages() {
        console.log("API: Запрос списка всех изображений с бэкенда");
        // GET /api/gallery/
        return apiRequest('/api/gallery/');
    },

    // 2. Получить детальную информацию об одном изображении
    async fetchImageById(imageId) {
        console.log(`API: Запрос данных для изображения с ID: ${imageId}`);
        // GET /api/images/<id>/
        return apiRequest(`/api/images/${imageId}/`);
    },
    
    // 3. Получить детали метки (описание и чат)
    async fetchMarkerDetails(markerId) {
        console.log(`API: Запрос деталей для маркера с ID: ${markerId}`);
        // GET /api/markers/<id>/
        return apiRequest(`/api/markers/${markerId}/`);
    },

    // 4. Отправить новое сообщение в чат
    async postChatMessage(markerId, userName, messageText) {
        console.log(`API: Отправка сообщения "${messageText}" от "${userName}" для маркера ${markerId}`);
        const endpoint = `/api/markers/${markerId}/chat/`;
        const body = {
            user: userName, // Бэкенд ожидает поле 'user'
            text: messageText
        };
        // POST /api/markers/<marker_id>/chat/
        return apiRequest(endpoint, 'POST', body);
    },

    // 5. Добавить новую метку
    async postNewMarker(imageId, markerData) {
        console.log(`API: Добавление новой метки на изображение ${imageId}`);
        const endpoint = `/api/images/${imageId}/markers/`;
        // markerData уже имеет нужный формат: { title, description, x, y }
        // POST /api/images/<image_id>/markers/
        return apiRequest(endpoint, 'POST', markerData);
    }
};