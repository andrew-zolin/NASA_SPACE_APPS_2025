// Инициализируем OpenSeadragon
var viewer = OpenSeadragon({
    id: "openseadragon-viewer",
    prefixUrl: "https://cdn.jsdelivr.net/npm/openseadragon@3.1/build/openseadragon/images/",
    tileSources: "data/heic0707a.dzi" // <-- Путь к вашему DZI файлу!
});

// --- Добавляем метки ---

// Данные для наших меток. 
// Координаты x, y - от 0 (лево/верх) до 1 (право/низ)
const markers = [
    { x: 0.78, y: 0.45, title: "Большое звёздное скопление G1" },
    { x: 0.6, y: 0.5, title: "Пылевая полоса" },
    { x: 0, y: 0, title: "Test1" },
    { x: 0.98, y: 0.98, title: "Test2" },
];

// Когда изображение откроется, добавляем метки
viewer.addHandler('open', function() {
    markers.forEach(markerData => {
        // Создаем HTML-элемент для метки
        let markerEl = document.createElement('div');
        markerEl.className = 'marker';
        markerEl.title = markerData.title; // Всплывающая подсказка

        // Добавляем метку на изображение как оверлей
        viewer.addOverlay({
            element: markerEl,
            location: new OpenSeadragon.Point(markerData.x, markerData.y)
        });
    });
});