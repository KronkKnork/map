import axios from 'axios';

// Базовый URL для OpenStreetMap Nominatim API (геокодирование и поиск)
const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';

// Базовый URL для OpenStreetMap (навигация и маршруты)
const OSM_BASE_URL = 'https://api.openrouteservice.org';

// Создаем экземпляр Axios для Nominatim API
const nominatimApi = axios.create({
  baseURL: NOMINATIM_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept-Language': 'ru,en', // Предпочтительные языки для результатов
    'User-Agent': 'MapEase App' // Обязательный User-Agent для Nominatim
  },
  params: {
    format: 'json' // Ответ в формате JSON
  }
});

// Создаем экземпляр Axios для Open Route Service API (для маршрутов)
// Примечание: необходим API ключ для работы с OpenRouteService
const routeApi = axios.create({
  baseURL: OSM_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json, application/geo+json, application/gpx+xml',
    // Здесь будет добавлен API ключ при инициализации приложения
    // 'Authorization': 'YOUR_API_KEY_HERE'
  }
});

// Функция для установки API ключа
export const setApiKey = (apiKey) => {
  routeApi.defaults.headers.common['Authorization'] = apiKey;
};

export { nominatimApi, routeApi };
