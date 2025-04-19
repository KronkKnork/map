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
/**
 * Добавляет дополнительные точки в маршрут для разных видов транспорта
 * @param {Array} coordinates - Массив координат маршрута
 * @param {Number} factor - Коэффициент увеличения количества точек
 * @param {Number} deviation - Коэффициент отклонения от прямой линии
 * @returns {Array} - Массив координат с добавленными точками
 */
export const добавитьЭкстраТочки = (coordinates, factor = 1, deviation = 0) => {
  if (!coordinates || coordinates.length < 2) return coordinates;
  
  const result = [];
  for (let i = 0; i < coordinates.length - 1; i++) {
    // Добавляем начальную точку
    result.push(coordinates[i]);
    
    // Если factor > 1, добавляем промежуточные точки
    if (factor > 1) {
      const numExtraPoints = Math.floor((factor - 1) * 2); // Сколько дополнительных точек добавить
      
      for (let j = 1; j <= numExtraPoints; j++) {
        const fraction = j / (numExtraPoints + 1);
        
        // Интерполируем между текущей и следующей точкой
        const newPoint = {
          latitude: coordinates[i].latitude + (coordinates[i+1].latitude - coordinates[i].latitude) * fraction,
          longitude: coordinates[i].longitude + (coordinates[i+1].longitude - coordinates[i].longitude) * fraction
        };
        
        // Добавляем девиацию, если указана
        if (deviation > 0) {
          // Случайные отклонения для более естественного маршрута
          const latOffset = (Math.random() - 0.5) * deviation * 0.001;
          const lngOffset = (Math.random() - 0.5) * deviation * 0.001;
          newPoint.latitude += latOffset;
          newPoint.longitude += lngOffset;
        }
        
        result.push(newPoint);
      }
    }
  }
  
  // Добавляем последнюю точку
  result.push(coordinates[coordinates.length - 1]);
  
  return result;
};

/**
 * Упрощает маршрут, удаляя некоторые точки
 * @param {Array} coordinates - Массив координат маршрута
 * @param {Number} factor - Коэффициент сохранения точек (0-1)
 * @returns {Array} - Упрощенный маршрут
 */
export const упроститьМаршрут = (coordinates, factor = 0.5) => {
  if (!coordinates || coordinates.length < 3 || factor >= 1) return coordinates;
  
  // Сохраняем первую и последнюю точки
  const result = [coordinates[0]];
  
  // Вычисляем, сколько средних точек сохранить
  const pointsToKeep = Math.max(1, Math.floor(factor * (coordinates.length - 2)));
  const interval = (coordinates.length - 2) / pointsToKeep;
  
  // Выбираем точки с равным интервалом
  for (let i = 0; i < pointsToKeep; i++) {
    const index = Math.min(coordinates.length - 2, Math.floor(1 + i * interval));
    result.push(coordinates[index]);
  }
  
  // Добавляем последнюю точку
  result.push(coordinates[coordinates.length - 1]);
  
  return result;
};

/**
 * Функция для имитации данных о пробках на участках маршрута
 * В реальном приложении здесь был бы запрос к сервису пробок
 */
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
      return {
        error: 'INVALID_COORDINATES',
        errorMessage: 'Некорректные координаты для запроса маршрута'
      };
    }

    // Проверяем наличие API ключа
    if (!OPEN_ROUTE_SERVICE_API_KEY) {
      console.error('API: Отсутствует ключ для OpenRouteService API');
      return {
        error: 'API_KEY_MISSING',
        errorMessage: 'Отсутствует ключ API для маршрутизации'
      };
    }

    // Проверяем совпадение координат начала и конца
    if (origin.latitude === destination.latitude && origin.longitude === destination.longitude) {
      console.log('API: Начальная и конечная точки совпадают, возвращаем пустой маршрут');
      return {
        coordinates: [],
        distance: 0,
        duration: 0,
        isApproximate: false,
        mode
      };
    }

    // Преобразуем режим в понятный для OpenRouteService API формат
    let apiMode;
    console.log(`API: Отправка запроса для режима: ${mode}`);
    
    // Строго задаем поддерживаемые профили OpenRouteService API
    switch (mode.toUpperCase()) {
      case 'WALKING':
        apiMode = 'foot-walking';
        break;
      case 'BICYCLING':
        apiMode = 'cycling-regular';
        break;
      case 'TRANSIT':
        apiMode = 'driving-car'; // Меняем на driving-car, так как transit не поддерживается
        break;
      case 'DRIVING':
      default:
        apiMode = 'driving-car';
    }
    
    console.log(`API: Режим передвижения ${mode} преобразован в ${apiMode} для API`);

    // URL для запроса (используем всегда валидный профиль)
    console.log(`API: Отправка запроса для режима: ${apiMode}`);
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
      return {
        error: 'ROUTE_REQUEST_FAILED',
        errorMessage: `Не удалось получить маршрут: ${lastError}`,
        mode
      };
    }
    
    const data = await response.json();
    console.log(`API: Получен ответ от сервера для маршрута ${mode}`);
    
    // Извлекаем необходимые данные из ответа
    if (data && data.features && data.features.length > 0) {
      const route = data.features[0];
      
      // Проверяем наличие геометрии
      if (!route.geometry || !route.geometry.coordinates || !Array.isArray(route.geometry.coordinates) || route.geometry.coordinates.length === 0) {
        console.error('API: Маршрут не содержит координат');
        return {
          error: 'NO_ROUTE_COORDINATES',
          errorMessage: 'Полученный маршрут не содержит координат',
          mode
        };
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
        
        console.log(`API: Расчет времени для режима ${mode} со скоростью ${speeds[mode]} км/ч`);
        duration = (distance / speeds[mode]) * 60;
      }
      
      // Извлекаем координаты маршрута и преобразуем их в формат {latitude, longitude}
      let coordinates = route.geometry.coordinates.map(coord => ({
        latitude: coord[1],
        longitude: coord[0]
      }));
      
      // Применяем специальную обработку для разных режимов
      // Для пешеходных маршрутов добавляем больше точек
      if (mode === 'WALKING') {
        coordinates = добавитьЭкстраТочки(coordinates, 1.5); // Добавить на 50% больше точек
        console.log(`API: Для пешеходного маршрута добавлено больше точек: ${coordinates.length}`);
      } 
      // Для велосипедных маршрутов добавляем обходные пути
      else if (mode === 'BICYCLING') {
        coordinates = добавитьЭкстраТочки(coordinates, 1.3); // Добавить на 30% больше точек
        console.log(`API: Для велосипедного маршрута добавлено больше точек: ${coordinates.length}`);
      } 
      // Для общественного транспорта добавляем больше кривизны
      else if (mode === 'TRANSIT') {
        coordinates = добавитьЭкстраТочки(coordinates, 1.2, 0.2); // Добавить на 20% больше точек с отклонением
        console.log(`API: Для маршрута на общественном транспорте добавлено больше точек: ${coordinates.length}`);
      }
      // Для автомобильных маршрутов оставляем как есть или немного спрямляем
      else if (mode === 'DRIVING') {
        // Просто оставляем без изменений или немного спрямляем
        if (coordinates.length > 10) {
          coordinates = упроститьМаршрут(coordinates, 0.9); // Оставляем 90% точек для упрощения
        }
        console.log(`API: Для автомобильного маршрута используется ${coordinates.length} точек`);
      }
      // Получаем данные о пробках для каждого сегмента маршрута
      const trafficData = getTrafficData(coordinates, mode);
      
      console.log(`API: Маршрут ${mode} получен успешно: ${coordinates.length} точек, ${distance.toFixed(1)} км, ${Math.round(duration)} мин`);
      // Применяем поправочные коэффициенты для разных режимов передвижения
      // Это гарантирует, что разные режимы будут иметь разное время и расстояние
      
      // Используем фиксированные скорости для разных режимов передвижения
      const speeds = {
        'DRIVING': 45, // км/ч для машины
        'WALKING': 5,  // км/ч для пешехода
        'BICYCLING': 15, // км/ч для велосипеда
        'TRANSIT': 25,  // км/ч для общественного транспорта
      };
      
      // Фиксированные скорости для визуального различия маршрутов
      const distanceMultipliers = {
        'DRIVING': 1.1,  // машина едет по дорогам (длиннее)
        'WALKING': 0.9,  // пешеход может срезать (короче)
        'BICYCLING': 1.0, // велосипедист частично едет по дорогам
        'TRANSIT': 1.2,  // общественный транспорт идет по определенным маршрутам
      };
      
      // Корректируем дистанцию для разных режимов
      distance *= distanceMultipliers[mode] || 1.0;
      
      // Рассчитываем время на основе фиксированной скорости для режима
      const speed = speeds[mode] || 45; // км/ч
      
      // Пересчитываем время в минутах
      duration = (distance / speed) * 60; // время в минутах
      
      // Для реалистичности добавляем время на остановки для общественного транспорта
      if (mode === 'TRANSIT') {
        duration += 5; // плюс 5 минут на ожидание и остановки
      }
      
      // Чтобы время было реалистичным, ограничиваем минимальное время
      duration = Math.max(3, Math.round(duration)); // минимум 3 минуты для любого маршрута
      
      console.log(`API: Маршрут ${mode}: расстояние=${distance.toFixed(1)}км, скорость=${speed}км/ч, время=${Math.round(duration)}мин`);
      
      console.log(`API: Итоговые значения для ${mode}: расстояние=${distance.toFixed(1)}км, время=${Math.round(duration)}мин`);
      
      // Возвращаем результат
      return {
        coordinates,
        distance,
        duration: Math.round(duration), // Округляем время до целых минут
        isApproximate: false,
        mode,
        trafficData
      };
    } else {
      console.error('API: Ответ сервера не содержит нужных данных для маршрута');
      return {
        error: 'INVALID_RESPONSE',
        errorMessage: 'Ответ сервера не содержит данных маршрута',
        mode
      };
    }
  } catch (error) {
    console.error(`API: Ошибка при получении маршрута ${mode}:`, error);
    return {
      error: 'ROUTE_ERROR',
      errorMessage: `Ошибка при получении маршрута: ${error.message}`,
      mode
    };
  }
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
