// Сервисы для работы с маршрутами в MapEase
import { OPEN_ROUTE_SERVICE_API_KEY } from '../constants/apiKeys';
import { calculateDistance } from './apiUtils';
import { TRAVEL_SPEEDS, getApiMode } from './apiConfig';

/**
 * Функция для имитации данных о пробках на участках маршрута
 * В реальном приложении здесь был бы запрос к сервису пробок
 * @param {Array} coordinates - Массив координат маршрута
 * @param {String} mode - Режим передвижения
 * @returns {Array} - Массив значений пробок для каждого сегмента маршрута
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
    const apiMode = getApiMode(mode);

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
        duration = (distance / TRAVEL_SPEEDS[mode]) * 60;
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

/**
 * Функция для создания запасного маршрута по прямой
 * @param {Object} origin - Начальная точка {latitude, longitude}
 * @param {Object} destination - Конечная точка {latitude, longitude}
 * @param {String} mode - Режим передвижения
 * @returns {Object} - Объект с данными маршрута
 */
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
  const speed = TRAVEL_SPEEDS[mode] || 50;
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
