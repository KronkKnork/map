/**
 * Сервис для взаимодействия с MapBox API
 */

const MAPBOX_ACCESS_TOKEN = 'YOUR_MAPBOX_TOKEN'; // Требуется получить на mapbox.com

/**
 * Получает маршрут между двумя точками с альтернативами используя MapBox Directions API
 * @param {Object} origin - Начальная точка {latitude, longitude}
 * @param {Object} destination - Конечная точка {latitude, longitude}
 * @param {String} mode - Тип транспорта (driving, walking, cycling)
 * @param {Number} alternatives - Количество альтернативных маршрутов (0-2)
 * @returns {Promise<Object>} - Промис с данными маршрута
 */
export const getDirections = async (origin, destination, mode = 'driving', alternatives = 2) => {
  try {
    // Проверка на наличие координат
    if (!origin || !destination || !origin.latitude || !origin.longitude || 
        !destination.latitude || !destination.longitude) {
      throw new Error('Некорректные координаты');
    }

    // Преобразуем режим транспорта в формат Mapbox
    const mapboxProfile = convertTransportMode(mode);
    
    // Формируем URL
    const url = `https://api.mapbox.com/directions/v5/mapbox/${mapboxProfile}/` +
      `${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}` +
      `?alternatives=${alternatives}&geometries=geojson&steps=false&overview=full&access_token=${MAPBOX_ACCESS_TOKEN}`;
    
    console.log(`MapboxAPI: Запрос маршрута ${mode} от (${origin.latitude.toFixed(5)}, ${origin.longitude.toFixed(5)}) ` +
               `до (${destination.latitude.toFixed(5)}, ${destination.longitude.toFixed(5)})`);
    
    // Выполняем запрос
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ошибка API (${response.status}): ${errorText}`);
    }
    
    const data = await response.json();
    
    if (!data.routes || data.routes.length === 0) {
      throw new Error('Маршрут не найден');
    }
    
    console.log(`MapboxAPI: Получено ${data.routes.length} маршрутов`);
    
    // Обрабатываем результат
    const processedRoutes = data.routes.map((route, index) => {
      // Преобразуем координаты из формата GeoJSON в объекты с lat/lng
      const coordinates = route.geometry.coordinates.map(coord => ({
        longitude: coord[0],
        latitude: coord[1]
      }));
      
      // Преобразуем расстояние из метров в километры
      const distance = route.distance / 1000;
      
      // Преобразуем время из секунд в минуты
      const duration = route.duration / 60;
      
      return {
        coordinates,
        distance,
        duration: Math.round(duration),
        isApproximate: false,
        mode,
        isAlternative: index > 0, // Первый маршрут считаем основным
        alternativeIndex: index
      };
    });
    
    // Основной маршрут - первый в массиве
    const mainRoute = processedRoutes[0];
    
    // Добавляем все маршруты в поле multipleRoutes
    mainRoute.multipleRoutes = processedRoutes;
    
    return mainRoute;
  } catch (error) {
    console.error(`MapboxAPI: Ошибка при получении маршрута: ${error.message}`);
    return {
      error: 'ROUTE_ERROR',
      errorMessage: error.message,
      mode
    };
  }
};

/**
 * Преобразует режим транспорта в формат, понятный Mapbox
 * @param {String} mode - Режим транспорта (DRIVING, WALKING, BICYCLING, TRANSIT)
 * @returns {String} - Профиль Mapbox
 */
const convertTransportMode = (mode) => {
  mode = (mode || 'DRIVING').toUpperCase();
  
  switch (mode) {
    case 'WALKING':
      return 'walking';
    case 'BICYCLING':
      return 'cycling';
    case 'TRANSIT':
      return 'driving'; // Mapbox не имеет отдельного профиля для транзита
    case 'DRIVING':
    default:
      return 'driving';
  }
};

export default {
  getDirections
};
