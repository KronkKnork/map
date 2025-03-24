import { nominatimApi } from './apiClient';

/**
 * Сервис для работы с геолокацией и поиском мест
 */
const LocationService = {
  /**
   * Поиск места по запросу
   * @param {string} query - Текстовый запрос для поиска
   * @param {number} limit - Количество результатов
   * @returns {Promise} - Результаты поиска
   */
  searchPlaces: async (query, limit = 10) => {
    try {
      const response = await nominatimApi.get('/search', {
        params: {
          q: query,
          limit,
          addressdetails: 1,
        },
      });
      
      // Преобразуем полученные данные в удобный формат
      return response.data.map(item => ({
        id: item.place_id,
        name: item.display_name.split(',')[0],
        fullName: item.display_name,
        location: {
          latitude: parseFloat(item.lat),
          longitude: parseFloat(item.lon),
        },
        address: item.address,
        type: item.type,
        category: item.class,
        importance: item.importance,
      }));
    } catch (error) {
      console.error('Error searching places:', error);
      throw error;
    }
  },
  
  /**
   * Получение информации о месте по координатам (обратное геокодирование)
   * @param {number} latitude - Широта
   * @param {number} longitude - Долгота
   * @returns {Promise} - Информация о месте
   */
  reverseGeocode: async (latitude, longitude) => {
    try {
      const response = await nominatimApi.get('/reverse', {
        params: {
          lat: latitude,
          lon: longitude,
          addressdetails: 1,
          zoom: 18,
        },
      });
      
      const data = response.data;
      
      return {
        id: data.place_id,
        name: data.name || (data.address ? data.address.road || data.address.suburb || data.address.city || data.address.town : 'Неизвестное место'),
        fullName: data.display_name,
        location: {
          latitude: parseFloat(data.lat),
          longitude: parseFloat(data.lon),
        },
        address: data.address,
        type: data.type,
        category: data.category,
      };
    } catch (error) {
      console.error('Error in reverse geocoding:', error);
      throw error;
    }
  },
  
  /**
   * Поиск точек интереса (POI) вблизи координат
   * @param {number} latitude - Широта центра поиска
   * @param {number} longitude - Долгота центра поиска
   * @param {string} category - Категория мест (restaurant, hotel, atm, etc.)
   * @param {number} radius - Радиус поиска в метрах
   * @param {number} limit - Количество результатов
   * @returns {Promise} - Список найденных мест
   */
  findNearbyPOI: async (latitude, longitude, category = '', radius = 1000, limit = 10) => {
    try {
      // Строим запрос для Overpass API (более мощный для поиска POI чем Nominatim)
      const bbox = [
        longitude - 0.01, // левая граница
        latitude - 0.01,  // нижняя граница
        longitude + 0.01, // правая граница
        latitude + 0.01,  // верхняя граница
      ];
      
      // Примечание: для реального приложения лучше использовать Overpass API
      // Здесь используем упрощенный подход с Nominatim
      
      let query = category ? `[tourism=${category}]` : '';
      if (!query) {
        query = 'restaurant|cafe|hotel|museum|attraction|shop';
      }
      
      const response = await nominatimApi.get('/search', {
        params: {
          q: query,
          viewbox: bbox.join(','),
          bounded: 1,
          limit,
          addressdetails: 1,
        },
      });
      
      // Преобразуем данные
      return response.data.map(item => {
        // Рассчитываем приблизительное расстояние (упрощенный расчет)
        const itemLat = parseFloat(item.lat);
        const itemLon = parseFloat(item.lon);
        const distance = Math.sqrt(
          Math.pow((itemLat - latitude) * 111000, 2) + 
          Math.pow((itemLon - longitude) * 111000 * Math.cos(latitude * Math.PI / 180), 2)
        );
        
        return {
          id: item.place_id,
          name: item.display_name.split(',')[0],
          fullName: item.display_name,
          location: {
            latitude: itemLat,
            longitude: itemLon,
          },
          address: item.address,
          type: item.type,
          category: item.class,
          distance: Math.round(distance), // округляем до метров
        };
      }).sort((a, b) => a.distance - b.distance); // Сортируем по расстоянию
    } catch (error) {
      console.error('Error finding nearby POI:', error);
      throw error;
    }
  },
};

export default LocationService;
