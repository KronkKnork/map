// API сервисы для MapEase
import axios from 'axios';
import { OPEN_ROUTE_SERVICE_API_KEY } from '../constants/apiKeys';

// Базовый URL для Nominatim API (OpenStreetMap)
const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';

// Поиск мест по запросу с учетом местоположения пользователя
export const searchPlaces = async (query, limit = 10, userLocation = null) => {
  try {
    console.log(`Отправляем запрос поиска: ${query} с лимитом ${limit}${userLocation ? ' и учетом местоположения' : ''}`);
    
    // Добавляем таймаут для обеспечения завершения запроса
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000); // Таймаут 6 секунд
    
    // Базовые параметры запроса
    const params = {
      q: query,
      format: 'json',
      addressdetails: 1,
      limit: Math.min(limit * 2, 50), // Запрашиваем больше результатов для лучшей сортировки
      'accept-language': 'ru,en', // Предпочитаем русский язык в результатах
      extratags: 1,
      namedetails: 1
    };
    
    // Если передано местоположение пользователя, добавляем параметры для точки отсчета
    if (userLocation && userLocation.latitude && userLocation.longitude) {
      params.lat = userLocation.latitude;
      params.lon = userLocation.longitude;
      
      // Не добавляем viewbox, чтобы не ограничивать поиск географически,
      // но используем координаты как точку отсчета для сортировки
    }
    
    console.log(`API: Поиск "${query}" по всему миру`);
    
    const response = await axios.get(`${NOMINATIM_BASE_URL}/search`, {
      params,
      headers: {
        'User-Agent': 'MapEase-App/1.0',
        'Accept': 'application/json',
      },
      signal: controller.signal,
      timeout: 6000
    });
    
    clearTimeout(timeoutId);
    
    if (!response.data || !Array.isArray(response.data)) {
      console.error('Некорректный формат результатов поиска:', response.data);
      return [];
    }
    
    console.log(`API: Получено ${response.data.length} результатов поиска`);
    
    // Преобразуем данные в нужный формат
    let results = response.data.map((item) => ({
      id: item.place_id,
      name: item.namedetails?.name || item.display_name.split(',')[0],
      address: item.display_name,
      latitude: parseFloat(item.lat),
      longitude: parseFloat(item.lon),
      type: getTypeFromCategory(item.class),
    }));
    
    // Если есть местоположение пользователя, рассчитываем расстояние до каждого результата
    if (userLocation && userLocation.latitude && userLocation.longitude) {
      results.forEach(result => {
        if (result.latitude && result.longitude) {
          result.distance = calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            result.latitude,
            result.longitude
          );
        }
      });
      
      // Сортируем результаты по расстоянию (от ближнего к дальнему)
      results.sort((a, b) => {
        if (!a.distance) return 1;
        if (!b.distance) return -1;
        return a.distance - b.distance;
      });
    }
    
    // Ограничиваем результаты запрошенным лимитом
    return results.slice(0, limit);
  } catch (error) {
    console.error('Ошибка при поиске мест:', error);
    
    // Пробуем резервный метод в случае ошибки
    try {
      return await searchByNameWithFallback(query, limit, userLocation);
    } catch (fallbackError) {
      console.error('Ошибка при резервном поиске:', fallbackError);
      return []; // В крайнем случае возвращаем пустой массив
    }
  }
};

// Резервный метод поиска (более простой запрос)
const searchByNameWithFallback = async (query, limit = 10, userLocation = null) => {
  try {
    console.log(`Пробуем резервный метод поиска для: ${query}`);
    
    // Базовые параметры запроса
    const params = {
      q: query,
      format: 'json',
      'accept-language': 'ru,en',
      addressdetails: 1,
      limit: Math.min(limit * 2, 30)
    };
    
    // Если передано местоположение, используем его только для точки отсчета
    if (userLocation && userLocation.latitude && userLocation.longitude) {
      params.lat = userLocation.latitude;
      params.lon = userLocation.longitude;
    }
    
    const response = await axios.get(`${NOMINATIM_BASE_URL}/search`, {
      params,
      headers: {
        'User-Agent': 'MapEase-App/1.0',
        'Accept': 'application/json',
      },
      timeout: 6000
    });
    
    console.log(`Резервный метод вернул ${response.data.length} результатов`);
    
    if (response.data.length === 0) {
      return [];
    }
    
    const results = response.data.map((item) => ({
      id: item.place_id,
      name: item.display_name.split(',')[0],
      address: item.display_name,
      latitude: parseFloat(item.lat),
      longitude: parseFloat(item.lon),
      type: getTypeFromCategory(item.class)
    }));
    
    // Если есть местоположение пользователя, рассчитываем расстояние и сортируем
    if (userLocation && userLocation.latitude && userLocation.longitude) {
      results.forEach(result => {
        if (result.latitude && result.longitude) {
          result.distance = calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            result.latitude,
            result.longitude
          );
        }
      });
      
      // Сортируем результаты по расстоянию
      results.sort((a, b) => {
        if (!a.distance) return 1;
        if (!b.distance) return -1;
        return a.distance - b.distance;
      });
    }
    
    return results.slice(0, limit);
  } catch (error) {
    console.error('Ошибка при резервном поиске:', error);
    return []; // Возвращаем пустой массив вместо ошибки
  }
};

// Локальный поиск для приоритизации ближайших результатов
const searchLocalPlaces = async (query, limit = 10, userLocation = null) => {
  try {
    if (!userLocation) return [];
    
    console.log(`Локальный поиск для: ${query}`);
    
    const params = {
      q: query,
      format: 'json',
      'accept-language': 'ru,en',
      addressdetails: 1,
      limit: Math.min(limit * 2, 30), 
      viewbox: `${userLocation.longitude - 0.1},${userLocation.latitude - 0.1},${userLocation.longitude + 0.1},${userLocation.latitude + 0.1}`,
      bounded: 1, // Ограничиваем поиск в пределах viewbox
      zoom: 18 // Очень детальный масштаб для локального поиска
    };
    
    const response = await axios.get(`${NOMINATIM_BASE_URL}/search`, {
      params,
      headers: {
        'User-Agent': 'MapEase-App/1.0',
        'Accept': 'application/json',
      },
      timeout: 5000 // Короткий таймаут
    });
    
    if (!response.data || response.data.length === 0) {
      return [];
    }
    
    const formattedResults = response.data.map((item) => ({
      id: item.place_id,
      name: item.display_name.split(',')[0],
      address: item.display_name,
      latitude: parseFloat(item.lat),
      longitude: parseFloat(item.lon),
      type: getTypeFromCategory(item.class),
    }));
    
    // Рассчитываем расстояние
    formattedResults.forEach(result => {
      if (result.latitude && result.longitude) {
        result.distance = calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          result.latitude,
          result.longitude
        );
      }
    });
    
    // Сортируем по расстоянию
    return formattedResults.sort((a, b) => {
      if (!a.distance) return 1;
      if (!b.distance) return -1;
      return a.distance - b.distance;
    });
  } catch (error) {
    console.error('Ошибка при локальном поиске:', error);
    return [];
  }
};

// Функция расчета расстояния по формуле Гаверсинуса
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Радиус Земли в км
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
  const distance = R * c; // Расстояние в км
  return distance;
};

// Перевод градусов в радианы
const deg2rad = (deg) => {
  return deg * (Math.PI / 180);
};

// Определение типа объекта по категории
const getTypeFromCategory = (category) => {
  if (!category) return 'place';
  
  switch (category.toLowerCase()) {
    case 'highway':
    case 'building':
    case 'place':
    case 'railway':
    case 'aeroway':
    case 'natural':
      return 'address';
    case 'amenity':
    case 'shop':
    case 'leisure':
    case 'tourism':
      return 'business';
    default:
      return 'place';
  }
};

// Обратное геокодирование (получение адреса по координатам)
export const reverseGeocode = async (latitude, longitude) => {
  try {
    const response = await axios.get(`${NOMINATIM_BASE_URL}/reverse`, {
      params: {
        lat: latitude,
        lon: longitude,
        format: 'json',
        addressdetails: 1,
      },
      headers: {
        'User-Agent': 'MapEase-App',
      },
    });

    return {
      id: response.data.place_id,
      name: response.data.display_name.split(',')[0],
      address: response.data.display_name,
      latitude: parseFloat(response.data.lat),
      longitude: parseFloat(response.data.lon),
    };
  } catch (error) {
    console.error('Ошибка при обратном геокодировании:', error);
    throw error;
  }
};

/**
 * Получение маршрута между двумя точками
 * 
 * @param {Object} origin - Координаты начальной точки {latitude, longitude}
 * @param {Object} destination - Координаты конечной точки {latitude, longitude}
 * @param {Array} waypoints - Массив путевых точек (опционально)
 * @param {String} mode - Режим перемещения (driving, walking, cycling, transit)
 * @param {AbortSignal} signal - Сигнал для отмены запроса
 * @param {Boolean} timeOnly - Запрашивать только время без полных координат маршрута
 * @returns {Promise<Object>} - Промис с данными маршрута
 */
export const fetchRouteDirections = async (
  origin,
  destination,
  waypoints = [],
  mode = 'DRIVING',
  signal
) => {
  try {
    console.log(`API: Запрос маршрута ${mode} от (${origin.latitude.toFixed(5)}, ${origin.longitude.toFixed(5)}) до (${destination.latitude.toFixed(5)}, ${destination.longitude.toFixed(5)})`);
    
    // Проверяем корректность входных данных
    if (!origin || !destination || !origin.latitude || !origin.longitude || !destination.latitude || !destination.longitude) {
      console.error('API: Некорректные координаты для запроса маршрута');
      return createFallbackRoute(origin, destination, mode);
    }

    // Проверяем наличие API ключа
    if (!OPEN_ROUTE_SERVICE_API_KEY) {
      console.error('API: Отсутствует ключ для OpenRouteService API');
      return createFallbackRoute(origin, destination, mode);
    }

    // Проверяем совпадение координат начала и конца
    if (origin.latitude === destination.latitude && origin.longitude === destination.longitude) {
      console.log('API: Начальная и конечная точки совпадают, возвращаем пустой маршрут');
      return {
        coordinates: [],
        distance: 0,
        duration: 0,
        isApproximate: true,
        mode
      };
    }

    // Преобразуем режим в понятный для API формат
    let apiMode;
    switch (mode) {
      case 'WALKING':
        apiMode = 'foot-walking';
        break;
      case 'BICYCLING':
        apiMode = 'cycling-regular';
        break;
      case 'TRANSIT':
        apiMode = 'driving-car'; // Меняем на driving-car, так как driving-bus не работает
        break;
      case 'DRIVING':
      default:
        apiMode = 'driving-car';
    }

    // URL для запроса
    const url = `https://api.openrouteservice.org/v2/directions/${apiMode}/geojson`;
    
    // Формируем координаты в формате [longitude, latitude]
    const coordinates = [
      [origin.longitude, origin.latitude],
      ...waypoints.map(wp => [wp.longitude, wp.latitude]),
      [destination.longitude, destination.latitude]
    ];
    
    // Параметры запроса в формате JSON
    const requestBody = {
      coordinates: coordinates,
      preference: mode === 'DRIVING' ? 'fastest' : 'recommended',
      units: 'km',
      language: 'ru-RU',
      instructions: false
    };

    console.log(`API: Отправка запроса для режима: ${apiMode}`);
    
    // Делаем запрос с ограничением по времени
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 секунд таймаут
    
    const localSignal = signal || controller.signal;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, application/geo+json, application/gpx+xml, img/png',
        'Authorization': OPEN_ROUTE_SERVICE_API_KEY
      },
      body: JSON.stringify(requestBody),
      signal: localSignal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API: Ошибка запроса маршрута ${mode}: ${response.status}`, errorText);
      return createFallbackRoute(origin, destination, mode);
    }
    
    const data = await response.json();
    console.log(`API: Получен ответ от сервера для маршрута ${mode}`);
    
    // Извлекаем необходимые данные из ответа
    if (data && data.features && data.features.length > 0) {
      const route = data.features[0];
      
      // Проверяем наличие геометрии
      if (!route.geometry || !route.geometry.coordinates || !Array.isArray(route.geometry.coordinates) || route.geometry.coordinates.length === 0) {
        console.error('API: Маршрут не содержит координат');
        return createFallbackRoute(origin, destination, mode);
      }
      
      // Получаем дистанцию маршрута в километрах и время в минутах
      let distance = 0;
      let duration = 0;
      
      if (route.properties && route.properties.summary) {
        distance = route.properties.summary.distance; 
        duration = route.properties.summary.duration / 60;
      } else {
        // Если нет summary, рассчитываем приблизительное расстояние
        distance = calculateDistance(
          origin.latitude, origin.longitude,
          destination.latitude, destination.longitude
        );
        
        // Приблизительное время исходя из скорости зависит от типа маршрута
        const speeds = {
          'DRIVING': 50, // км/ч
          'BICYCLING': 15,
          'WALKING': 5,
          'TRANSIT': 30
        };
        duration = (distance / speeds[mode]) * 60;
      }
      
      // Преобразуем координаты маршрута
      const coordinates = route.geometry.coordinates.map(coord => ({
        latitude: coord[1],
        longitude: coord[0]
      }));
      
      console.log(`API: Маршрут ${mode} получен успешно: ${coordinates.length} точек, ${distance.toFixed(1)} км, ${Math.round(duration)} мин`);
      
      return {
        coordinates,
        distance,
        duration,
        isApproximate: false,
        mode
      };
    } else {
      console.error('API: Ответ сервера не содержит нужных данных для маршрута');
      return createFallbackRoute(origin, destination, mode);
    }
    
  } catch (error) {
    // Проверяем, была ли отмена запроса
    if (error.name === 'AbortError') {
      console.log('API: Запрос маршрута был отменен');
    } else {
      console.error(`API: Ошибка запроса маршрута ${mode}:`, error);
    }
    
    // Вместо выбрасывания исключения, возвращаем резервный маршрут
    return createFallbackRoute(origin, destination, mode);
  }
};

// Функция для создания запасного маршрута по прямой
const createFallbackRoute = (origin, destination, mode) => {
  console.log('Создаем запасной маршрут по прямой');
  
  if (!origin || !destination) {
    return {
      coordinates: [],
      distance: 0,
      duration: 0,
      isApproximate: true,
      mode
    };
  }
  
  // Создаем прямую линию с несколькими промежуточными точками
  const numPoints = 5;
  const coordinates = [];
  
  for (let i = 0; i <= numPoints; i++) {
    const fraction = i / numPoints;
    coordinates.push({
      latitude: origin.latitude + fraction * (destination.latitude - origin.latitude),
      longitude: origin.longitude + fraction * (destination.longitude - origin.longitude)
    });
  }
  
  // Рассчитываем примерное расстояние по прямой
  const distance = calculateDistance(
    origin.latitude, origin.longitude,
    destination.latitude, destination.longitude
  );
  
  // Примерное время в минутах зависит от типа транспорта
  const speeds = {
    'DRIVING': 50, // км/ч
    'BICYCLING': 15,
    'WALKING': 5,
    'TRANSIT': 30
  };
  
  const speed = speeds[mode] || 50;
  const duration = (distance / speed) * 60; // минуты
  
  return {
    coordinates,
    distance,
    duration,
    isApproximate: true,
    mode
  };
};

// Экспортируем все API функции
export default {
  searchPlaces,
  reverseGeocode,
  fetchRouteDirections,
};
