// Сервисы для поиска мест в MapEase
import axios from 'axios';
import { NOMINATIM_BASE_URL, API_CONFIG } from './apiConfig';
import { calculateDistance, getTypeFromCategory } from './apiUtils';

/**
 * Поиск мест по запросу с учетом местоположения пользователя
 * @param {String} query - Поисковый запрос
 * @param {Number} limit - Максимальное количество результатов
 * @param {Object} userLocation - Местоположение пользователя {latitude, longitude}
 * @returns {Promise<Array>} - Промис с массивом найденных мест
 */
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
        headers: API_CONFIG.headers,
        signal: controller.signal,
        timeout: API_CONFIG.timeout
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

/**
 * Локальный поиск для приоритизации ближайших результатов
 * @param {String} query - Поисковый запрос
 * @param {Number} limit - Максимальное количество результатов
 * @param {Object} userLocation - Местоположение пользователя {latitude, longitude}
 * @returns {Promise<Array>} - Промис с массивом найденных мест
 */
export const searchLocalPlaces = async (query, limit = 10, userLocation = null) => {
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
      headers: API_CONFIG.headers,
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

/**
 * Резервный метод поиска (более простой запрос)
 * @param {String} query - Поисковый запрос
 * @param {Number} limit - Максимальное количество результатов
 * @param {Object} userLocation - Местоположение пользователя {latitude, longitude}
 * @returns {Promise<Array>} - Промис с массивом найденных мест
 */
export const searchByNameWithFallback = async (query, limit = 10, userLocation = null) => {
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
      headers: API_CONFIG.headers,
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

/**
 * Обратное геокодирование (получение адреса по координатам)
 * @param {Number} latitude - Широта
 * @param {Number} longitude - Долгота
 * @returns {Promise<Object>} - Промис с информацией о месте
 */
export const reverseGeocode = async (latitude, longitude) => {
  try {
    const response = await axios.get(`${NOMINATIM_BASE_URL}/reverse`, {
      params: {
        lat: latitude,
        lon: longitude,
        format: 'json',
        addressdetails: 1,
      },
      headers: API_CONFIG.headers,
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
