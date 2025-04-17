import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Platform, ToastAndroid } from 'react-native';
import axios from 'axios';
import { observer } from 'mobx-react-lite';
import { useStore } from '../../stores/StoreContext';
import { Polyline, Marker } from 'react-native-maps';
import { fetchRouteDirections } from '../../services/api';
import { theme } from '../../theme';
import { MaterialIcons } from '@expo/vector-icons';
import AndroidRouteView from './AndroidRouteView';

// Минимальный интервал между запросами (в мс)
const MIN_REQUEST_INTERVAL = 1000;

// Алиас для useStore для совместимости
const useStores = useStore;

// Конвертация градусов в радианы
const deg2rad = (deg) => {
  return deg * (Math.PI/180);
};

// Функция для расчета прямого расстояния между двумя точками (формула Haversine)
const calculateDistance = (pointA, pointB) => {
  if (!pointA || !pointB) return 0;
  
  const R = 6371; // Радиус Земли в километрах
  const dLat = deg2rad(pointB.latitude - pointA.latitude);
  const dLon = deg2rad(pointB.longitude - pointA.longitude);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(pointA.latitude)) * Math.cos(deg2rad(pointB.latitude)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c; // Расстояние в километрах
  return distance;
};

// Компонент для аннотации времени на маршруте (со стрелкой)
const RouteAnnotation = ({ coordinate, duration, isApproximate, mode }) => {
  // Убедимся, что координаты валидны
  if (!coordinate || typeof coordinate.latitude !== 'number' || typeof coordinate.longitude !== 'number' ||
      isNaN(coordinate.latitude) || isNaN(coordinate.longitude)) {
    console.log('RouteAnnotation: невалидные координаты для аннотации', coordinate);
    return null;
  }

  // Форматируем время
  const formattedTime = () => {
    if (!duration && duration !== 0) return 'н/д';
    
    if (duration < 1) {
      return '< 1 мин';
    }
    
    const hours = Math.floor(duration / 60);
    const minutes = Math.round(duration % 60);
    
    if (hours > 0) {
      return `${hours} ч ${minutes > 0 ? minutes + ' мин' : ''}`;
    }
    
    return `${minutes} мин`;
  };
  
  // Определяем цвет в зависимости от режима
  const getColor = () => {
    if (mode === 'DRIVING') {
      // Для авто используем зависимость от времени
      if (duration < 10) {
        return theme.colors.trafficFree;
      } else if (duration < 20) {
        return theme.colors.trafficModerate;
      } else if (duration < 40) {
        return theme.colors.trafficHeavy;
      } else {
        return theme.colors.trafficSevere;
      }
    }
    return theme.colors.routeWalk || theme.colors.primary; // Для других типов - синий
  };
  
  const color = getColor();
  
  // Смещаем аннотацию в сторону от маршрута (чтобы не перекрывать)
  // Используем безопасные значения и меньшее смещение
  const offsetCoordinate = {
    latitude: coordinate.latitude + 0.0008,
    longitude: coordinate.longitude + 0.001, // смещаем правее
  };
  
  return (
    <>
      {/* Маркер аннотации не на маршруте, а сбоку */}
      <Marker
        coordinate={offsetCoordinate}
        anchor={{ x: 0.5, y: 0.5 }}
        tracksViewChanges={false}
      >
        <View style={styles.annotationContainer}>
          <Text style={[styles.annotationText, { color }]}>
            {formattedTime()}
            {isApproximate ? '*' : ''}
          </Text>
        </View>
      </Marker>
      
      {/* Используем безопасное создание массива для линии */}
      <Polyline
        coordinates={[offsetCoordinate, coordinate]}
        strokeColor={color}
        strokeWidth={1.5}
        lineDashPattern={[1, 2]}
        zIndex={2}
      />
      
      {/* Точка на маршруте, куда указывает стрелка */}
      <Marker
        coordinate={coordinate}
        anchor={{ x: 0.5, y: 0.5 }}
        tracksViewChanges={false}
      >
        <View style={[styles.routePoint, { backgroundColor: color }]} />
      </Marker>
    </>
  );
};

/**
 * Компонент для построения маршрута на карте
 * 
 * @param {Object} origin - Координаты начальной точки
 * @param {Object} destination - Координаты конечной точки
 * @param {Array} waypoints - Массив путевых точек (опционально)
 * @param {String} mode - Режим маршрута (DRIVING, WALKING, BICYCLING, TRANSIT)
 * @param {Function} onRouteReady - Колбэк, вызываемый при получении маршрута
 * @param {String} strokeColor - Цвет линии маршрута
 * @param {Number} strokeWidth - Толщина линии маршрута
 * @param {Boolean} showMarkers - Показывать ли маркеры начала и конца маршрута
 */
const RouteDirections = ({
  origin,
  destination,
  waypoints,
  mode = 'DRIVING',
  onRouteReady,
  strokeColor,
  strokeWidth = 5,
  showMarkers = false,
}) => {
  const [coordinates, setCoordinates] = useState([]);
  const [routeInfo, setRouteInfo] = useState(null);
  const [trafficData, setTrafficData] = useState([]);
  const abortControllerRef = useRef(null);
  const timerRef = useRef(null);
  const lastRequestParamsRef = useRef('');
  const routeFetchedRef = useRef(false);
  const isMountedRef = useRef(true);
  const lastRequestTimeRef = useRef(0);
  const initializedRef = useRef(false);
  const activeRequestRef = useRef(false); // Новая ссылка для отслеживания активного запроса
  
  // Используем mapStore для работы с кэшем маршрутов и отслеживания запросов
  
  // Максимальный размер кэша
  const MAX_CACHE_SIZE = 40;
  
  // Используем mapStore для работы с флагом блокировки API и другими данными
  
  // Получаем доступ к хранилищу в основной функции компонента
  // Используем безопасный доступ к хранилищу
  const rootStore = useStores ? useStores() : null;
  const mapStore = rootStore ? rootStore.mapStore : null;
  
  // Очистить запрос из списка активных
  const clearRequestFromCurrent = useCallback((requestParams) => {
    // Проверяем, что mapStore существует
    if (mapStore) {
      // Удаляем запрос из списка активных
      mapStore.removeRouteRequest(requestParams);
    }
    
    // Сбрасываем флаг активного запроса
    activeRequestRef.current = false;
  }, [mapStore]);
  
  // Функция для проверки возможности выполнения нового запроса
  const canMakeNewRequest = useCallback(() => {
    // Проверяем, что mapStore существует
    return mapStore ? mapStore.canMakeRouteRequest() : false;
  }, [mapStore]);
  
  // Функция для кэширования маршрута
  const cacheRoute = useCallback((requestParams, routeData) => {
    // Проверяем, что mapStore существует
    if (!mapStore) return;
    
    try {
      // Сохраняем маршрут в кэше
      mapStore.cacheRoute(requestParams, routeData);
    } catch (cacheError) {
      console.error('Ошибка при кэшировании маршрута:', cacheError);
    }
  }, [mapStore]);
  
  // Функция для получения маршрута из кэша
  const getCachedRoute = useCallback((requestParams) => {
    // Проверяем, что mapStore существует
    return mapStore ? mapStore.getCachedRoute(requestParams) : null;
  }, [mapStore]);
  
  // Функция для проверки блокировки API
  const isApiBlocked = useCallback(() => {
    // Проверяем, что mapStore существует
    return mapStore ? mapStore.isApiBlocked : false;
  }, [mapStore]);
  
  // Безопасное обновление состояния только если компонент смонтирован
  const safeSetState = useCallback((setter, value) => {
    if (isMountedRef.current) {
      try {
        setter(value);
      } catch (error) {
        console.error('Ошибка при обновлении состояния:', error);
      }
    }
  }, []);
  
  // Функция для получения цвета в зависимости от трафика (от 0 до 10)
  const getTrafficColor = useCallback((trafficValue) => {
    if (typeof trafficValue !== 'number' || trafficValue < 0) {
      return theme.colors.trafficFree;
    }
    
    // Пороговые значения для определения цвета
    if (trafficValue <= 2) {
      return theme.colors.trafficFree; // Зеленый - свободно
    } else if (trafficValue <= 5) {
      return theme.colors.trafficModerate; // Желтый - умеренно
    } else if (trafficValue <= 8) {
      return theme.colors.trafficHeavy; // Оранжевый - затруднено
    } else {
      return theme.colors.trafficSevere; // Красный - сильно затруднено
    }
  }, []);
  
  // Получаем толщину линии в зависимости от типа маршрута
  const getRouteWidth = useCallback(() => {
    if (strokeWidth !== 5) return strokeWidth;
    
    switch (mode) {
      case 'WALKING':
        return 4; // Тоньше для пешеходных маршрутов
      case 'BICYCLING':
        return 4;
      case 'TRANSIT':
        return 5; // Толще для транспорта
      case 'DRIVING':
      default:
        return 5;
    }
  }, [mode, strokeWidth]);
  
  // Получаем стиль линии в зависимости от типа маршрута
  const getRouteLinePattern = useCallback(() => {
    switch (mode) {
      case 'WALKING':
        return null; // [5, 5] Пунктирная линия для пешеходного маршрута
      case 'BICYCLING':
        return null; // Штрих-пунктирная линия
      case 'TRANSIT':
        return null; // Сплошная для транспорта
      case 'DRIVING':
      default:
        return null; // Сплошная линия для авто
    }
  }, [mode]);
  
  // Получаем цвет маршрута в зависимости от типа
  const getRouteColor = useCallback(() => {
    if (strokeColor) return strokeColor;
    
    switch (mode) {
      case 'WALKING':
      case 'BICYCLING':
        return theme.colors.routeWalk || theme.colors.primary; // Синий для пешеходных и велосипедных маршрутов
      case 'TRANSIT':
        return theme.colors.routeTransit || '#673ab7'; // Фиолетовый для общественного транспорта
      case 'DRIVING':
      default:
        return theme.colors.primary; // Основной цвет для авто
    }
  }, [mode, strokeColor]);
  
  // Определяем, нужна ли обводка для маршрута
  const getRouteStrokeStyle = useCallback(() => {
    // Для всех типов маршрутов добавляем белую обводку
    return {
      strokeColor: getRouteColor(),
      strokeWidth: getRouteWidth(),
      lineDashPattern: getRouteLinePattern(),
      zIndex: 1,
      lineJoin: 'round',
      lineCap: 'round',
    };
  }, [getRouteColor, getRouteWidth, getRouteLinePattern]);
  
  // Разделяем маршрут на сегменты с разными цветами для пробок
  const renderTrafficSegments = useCallback(() => {
    if (!coordinates || coordinates.length < 2) {
      return null;
    }
    
    // Если это не автомобильный маршрут или нет данных о пробках, рисуем обычную линию
    if (mode !== 'DRIVING' || !trafficData || trafficData.length === 0) {
      const routeStyle = getRouteStrokeStyle();
      
      // Для всех типов маршрутов добавляем белую обводку
      return (
        <>
          {/* Белая обводка под маршрутом */}
          <Polyline
            coordinates={coordinates}
            strokeColor="white"
            strokeWidth={routeStyle.strokeWidth + 3}
            lineDashPattern={routeStyle.lineDashPattern}
            zIndex={routeStyle.zIndex - 1}
            lineJoin={routeStyle.lineJoin}
            lineCap={routeStyle.lineCap}
          />
          {/* Основной маршрут */}
          <Polyline
            coordinates={coordinates}
            strokeColor={routeStyle.strokeColor}
            strokeWidth={routeStyle.strokeWidth}
            lineDashPattern={routeStyle.lineDashPattern}
            zIndex={routeStyle.zIndex}
            lineJoin={routeStyle.lineJoin}
            lineCap={routeStyle.lineCap}
          />
        </>
      );
    }
    
    // Создаем сегменты маршрута с разными цветами для пробок
    const segments = [];
    
    // Сначала рисуем белую обводку для всего маршрута
    segments.push(
      <Polyline
        key="route-outline"
        coordinates={coordinates}
        strokeColor="white"
        strokeWidth={getRouteWidth() + 3}
        zIndex={0}
        lineJoin="round"
        lineCap="round"
      />
    );
    
    // Затем рисуем сегменты с цветами пробок
    for (let i = 0; i < coordinates.length - 1; i++) {
      const segmentCoords = [coordinates[i], coordinates[i+1]];
      const trafficValue = trafficData[i] || 0;
      const segmentColor = getTrafficColor(trafficValue);
      
      segments.push(
        <Polyline
          key={`segment-${i}`}
          coordinates={segmentCoords}
          strokeColor={segmentColor}
          strokeWidth={getRouteWidth()}
          lineDashPattern={getRouteLinePattern()}
          zIndex={1}
          lineJoin="round"
          lineCap="round"
        />
      );
    }
    
    return segments;
  }, [coordinates, trafficData, mode, getRouteWidth, getRouteLinePattern, getTrafficColor, getRouteStrokeStyle]);
  
  // Функция для проверки валидности координат
  const areValidCoordinates = useCallback((coords) => {
    return (
      coords && 
      typeof coords === 'object' &&
      typeof coords.latitude === 'number' && 
      typeof coords.longitude === 'number' && 
      !isNaN(coords.latitude) && 
      !isNaN(coords.longitude) &&
      coords.latitude >= -90 && coords.latitude <= 90 &&
      coords.longitude >= -180 && coords.longitude <= 180
    );
  }, []);
  
  // Проверяем валидность координат
  if (!areValidCoordinates(origin) || !areValidCoordinates(destination)) {
    console.log('RouteDirections: невалидные координаты', { origin, destination });
    safeSetState(setCoordinates, []);
    safeSetState(setRouteInfo, null);
    safeSetState(setTrafficData, []);
    
    if (onRouteReady && typeof onRouteReady === 'function') {
      try {
        onRouteReady({
          coordinates: [],
          distance: 0,
          duration: 0,
          isApproximate: true,
          mode: mode,
          error: "INVALID_COORDINATES"
        });
      } catch (callbackError) {
        console.error('Ошибка при вызове onRouteReady:', callbackError);
      }
    }
    return;
  }
  
  // Проверяем, что начальная и конечная точки не совпадают
  const isSameLocation = 
    Math.abs(origin.latitude - destination.latitude) < 0.0000001 && 
    Math.abs(origin.longitude - destination.longitude) < 0.0000001;
  
  if (isSameLocation) {
    console.log('RouteDirections: начальная и конечная точки маршрута совпадают');
    safeSetState(setCoordinates, []);
    safeSetState(setRouteInfo, null);
    safeSetState(setTrafficData, []);
    
    if (onRouteReady && typeof onRouteReady === 'function') {
      try {
        onRouteReady({
          coordinates: [],
          distance: 0,
          duration: 0,
          isApproximate: true,
          mode: mode,
          error: "SAME_COORDINATES"
        });
      } catch (callbackError) {
        console.error('Ошибка при вызове onRouteReady:', callbackError);
      }
    }
    return;
  }
  
  // Добавляем задержку перед запросом маршрута
  // Это поможет избежать слишком частых запросов и прерываний
  const requestDelay = 500; // 500 мс задержка
  
  // Формируем строку с параметрами запроса для кэширования и проверки
  let requestParams;
  try {
    requestParams = JSON.stringify({
      originLat: origin.latitude.toFixed(6),
      originLng: origin.longitude.toFixed(6),
      destLat: destination.latitude.toFixed(6),
      destLng: destination.longitude.toFixed(6),
      mode: mode,
    });
  } catch (error) {
    console.error('Ошибка при формировании параметров запроса:', error);
    return;
  }
  
  // Используем задержку перед запросом маршрута
  // Это позволит избежать слишком частых запросов и прерываний
  if (timerRef.current) {
    clearTimeout(timerRef.current);
  }
  
  // Проверяем, выполняется ли уже запрос с такими же параметрами
  if (window.currentRouteRequests && window.currentRouteRequests.has(requestParams)) {
    console.log(`RouteDirections: запрос с параметрами ${requestParams} уже выполняется`);
    return;
  }
  
  // Проверяем, есть ли уже активный запрос для этого компонента
  if (activeRequestRef.current) {
    console.log('RouteDirections: уже есть активный запрос, отменяем его');
    if (abortControllerRef.current) {
      try {
        abortControllerRef.current.abort();
      } catch (abortError) {
        console.error('Ошибка при отмене предыдущего запроса:', abortError);
      }
    }
  }
  
  // Значительно увеличиваем задержку перед запросом маршрута для избежания частых отмен
  const delayTime = Platform.OS === 'android' ? 3000 : requestDelay; // Увеличиваем задержку для Android до 3 секунд
  
  // Добавляем дополнительную проверку для Android, чтобы избежать слишком частых запросов
  if (Platform.OS === 'android') {
    // Проверяем, что координаты не слишком близко друг к другу
    const distance = calculateDistance(
      { latitude: origin.latitude, longitude: origin.longitude },
      { latitude: destination.latitude, longitude: destination.longitude }
    );
    
    // Если расстояние меньше 100 метров, не строим маршрут
    if (distance < 0.1) { // 0.1 км = 100 метров
      console.log(`RouteDirections: расстояние слишком маленькое (${distance.toFixed(2)} км), пропускаем запрос`);
      return;
    }
  }
  
  // Используем таймер для запроса маршрута
  timerRef.current = setTimeout(() => {
    if (!isMountedRef.current) return;
    
    // Устанавливаем флаг активного запроса
    activeRequestRef.current = true;
    
    // Проверяем, что mapStore существует
    if (!mapStore) {
      console.log('RouteDirections: mapStore не инициализирован');
      activeRequestRef.current = false;
      return;
    }
    
    // Проверяем, можно ли выполнить запрос
    if (!mapStore.canMakeRouteRequest()) {
      console.log(`RouteDirections: слишком частые запросы, пропускаем`);
      activeRequestRef.current = false;
      return;
    }
    
    // Обновляем время последнего запроса
    mapStore.updateLastRequestTime();
    lastRequestTimeRef.current = Date.now();
    
    // Проверяем кэш маршрутов
    const cachedData = mapStore.getCachedRoute(requestParams);
    if (cachedData) {
      console.log(`RouteDirections: используем кэшированный маршрут для режима ${mode}`);
      
      try {
        safeSetState(setCoordinates, cachedData.coordinates || []);
        safeSetState(setRouteInfo, {
          distance: cachedData.distance || 0,
          duration: cachedData.duration || 0,
          isApproximate: cachedData.isApproximate || false
        });
        
        if (cachedData.trafficData) {
          safeSetState(setTrafficData, cachedData.trafficData || []);
        }
        
        if (onRouteReady && typeof onRouteReady === 'function' && isMountedRef.current) {
          try {
            onRouteReady({
              coordinates: cachedData.coordinates || [],
              distance: cachedData.distance || 0,
              duration: cachedData.duration || 0,
              isApproximate: cachedData.isApproximate || false,
              mode: mode,
              trafficData: cachedData.trafficData || []
            });
          } catch (callbackError) {
            console.error('Ошибка при вызове onRouteReady с кэшированными данными:', callbackError);
          }
        }
        
        activeRequestRef.current = false;
        return;
      } catch (cacheError) {
        console.error('Ошибка при использовании кэшированных данных:', cacheError);
        // Продолжаем выполнение и запрашиваем маршрут заново
      }
    }
  }, delayTime);
  
  // Если параметры не изменились с момента последнего запроса, не делаем новый запрос
  if (requestParams === lastRequestParamsRef.current && routeFetchedRef.current) {
    console.log('RouteDirections: параметры запроса не изменились, пропускаем повторный запрос');
    activeRequestRef.current = false;
    return;
  }
  
  // Проверяем блокировку API
  if (mapStore.isApiBlocked) {
    console.log('RouteDirections: API заблокирован из-за предыдущих ошибок');
    
    if (onRouteReady && typeof onRouteReady === 'function') {
      try {
        onRouteReady({
          coordinates: [],
          distance: 0,
          duration: 0,
          error: 'Сервис маршрутов временно недоступен'
        });
      } catch (callbackError) {
        console.error('Ошибка при вызове onRouteReady:', callbackError);
      }
    }
    
    activeRequestRef.current = false;
    return;
  }
  
  // Обновляем ссылку на параметры последнего запроса
  lastRequestParamsRef.current = requestParams;
  
  // Используем глобальные функции deg2rad и calculateDistance
  
  // Функция для построения маршрута на Android
  const requestAndroidRoute = useCallback((type, originToUse, destinationToUse) => {
    console.log('RouteDirections: запуск упрощенного механизма для Android, тип: ' + type);
    
    // Отменяем все предыдущие запросы
    if (abortControllerRef.current) {
      try {
        abortControllerRef.current.abort();
      } catch (error) {
        // Игнорируем ошибки отмены
      }
    }
    
    // Создаем новый контроллер
    abortControllerRef.current = new AbortController();
    
    try {
      // Рассчитываем прямое расстояние между точками
      const distance = calculateDistance(originToUse, destinationToUse);
      
      // Разная скорость для разных типов маршрутов
      let speed = 0.5; // По умолчанию 30 км/ч или 0.5 км/мин
      
      if (type === 'WALKING') {
        speed = 0.12; // Примерно 5 км/ч или 0.08 км/мин
      } else if (type === 'BICYCLING') {
        speed = 0.25; // Примерно 15 км/ч или 0.25 км/мин
      } else if (type === 'TRANSIT') {
        speed = 0.7; // Примерно 40 км/ч или 0.7 км/мин
      }
      
      const duration = Math.max(1, Math.round(distance / speed));
      
      // Создаем прямой маршрут
      const coordinates = [
        { latitude: originToUse.latitude, longitude: originToUse.longitude },
        { latitude: destinationToUse.latitude, longitude: destinationToUse.longitude }
      ];
      
      // Очищаем предыдущие состояния перед установкой новых
      safeSetState(setCoordinates, []);
      safeSetState(setRouteInfo, null);
      safeSetState(setTrafficData, []);
      
      // Добавляем небольшую задержку перед обновлением состояния
      setTimeout(() => {
        if (!isMountedRef.current) return;
        
        // Обновляем состояние
        safeSetState(setCoordinates, coordinates);
        safeSetState(setRouteInfo, {
          distance: distance,
          duration: duration,
          isApproximate: true,
          mode: type
        });
        
        // Кэшируем маршрут
        try {
          const requestParams = JSON.stringify({
            originLat: originToUse.latitude.toFixed(6),
            originLng: originToUse.longitude.toFixed(6),
            destLat: destinationToUse.latitude.toFixed(6),
            destLng: destinationToUse.longitude.toFixed(6),
            mode: type
          });
          
          const routeData = {
            coordinates: coordinates,
            distance: distance,
            duration: duration,
            isApproximate: true,
            mode: type
          };
          
          // Сохраняем в кэше
          cacheRoute(requestParams, routeData);
          
          // Уведомляем о готовности маршрута
          if (onRouteReady && typeof onRouteReady === 'function' && isMountedRef.current) {
            onRouteReady({
              coordinates: coordinates,
              distance: distance,
              duration: duration,
              isApproximate: true,
              mode: type
            });
          }
          
          // Отмечаем, что маршрут получен
          routeFetchedRef.current = true;
          activeRequestRef.current = false;
        } catch (cacheError) {
          console.error('Ошибка при кэшировании Android маршрута:', cacheError);
        }
      }, 100);
    } catch (error) {
      console.error('Ошибка при построении маршрута на Android:', error);
      activeRequestRef.current = false;
    }
  }, [safeSetState, setCoordinates, setRouteInfo, onRouteReady, cacheRoute]);
  
  // Функция для запроса маршрута определенного типа
  const requestRouteForType = useCallback(async (type, customOrigin = null, customDestination = null) => {
    // Проверяем, что компонент смонтирован
    if (!isMountedRef.current || !initializedRef.current) return;
    
    // Проверяем валидность координат
    const originToUse = customOrigin || origin;
    const destinationToUse = customDestination || destination;
    
    if (!areValidCoordinates(originToUse) || !areValidCoordinates(destinationToUse)) {
      console.log('RouteDirections: невалидные координаты для маршрута');
      return;
    }
    
    // Проверяем, что точки не совпадают
    if (originToUse.latitude === destinationToUse.latitude && 
        originToUse.longitude === destinationToUse.longitude) {
      console.log('RouteDirections: начальная и конечная точки совпадают');
      return;
    }
    
    // Для Android используем упрощенный механизм построения маршрута
    if (Platform.OS === 'android') {
      console.log('RouteDirections: используем упрощенный механизм для Android');
      return requestAndroidRoute(type, originToUse, destinationToUse);
    }
    
    // Добавляем задержку перед запросом маршрута
    // Это поможет избежать слишком частых запросов и прерываний
    const requestDelay = 500; // 500 мс задержка
    
    // Формируем строку с параметрами запроса для кэширования и проверки
    let requestParams;
    try {
      requestParams = JSON.stringify({
        originLat: origin.latitude.toFixed(6),
        originLng: origin.longitude.toFixed(6),
        destLat: destination.latitude.toFixed(6),
        destLng: destination.longitude.toFixed(6),
        mode: mode,
      });
    } catch (error) {
      console.error('Ошибка при формировании параметров запроса:', error);
      return;
    }
    
    // Используем задержку перед запросом маршрута
    // Это позволит избежать слишком частых запросов и прерываний
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    
    // Проверяем, выполняется ли уже запрос с такими же параметрами
    if (window.currentRouteRequests && window.currentRouteRequests.has(requestParams)) {
      console.log(`RouteDirections: запрос с параметрами ${requestParams} уже выполняется`);
      return;
    }
    
    // Проверяем, есть ли уже активный запрос для этого компонента
    if (activeRequestRef.current) {
      console.log('RouteDirections: уже есть активный запрос, отменяем его');
      if (abortControllerRef.current) {
        try {
          abortControllerRef.current.abort();
        } catch (abortError) {
          console.error('Ошибка при отмене предыдущего запроса:', abortError);
        }
      }
    }
    
    // Значительно увеличиваем задержку перед запросом маршрута для избежания частых отмен
    const delayTime = Platform.OS === 'android' ? 3000 : requestDelay; // Увеличиваем задержку для Android до 3 секунд
    
    // Добавляем дополнительную проверку для Android, чтобы избежать слишком частых запросов
    if (Platform.OS === 'android') {
      // Проверяем, что координаты не слишком близко друг к другу
      const distance = calculateDistance(
        { latitude: origin.latitude, longitude: origin.longitude },
        { latitude: destination.latitude, longitude: destination.longitude }
      );
      
      // Если расстояние меньше 100 метров, не строим маршрут
      if (distance < 0.1) { // 0.1 км = 100 метров
        console.log(`RouteDirections: расстояние слишком маленькое (${distance.toFixed(2)} км), пропускаем запрос`);
        return;
      }
    }
    
    // Используем таймер для запроса маршрута
    timerRef.current = setTimeout(() => {
      if (!isMountedRef.current) return;
      
      // Устанавливаем флаг активного запроса
      activeRequestRef.current = true;
      
      // Проверяем, что mapStore существует
      if (!mapStore) {
        console.log('RouteDirections: mapStore не инициализирован');
        activeRequestRef.current = false;
        return;
      }
      
      // Проверяем, можно ли выполнить запрос
      if (!mapStore.canMakeRouteRequest()) {
        console.log(`RouteDirections: слишком частые запросы, пропускаем`);
        activeRequestRef.current = false;
        return;
      }
      
      // Обновляем время последнего запроса
      mapStore.updateLastRequestTime();
      lastRequestTimeRef.current = Date.now();
      
      // Проверяем кэш маршрутов
      const cachedData = mapStore.getCachedRoute(requestParams);
      if (cachedData) {
        console.log(`RouteDirections: используем кэшированный маршрут для режима ${mode}`);
        
        try {
          safeSetState(setCoordinates, cachedData.coordinates || []);
          safeSetState(setRouteInfo, {
            distance: cachedData.distance || 0,
            duration: cachedData.duration || 0,
            isApproximate: cachedData.isApproximate || false
          });
          
          if (cachedData.trafficData) {
            safeSetState(setTrafficData, cachedData.trafficData || []);
          }
          
          if (onRouteReady && typeof onRouteReady === 'function' && isMountedRef.current) {
            try {
              onRouteReady({
                coordinates: cachedData.coordinates || [],
                distance: cachedData.distance || 0,
                duration: cachedData.duration || 0,
                isApproximate: cachedData.isApproximate || false,
                mode: mode,
                trafficData: cachedData.trafficData || []
              });
            } catch (callbackError) {
              console.error('Ошибка при вызове onRouteReady с кэшированными данными:', callbackError);
            }
          }
          
          activeRequestRef.current = false;
          return;
        } catch (cacheError) {
          console.error('Ошибка при использовании кэшированных данных:', cacheError);
          // Продолжаем выполнение и запрашиваем маршрут заново
        }
      }
    }, delayTime);
    
    // Если параметры не изменились с момента последнего запроса, не делаем новый запрос
    if (requestParams === lastRequestParamsRef.current && routeFetchedRef.current) {
      console.log('RouteDirections: параметры запроса не изменились, пропускаем повторный запрос');
      activeRequestRef.current = false;
      return;
    }
    
    // Проверяем блокировку API
    if (mapStore.isApiBlocked) {
      console.log('RouteDirections: API заблокирован из-за предыдущих ошибок');
      
      if (onRouteReady && typeof onRouteReady === 'function') {
        try {
          onRouteReady({
            coordinates: [],
            distance: 0,
            duration: 0,
            error: 'Сервис маршрутов временно недоступен'
          });
        } catch (callbackError) {
          console.error('Ошибка при вызове onRouteReady:', callbackError);
        }
      }
      
      activeRequestRef.current = false;
      return;
    }
    
    // Обновляем ссылку на параметры последнего запроса
    lastRequestParamsRef.current = requestParams;
    
    // Добавляем запрос в список активных
    mapStore.addRouteRequest(requestParams);
    
    console.log(`RouteDirections: запрашиваем маршрут для режима ${mode}`);
    
    // На Android не используем отмену запросов - мы используем упрощенный механизм в requestAndroidRoute
    if (Platform.OS === 'android') {
      console.log('RouteDirections: на Android не используем отмену запросов');
      // Просто создаем новый контроллер без отмены предыдущего
      abortControllerRef.current = new AbortController();
      return;
    }
    
    // На iOS отменяем предыдущий запрос
    if (abortControllerRef.current) {
      try {
        abortControllerRef.current.abort();
      } catch (abortError) {
        console.error('Ошибка при отмене предыдущего запроса:', abortError);
      }
    }
    
    // Создаем новый контроллер отмены
    try {
      abortControllerRef.current = new AbortController();
      // Добавляем метку времени для отслеживания
      abortControllerRef.current.timestamp = Date.now();
      abortControllerRef.current.isOutdated = false;
    } catch (controllerError) {
      console.error('Ошибка при создании AbortController:', controllerError);
      activeRequestRef.current = false;
      clearRequestFromCurrent(requestParams);
      return;
    }
    
    // Устанавливаем таймаут для запроса (10 секунд максимум)
    let timeoutId;
    try {
      timeoutId = setTimeout(() => {
        if (abortControllerRef.current) {
          console.log('RouteDirections: превышено время ожидания запроса, отмена');
          try {
            abortControllerRef.current.abort();
          } catch (abortError) {
            console.error('Ошибка при отмене запроса по таймауту:', abortError);
          }
          clearRequestFromCurrent(requestParams);
          activeRequestRef.current = false;
        }
      }, 10000);
    } catch (timeoutError) {
      console.error('Ошибка при установке таймаута:', timeoutError);
      timeoutId = null;
    }
    
    // Запрашиваем маршрут
    fetchRouteDirections(origin, destination, waypoints, mode, abortControllerRef.current.signal)
      .then(result => {
        // Очищаем таймаут
        if (timeoutId) {
          try {
            clearTimeout(timeoutId);
          } catch (clearError) {
            console.error('Ошибка при очистке таймаута:', clearError);
          }
        }
        
        // Удаляем запрос из списка активных
        clearRequestFromCurrent(requestParams);
        
        // Проверяем монтирование компонента
        if (!isMountedRef.current) {
          console.log('RouteDirections: компонент размонтирован, пропускаем обработку результата');
          return;
        }
        
        // На Android проверяем, что это не устаревший запрос
        if (Platform.OS === 'android') {
          // На Android мы используем упрощенный механизм, поэтому пропускаем все ответы API
          console.log('RouteDirections: на Android игнорируем ответ API, используем упрощенный механизм');
          return;
        }
        
        // Проверяем ошибку API
        if (result && result.error === "API_ACCESS_DENIED") {
          console.error('RouteDirections: API недоступен (отказ в доступе)');
          
          // Устанавливаем глобальный флаг блокировки API
          window.mapEaseApiBlocked = true;
          
          // Очищаем данные
          safeSetState(setCoordinates, []);
          safeSetState(setRouteInfo, null);
          safeSetState(setTrafficData, []);
          
          // Уведомляем родительский компонент
          if (onRouteReady && typeof onRouteReady === 'function' && isMountedRef.current) {
            try {
              onRouteReady({
                coordinates: [],
                distance: 0,
                duration: 0,
                isApproximate: true,
                mode: mode,
                error: "API_ACCESS_DENIED"
              });
            } catch (callbackError) {
              console.error('Ошибка при вызове onRouteReady с ошибкой доступа к API:', callbackError);
            }
          }
          return;
        }
        
        // Проверяем успешность результата
        if (result && result.coordinates && Array.isArray(result.coordinates) && result.coordinates.length > 0) {
          console.log(`RouteDirections: получен маршрут для режима ${mode}: ${result.coordinates.length} точек`);
          
          // Отмечаем успешное получение маршрута
          routeFetchedRef.current = true;
          
          // Сбрасываем флаг блокировки API
          window.mapEaseApiBlocked = false;
          
          // Кэшируем результат
          if (window.routeRequestsCache) {
            try {
              window.routeRequestsCache[requestParams] = {
                ...result,
                timestamp: Date.now()
              };
              
              // Очищаем старые записи кэша
              const cacheKeys = Object.keys(window.routeRequestsCache);
              if (cacheKeys.length > MAX_CACHE_SIZE) {
                const sortedKeys = cacheKeys.sort((a, b) => {
                  return (window.routeRequestsCache[a].timestamp || 0) - (window.routeRequestsCache[b].timestamp || 0);
                });
                
                // Удаляем самые старые записи
                const keysToDelete = sortedKeys.slice(0, cacheKeys.length - MAX_CACHE_SIZE);
                keysToDelete.forEach(key => {
                  delete window.routeRequestsCache[key];
                });
              }
            } catch (cacheError) {
              console.error('Ошибка при кэшировании результата:', cacheError);
            }
          }
          
          // Обновляем состояние
          safeSetState(setCoordinates, result.coordinates);
          safeSetState(setRouteInfo, {
            distance: result.distance || 0,
            duration: result.duration || 0,
            isApproximate: result.isApproximate || false
          });
          
          // Обновляем данные о трафике
          if (result.trafficData && Array.isArray(result.trafficData)) {
            safeSetState(setTrafficData, result.trafficData);
          } else {
            safeSetState(setTrafficData, []);
          }
          
          // Уведомляем родительский компонент
          if (onRouteReady && typeof onRouteReady === 'function' && isMountedRef.current) {
            try {
              onRouteReady({
                coordinates: result.coordinates,
                distance: result.distance || 0,
                duration: result.duration || 0,
                isApproximate: result.isApproximate || false,
                mode: mode,
                trafficData: result.trafficData || []
              });
            } catch (callbackError) {
              console.error('Ошибка при вызове onRouteReady с успешным результатом:', callbackError);
            }
          }
        } else {
          console.log('RouteDirections: получен пустой результат');
          
          // Очищаем данные
          safeSetState(setCoordinates, []);
          safeSetState(setRouteInfo, null);
          safeSetState(setTrafficData, []);
          
          // Уведомляем родительский компонент
          if (onRouteReady && typeof onRouteReady === 'function' && isMountedRef.current) {
            try {
              onRouteReady({
                coordinates: [],
                distance: 0,
                duration: 0,
                isApproximate: true,
                mode: mode,
                error: "EMPTY_RESPONSE"
              });
            } catch (callbackError) {
              console.error('Ошибка при вызове onRouteReady с пустым результатом:', callbackError);
            }
          }
        }
      })
      .catch(error => {
        // Очищаем таймаут
        if (timeoutId) {
          try {
            clearTimeout(timeoutId);
          } catch (clearError) {
            console.error('Ошибка при очистке таймаута в catch:', clearError);
          }
        }
        
        // Удаляем запрос из списка активных
        clearRequestFromCurrent(requestParams);
        
        // Проверяем монтирование компонента
        if (!isMountedRef.current) return;
        
        // Если ошибка не связана с отменой запроса
        if (error.name !== 'AbortError') {
          console.error('RouteDirections: ошибка при получении маршрута:', error);
          
          // Очищаем данные
          safeSetState(setCoordinates, []);
          safeSetState(setRouteInfo, null);
          safeSetState(setTrafficData, []);
          
          // Уведомляем родительский компонент
          if (onRouteReady && typeof onRouteReady === 'function' && isMountedRef.current) {
            try {
              onRouteReady({
                coordinates: [],
                distance: 0,
                duration: 0,
                isApproximate: true,
                mode: mode,
                error: "REQUEST_ERROR"
              });
            } catch (callbackError) {
              console.error('Ошибка при вызове onRouteReady с ошибкой запроса:', callbackError);
            }
          }
        }
      });
    
    // Очистка при размонтировании
    return () => {
      // Удаляем запрос из списка активных
      clearRequestFromCurrent(requestParams);
      
      // Размонтируем компонент
      isMountedRef.current = false;
      
      // Отменяем запрос
      if (abortControllerRef.current) {
        try {
          abortControllerRef.current.abort();
        } catch (abortError) {
          console.error('Ошибка при отмене запроса при размонтировании:', abortError);
        }
      }
      
      // Очищаем таймеры
      if (timerRef.current) {
        try {
          clearTimeout(timerRef.current);
        } catch (clearError) {
          console.error('Ошибка при очистке timerRef:', clearError);
        }
      }
      
      // Очищаем таймаут запроса
      if (timeoutId) {
        try {
          clearTimeout(timeoutId);
        } catch (clearError) {
          console.error('Ошибка при очистке timeoutId при размонтировании:', clearError);
        }
      }
      
      // Сбрасываем флаг активного запроса
      activeRequestRef.current = false;
    };
  }, [origin, destination, mode, waypoints, onRouteReady, areValidCoordinates, safeSetState, clearRequestFromCurrent]);
  
  // Эффект для размонтирования компонента
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        try {
          abortControllerRef.current.abort();
        } catch (abortError) {
          console.error('Ошибка при отмене запроса в эффекте размонтирования:', abortError);
        }
      }
      activeRequestRef.current = false;
    };
  }, []);
  
  // Используем функцию calculateDistance для аннотаций
  
  // Находим точку для размещения аннотации (около середины маршрута)
  const getAnnotationCoordinate = useCallback(() => {
    if (!coordinates || coordinates.length < 3) return null;
    
    // Проверка координат
    for (let i = 0; i < Math.min(coordinates.length, 100); i++) {
      const coord = coordinates[i];
      if (!areValidCoordinates(coord)) {
        console.log(`RouteDirections: некорректные координаты в позиции ${i}`);
        return null;
      }
    }
    
    // Берем точку примерно на 40% пути
    const index = Math.floor(coordinates.length * 0.4);
    if (index >= 0 && index < coordinates.length) {
      return coordinates[index];
    }
    
    return null;
  }, [coordinates]);

  // Проверка на наличие данных маршрута
  if (!coordinates || coordinates.length === 0) {
    return null;
  }

  try {
    // Получаем текущий цвет и ширину линии
    const currentColor = strokeColor || theme.colors.primary;
    const currentWidth = getRouteWidth();
    const linePattern = getRouteLinePattern();
    
    // Получаем координату для аннотации
    const annotationCoordinate = getAnnotationCoordinate();

    // Для Android используем специальный компонент
    if (Platform.OS === 'android') {
      return (
        <>
          <AndroidRouteView 
            coordinates={coordinates} 
            routeInfo={routeInfo} 
            mode={mode} 
            strokeColor={currentColor} 
            strokeWidth={currentWidth} 
          />
          
          {/* Аннотация с временем маршрута */}
          {routeInfo && annotationCoordinate && (
            <RouteAnnotation 
              coordinate={annotationCoordinate}
              duration={routeInfo.duration}
              isApproximate={routeInfo.isApproximate}
              mode={mode}
            />
          )}
        </>
      );
    }

    // Для iOS используем стандартный механизм
    return (
      <>
        {/* Рендерим маршрут в зависимости от наличия данных о пробках */}
        {mode === 'DRIVING' && trafficData.length > 0 ? 
          renderTrafficSegments() : 
          coordinates.length > 0 && renderTrafficSegments()
        }
        
        {/* Аннотация с временем маршрута */}
        {routeInfo && annotationCoordinate && (
          <RouteAnnotation 
            coordinate={annotationCoordinate}
            duration={routeInfo.duration}
            isApproximate={routeInfo.isApproximate}
            mode={mode}
          />
        )}
      </>
    );
  } catch (error) {
    console.error('RouteDirections: ошибка при рендеринге компонента:', error);
    return null;
  }
};

const styles = StyleSheet.create({
  annotationContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
    alignItems: 'center',
  },
  annotationText: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  routePoint: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: 'white',
  }
});

// Оборачиваем компонент в observer для корректной работы с MobX-стором
// observer уже включает в себя функциональность React.memo
export default observer(RouteDirections);
