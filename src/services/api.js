// API сервисы для MapEase
import axios from 'axios';
import { OPEN_ROUTE_SERVICE_API_KEY } from '../constants/apiKeys';

// Базовый URL для Nominatim API (OpenStreetMap)
const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';

// Поиск мест по запросу с учетом местоположения пользователя
export const searchPlaces = async (query, limit = 50, userLocation = null) => {
  try {
    console.log(`Отправляем запрос поиска: ${query} с лимитом ${limit}${userLocation ? ' и учетом местоположения' : ''}`);
    
    // Добавляем таймаут для обеспечения завершения запроса
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // Увеличиваем таймаут до 10 секунд
    
    // Массив для хранения всех результатов
    let allResults = [];
    
    try {
      // Сначала пробуем локальный поиск, если есть местоположение пользователя
      if (userLocation && userLocation.latitude && userLocation.longitude) {
        console.log(`Локальный поиск для: ${query}`);
        const localResults = await searchLocalPlaces(query, limit, userLocation);
        
        if (localResults && localResults.length > 0) {
          // Помечаем результаты как локальные для сортировки
          localResults.forEach(result => {
            result.isLocal = true;
          });
          
          allResults = [...localResults];
          console.log(`API: Получено ${localResults.length} результатов локального поиска`);
        }
      }
      
      // Затем делаем глобальный поиск
      console.log(`API: Поиск "${query}" по всему миру`);
      
      // Базовые параметры запроса
      const params = {
        q: query,
        format: 'json',
        'accept-language': 'ru,en',
        addressdetails: 1,
        limit: Math.min(limit * 3, 100), // Увеличиваем лимит для получения большего количества результатов
        dedupe: 1, // Удаление дубликатов
        polygon_geojson: 0, // Отключаем геометрию для ускорения
        extratags: 1, // Дополнительные теги
        namedetails: 1, // Детали названий
        'email': 'contact@mapease.app' // Добавляем email для соблюдения условий использования API
      };
      
      // Если передано местоположение, используем его для точки отсчета
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
        signal: controller.signal,
        timeout: 10000 // Увеличиваем таймаут до 10 секунд
      });
      
      clearTimeout(timeoutId);
      
      if (response.data.length === 0) {
        console.log(`API: Нет результатов глобального поиска для "${query}"`);
        return allResults; // Возвращаем только локальные результаты, если есть
      }
      
      console.log(`API: Получено ${response.data.length} результатов глобального поиска`);
      
      // Преобразуем результаты в нужный формат
      const globalResults = response.data.map((item) => ({
        id: item.place_id,
        name: item.namedetails?.name || item.display_name.split(',')[0],
        address: item.display_name,
        latitude: parseFloat(item.lat),
        longitude: parseFloat(item.lon),
        type: getTypeFromCategory(item.class),
        importance: parseFloat(item.importance || 0),
        isLocal: false // Помечаем как не локальные
      }));
      
      // Объединяем результаты, удаляя дубликаты по id
      const combinedResults = [...allResults];
      
      globalResults.forEach(globalItem => {
        // Проверяем, есть ли уже такой элемент в результатах
        const existingIndex = combinedResults.findIndex(item => item.id === globalItem.id);
        
        if (existingIndex === -1) {
          combinedResults.push(globalItem);
        }
      });
      
      allResults = combinedResults;
    } catch (error) {
      console.error('Ошибка при локальном поиске:', error);
      // Если произошла ошибка, пробуем резервный метод
      try {
        const fallbackResults = await searchByNameWithFallback(query, limit, userLocation);
        if (fallbackResults && fallbackResults.length > 0) {
          return fallbackResults;
        }
      } catch (fallbackError) {
        console.error('Ошибка при резервном поиске:', fallbackError);
      }
    }
    
    // Если есть местоположение пользователя, рассчитываем расстояние
    if (userLocation && userLocation.latitude && userLocation.longitude) {
      allResults.forEach(result => {
        if (result.latitude && result.longitude) {
          result.distance = calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            result.latitude,
            result.longitude
          );
        }
      });
    }
    
    // Сортируем результаты: сначала локальные, затем по расстоянию, затем по важности
    allResults.sort((a, b) => {
      // Сначала приоритет локальным результатам
      if (a.isLocal && !b.isLocal) return -1;
      if (!a.isLocal && b.isLocal) return 1;
      
      // Затем по расстоянию, если оно есть
      if (a.distance && b.distance) {
        return a.distance - b.distance;
      }
      
      // Если нет расстояния, то по важности
      return (b.importance || 0) - (a.importance || 0);
    });
    
    console.log(`Получено ${allResults.length} результатов поиска`);
    
    return allResults;
  } catch (error) {
    console.error('Ошибка при поиске мест:', error);
    throw error;
  }
};

// Локальный поиск для приоритизации ближайших результатов
const searchLocalPlaces = async (query, limit = 10, userLocation = null) => {
  try {
    if (!userLocation) return [];
    
    console.log(`Локальный поиск для: ${query}`);
    
    // Рассчитываем более широкий viewbox (примерно 20-30 км)
    const viewboxSize = 0.3; // ~30 км в каждую сторону
    
    const params = {
      q: query,
      format: 'json',
      'accept-language': 'ru,en',
      addressdetails: 1,
      limit: Math.min(limit * 2, 30),
      viewbox: `${userLocation.longitude - viewboxSize},${userLocation.latitude - viewboxSize},${userLocation.longitude + viewboxSize},${userLocation.latitude + viewboxSize}`,
      bounded: 1, // Ограничиваем поиск в пределах viewbox
      dedupe: 1, // Удаляем дубликаты
      namedetails: 1
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
      name: item.namedetails?.name || item.display_name.split(',')[0],
      address: item.display_name,
      latitude: parseFloat(item.lat),
      longitude: parseFloat(item.lon),
      type: getTypeFromCategory(item.class),
      isGlobal: false // Флаг локального результата
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

// Функция для имитации данных о пробках на участках маршрута
// В реальном приложении здесь был бы запрос к сервису пробок
export const getTrafficData = (coordinates, mode) => {
  // Для режимов кроме DRIVING не учитываем пробки
  if (mode !== 'DRIVING' || !coordinates || coordinates.length < 2) {
    return coordinates.map(() => 0); // Нет пробок
  }
  
  console.log(`API: Генерация данных о пробках для маршрута с ${coordinates.length} точками`);
  
  // Создаем массив с данными о пробках для каждого сегмента маршрута
  // 0 - нет пробок, 10 - максимальные пробки
  const trafficData = [];
  
  // Вычисляем базовую нагрузку для всего маршрута
  // (чем ближе к центру, тем вероятнее пробки)
  const centerIndex = Math.floor(coordinates.length / 2);
  
  for (let i = 0; i < coordinates.length - 1; i++) {
    const point = coordinates[i];
    
    // Генерируем значение пробок в зависимости от положения сегмента на маршруте
    // Ближе к центру маршрута - вероятнее пробки
    const distanceFromCenter = Math.abs(i - centerIndex) / centerIndex;
    
    // Вычисляем базовое значение трафика - на краях маршрута меньше, в середине больше
    let trafficValue = 10 * (1 - distanceFromCenter * 0.7);
    
    // Добавляем немного случайности (±30%)
    const randomFactor = 0.7 + Math.random() * 0.6; // 0.7 - 1.3
    trafficValue *= randomFactor;
    
    // Ограничиваем значение от 0 до 10
    trafficValue = Math.min(10, Math.max(0, trafficValue));
    
    // Округляем до целого
    trafficData.push(Math.round(trafficValue));
  }
  
  // Добавляем последнее значение, чтобы длина совпадала с количеством координат
  trafficData.push(trafficData[trafficData.length - 1] || 0);
  
  console.log(`API: Сгенерированы данные о пробках, диапазон: ${Math.min(...trafficData)}-${Math.max(...trafficData)}`);
  
  return trafficData;
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
    
    // Добавляем механизм повторных попыток
    let retries = 2;
    let response;
    let lastError;
    
    while (retries >= 0) {
      try {
        response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json, application/geo+json, application/gpx+xml, img/png',
            'Authorization': OPEN_ROUTE_SERVICE_API_KEY
          },
          body: JSON.stringify(requestBody),
          signal: localSignal
        });
        
        if (response.ok) {
          break; // Успешный ответ, выходим из цикла
        } else if (response.status === 503) {
          // Сервис временно недоступен, пробуем еще раз после паузы
          lastError = `Сервис временно недоступен (503): ${await response.text()}`;
          console.warn(`API: Сервис временно недоступен, осталось попыток: ${retries}`);
          if (retries > 0) {
            await new Promise(resolve => setTimeout(resolve, 1000)); // Пауза 1 секунда
          }
        } else {
          // Другая ошибка, не пытаемся повторить
          lastError = `Ошибка ${response.status}: ${await response.text()}`;
          break;
        }
      } catch (fetchError) {
        lastError = fetchError.message;
        if (fetchError.name !== 'AbortError') {
          console.error(`API: Ошибка при выполнении запроса: ${fetchError.message}`);
        } else {
          break; // Запрос был отменен, не пытаемся повторить
        }
      }
      
      retries--;
    }
    
    clearTimeout(timeoutId);
    
    // Если после всех попыток нет успешного ответа
    if (!response || !response.ok) {
      console.error(`API: Ошибка запроса маршрута ${mode}: ${lastError}`);
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
      
      // Получаем данные о пробках для каждого сегмента маршрута
      const trafficData = getTrafficData(coordinates, mode);
      
      console.log(`API: Маршрут ${mode} получен успешно: ${coordinates.length} точек, ${distance.toFixed(1)} км, ${Math.round(duration)} мин`);
      
      return {
        coordinates,
        distance,
        duration,
        isApproximate: false,
        mode,
        trafficData,
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
      mode,
      trafficData: []
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
  
  // Если это маршрут для автомобиля, создаем данные о пробках
  // Простой вариант - низкая загруженность в начале и конце, выше в середине
  let trafficData = [];
  if (mode === 'DRIVING') {
    trafficData = coordinates.map((_, index) => {
      // Создаем имитацию пробок - больше всего в середине маршрута
      const normalizedPosition = index / coordinates.length;
      const distanceFromCenter = Math.abs(normalizedPosition - 0.5) * 2;  // 0 в центре, 1 на краях
      const trafficValue = Math.round(8 - 8 * distanceFromCenter);  // От 0 до 8 баллов
      return trafficValue;
    });
  } else {
    // Для других режимов пробок нет
    trafficData = coordinates.map(() => 0);
  }
  
  return {
    coordinates,
    distance,
    duration,
    isApproximate: true,
    mode,
    trafficData
  };
};

// Экспортируем все API функции
export default {
  searchPlaces,
  searchLocalPlaces,
  searchByNameWithFallback,
  getTypeFromCategory,
  reverseGeocode,
  getTrafficData,
  fetchRouteDirections,
};
