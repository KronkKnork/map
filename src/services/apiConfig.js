// Конфигурация API сервисов для MapEase

// Базовый URL для Nominatim API (OpenStreetMap)
export const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';

// Конфигурация для различных API запросов
export const API_CONFIG = {
  headers: {
    'User-Agent': 'MapEase-App/1.0',
    'Accept': 'application/json',
  },
  timeout: 10000, // 10 секунд таймаут по умолчанию
};

// Скорости для различных режимов передвижения (км/ч)
export const TRAVEL_SPEEDS = {
  'DRIVING': 50,
  'BICYCLING': 15,
  'WALKING': 5,
  'TRANSIT': 30
};

// Преобразование режима передвижения в формат для OpenRouteService API
export const getApiMode = (mode) => {
  switch (mode) {
    case 'WALKING':
      return 'foot-walking';
    case 'BICYCLING':
      return 'cycling-regular';
    case 'TRANSIT':
      return 'driving-car'; // Меняем на driving-car, так как driving-bus не работает
    case 'DRIVING':
    default:
      return 'driving-car';
  }
};
