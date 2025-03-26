// API сервисы для MapEase
import axios from 'axios';
import { OPEN_ROUTE_SERVICE_API_KEY } from '../constants/apiKeys';

// Базовый URL для Nominatim API (OpenStreetMap)
const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';

// Поиск мест по запросу с учетом местоположения пользователя
const searchPlaces = async (query, limit = 50, userLocation = null) => {
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

export {
  searchPlaces,
  searchLocalPlaces,
  searchByNameWithFallback,
  getTypeFromCategory
};
