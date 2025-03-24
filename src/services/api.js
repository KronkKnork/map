// API сервисы для MapEase
import axios from 'axios';

// Базовый URL для Nominatim API (OpenStreetMap)
const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';

// Поиск мест по запросу
export const searchPlaces = async (query, limit = 10) => {
  try {
    console.log(`Отправляем запрос поиска: ${query} с лимитом ${limit}`);
    
    // Добавляем таймаут для обеспечения завершения запроса
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 секунд таймаут
    
    const response = await axios.get(`${NOMINATIM_BASE_URL}/search`, {
      params: {
        q: query,
        format: 'json',
        addressdetails: 1,
        limit: limit,
        'accept-language': 'ru,en', // Предпочитаем русский язык в результатах
      },
      headers: {
        'User-Agent': 'MapEase-App/1.0',
        'Accept': 'application/json',
      },
      signal: controller.signal,
      timeout: 10000
    });
    
    clearTimeout(timeoutId);
    
    console.log(`Получено ${response.data.length} результатов поиска`);
    
    // Если нет результатов, попробуем другой запрос с расширенными параметрами
    if (response.data.length === 0) {
      return await searchByNameWithFallback(query, limit);
    }

    // Преобразуем данные в нужный формат
    return response.data.map((item) => ({
      id: item.place_id,
      name: item.display_name.split(',')[0],
      address: item.display_name,
      latitude: parseFloat(item.lat),
      longitude: parseFloat(item.lon),
      type: getTypeFromCategory(item.class),
    }));
  } catch (error) {
    // Если первый запрос завершился с ошибкой, попробуем альтернативный подход
    if (error.code === 'ECONNABORTED' || error.name === 'AbortError') {
      console.error('Таймаут запроса поиска, пробуем резервный метод:', error);
      return await searchByNameWithFallback(query, limit);
    }
    
    console.error('Ошибка при поиске мест:', error);
    throw error;
  }
};

// Резервный метод поиска
const searchByNameWithFallback = async (query, limit = 10) => {
  try {
    console.log(`Пробуем резервный метод поиска для: ${query}`);
    
    const response = await axios.get(`${NOMINATIM_BASE_URL}/search`, {
      params: {
        q: query,
        format: 'json',
        'accept-language': 'ru,en',
        addressdetails: 1,
        limit: Math.min(limit * 2, 50), // Увеличиваем лимит для резервного запроса
        namedetails: 1,
        extratags: 1
      },
      headers: {
        'User-Agent': 'MapEase-App/1.0',
        'Accept': 'application/json',
      },
      timeout: 15000
    });
    
    console.log(`Резервный метод вернул ${response.data.length} результатов`);
    
    if (response.data.length === 0) {
      // Если и это не помогло, возвращаем пустой массив
      return [];
    }
    
    return response.data.map((item) => ({
      id: item.place_id,
      name: item.namedetails?.name || item.display_name.split(',')[0],
      address: item.display_name,
      latitude: parseFloat(item.lat),
      longitude: parseFloat(item.lon),
      type: getTypeFromCategory(item.class),
    }));
  } catch (error) {
    console.error('Ошибка при резервном поиске:', error);
    return []; // Возвращаем пустой массив вместо ошибки
  }
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
export const fetchRouteDirections = async (origin, destination, waypoints = [], mode = 'driving', signal, timeOnly = false) => {
  try {
    // Преобразуем точки маршрута в массив координат
    const points = [
      [origin.longitude, origin.latitude],
      ...(waypoints.map(wp => [wp.longitude, wp.latitude]) || []),
      [destination.longitude, destination.latitude]
    ];
    
    // Определяем профиль маршрута в зависимости от режима
    let profile;
    switch (mode) {
      case 'walking':
        profile = 'foot';
        break;
      case 'cycling':
        profile = 'bike';
        break;
      case 'transit':
        profile = 'public_transport';
        break;
      case 'driving':
      default:
        profile = 'car';
        break;
    }
    
    console.log(`API запрос маршрута: режим ${mode}, профиль ${profile}${timeOnly ? ', только время' : ''}`);
    
    // Если нужно только время, используем минимальный набор параметров
    const parameters = timeOnly
      ? {
          overview: 'false', // Без общего обзора
          steps: false,      // Без шагов
          alternatives: false  // Без альтернативных маршрутов
        }
      : {
          overview: 'full',    // Полный обзор
          geometries: 'geojson',
          steps: true,        // С подробными шагами
          alternatives: mode === 'walking' || mode === 'driving' // Альтернативы только для ходьбы и авто
        };
    
    // Формируем URL запроса
    const requestBody = {
      coordinates: points,
      ...parameters
    };
    
    // Запрашиваем маршрут
    const response = await fetch(`https://routing.openstreetmap.de/routed-${profile}/route/v1/driving/${points.map(p => p.join(',')).join(';')}?overview=full&geometries=geojson&steps=true&alternatives=${parameters.alternatives}`, {
      method: 'GET',
      signal
    });
    
    if (!response.ok) {
      throw new Error(`Ошибка запроса маршрута: ${response.status}`);
    }
    
    const responseData = await response.json();
    
    // Проверяем наличие маршрутов в ответе
    if (!responseData.routes || responseData.routes.length === 0) {
      throw new Error('Нет доступных маршрутов');
    }
    
    // Выбираем лучший маршрут (для режима "пешком" выбираем самый короткий)
    let bestRoute;
    if (mode === 'walking' && responseData.routes.length > 1) {
      // Для пешеходов приоритет - кратчайший маршрут
      bestRoute = responseData.routes.reduce((prev, current) => 
        (prev.distance < current.distance) ? prev : current
      );
    } else {
      // Для остальных берем первый маршрут (обычно оптимальный)
      bestRoute = responseData.routes[0];
    }
    
    // Если запрос только на время, возвращаем минимальный набор данных
    if (timeOnly) {
      return {
        distance: bestRoute.distance / 1000, // метры в километры
        duration: bestRoute.duration / 60,   // секунды в минуты
        coordinates: [],  // Пустой массив координат
        isApproximate: false
      };
    }
    
    // Получаем координаты из геометрии маршрута
    const { coordinates } = bestRoute.geometry;
    
    // Проверяем наличие координат
    if (!coordinates || coordinates.length < 2) {
      throw new Error('Маршрут не содержит достаточно координат');
    }
    
    // Создаем массив точек в формате {latitude, longitude}
    const routeCoordinates = coordinates.map(coord => ({
      latitude: coord[1],
      longitude: coord[0]
    }));
    
    // Проверяем общую длину маршрута
    // Если маршрут слишком длинный относительно прямого расстояния (для пешеходов),
    // это может означать проблемы с данными OSM
    if (mode === 'walking') {
      const directDistance = calculateDirectDistance(origin, destination);
      const routeDistance = bestRoute.distance / 1000; // конвертируем в км
      
      // Если маршрут в 1.7 раза длиннее прямого пути, оптимизируем его
      if (routeDistance > directDistance * 1.7) {
        console.log(`API: пешеходный маршрут слишком длинный (${routeDistance.toFixed(1)}км vs ${directDistance.toFixed(1)}км прямого). Оптимизация.`);
        const optimizedRoute = optimizePedestrianRoute(origin, destination, routeCoordinates);
        
        return {
          coordinates: optimizedRoute,
          distance: directDistance * 1.3, // примерно 30% добавляем для реалистичности
          duration: (directDistance * 1.3) / 5 * 60, // среднее время ходьбы (5 км/ч)
          isApproximate: true
        };
      }
    }
    
    return {
      coordinates: routeCoordinates,
      distance: bestRoute.distance / 1000, // метры в километры
      duration: bestRoute.duration / 60,   // секунды в минуты
      isApproximate: false,
      mode: mode
    };
  } catch (error) {
    console.error('Ошибка при получении маршрута:', error);
    
    // Создаем резервный маршрут напрямую
    return createFallbackRoute(origin, destination, mode);
  }
};

// Создание запасного маршрута по прямой линии
const createFallbackRoute = (origin, destination, mode) => {
  console.log('Создаем запасной маршрут по прямой');
  
  // Рассчитываем прямое расстояние между точками
  const distance = calculateDirectDistance(
    origin.latitude, origin.longitude,
    destination.latitude, destination.longitude
  );
  
  // Рассчитываем примерное время в зависимости от режима
  let duration;
  let isApproximate = true;
  
  switch (mode) {
    case 'walking':
      // Средняя скорость ходьбы 5 км/ч
      duration = (distance / 5) * 60;
      break;
    case 'cycling':
      // Средняя скорость велосипеда 15 км/ч
      duration = (distance / 15) * 60;
      break;
    case 'transit':
      // Среднее для общественного транспорта 25 км/ч + время ожидания
      duration = (distance / 25) * 60 + 10;
      break;
    case 'driving':
    default:
      // Средняя скорость автомобиля 40 км/ч
      duration = (distance / 40) * 60;
      // Минимум 5 минут для авто
      if (duration < 5) duration = 5;
  }
  
  // Создаем координаты маршрута - прямая линия между точками
  // Для реалистичности добавляем несколько промежуточных точек
  const coordinates = [origin];
  
  // Добавляем промежуточные точки
  const numPoints = Math.max(2, Math.min(10, Math.ceil(distance * 5)));
  for (let i = 1; i < numPoints; i++) {
    const ratio = i / numPoints;
    
    const lat = origin.latitude + (destination.latitude - origin.latitude) * ratio;
    const lng = origin.longitude + (destination.longitude - origin.longitude) * ratio;
    
    coordinates.push({ latitude: lat, longitude: lng });
  }
  
  coordinates.push(destination);
  
  return {
    coordinates,
    distance,
    duration,
    isApproximate
  };
};

// Оптимизация пешеходного маршрута
const optimizePedestrianRoute = (origin, destination, routeCoordinates) => {
  console.log('Оптимизация пешеходного маршрута');
  
  // Если маршрут слишком длинный, пробуем создать более прямой путь
  const directDistance = calculateDirectDistance(
    origin.latitude, origin.longitude,
    destination.latitude, destination.longitude
  );
  
  // Приоритет отдаем началу и концу существующего маршрута
  const optimizedRoute = [routeCoordinates[0]];
  
  // Добавляем точки по прямой линии между началом и концом
  const numPoints = Math.min(10, Math.max(5, Math.ceil(directDistance * 2)));
  
  for (let i = 1; i < numPoints; i++) {
    const ratio = i / numPoints;
    
    // Интерполируем между начальной и конечной точкой
    const lat = origin.latitude + (destination.latitude - origin.latitude) * ratio;
    const lng = origin.longitude + (destination.longitude - origin.longitude) * ratio;
    
    optimizedRoute.push({ latitude: lat, longitude: lng });
  }
  
  // Добавляем оригинальную конечную точку
  optimizedRoute.push(routeCoordinates[routeCoordinates.length - 1]);
  
  return optimizedRoute;
};

// Расчет расстояния маршрута по координатам
const calculateRouteDistance = (coordinates) => {
  let totalDistance = 0;
  
  for (let i = 1; i < coordinates.length; i++) {
    const point1 = coordinates[i - 1];
    const point2 = coordinates[i];
    
    totalDistance += calculateDirectDistance(
      point1.latitude, point1.longitude,
      point2.latitude, point2.longitude
    );
  }
  
  return totalDistance;
};

// Расчет прямого расстояния между двумя точками (формула Haversine)
const calculateDirectDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Радиус Земли в километрах
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  return R * c; // Расстояние в километрах
};

// Конвертация градусов в радианы
const deg2rad = (deg) => {
  return deg * (Math.PI/180);
};

// Экспортируем все API функции
export default {
  searchPlaces,
  reverseGeocode,
  fetchRouteDirections,
};
