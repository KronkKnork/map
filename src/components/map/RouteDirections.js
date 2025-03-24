import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Polyline, Marker } from 'react-native-maps';
import { fetchRouteDirections } from '../../services/api';
import { theme } from '../../theme';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

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
  const abortControllerRef = useRef(null);
  const timerRef = useRef(null);
  const lastRequestParamsRef = useRef('');
  const routeFetchedRef = useRef(false);
  const initialFetchDoneRef = useRef(false);
  const isMountedRef = useRef(true);
  const lastFetchTimeRef = useRef(0);
  
  // Получаем цвет линии в зависимости от типа маршрута и загруженности (для авто)
  const getRouteColor = useCallback(() => {
    if (strokeColor) return strokeColor;
    
    // Для автомобильного маршрута используем цвет в зависимости от загруженности
    if (mode === 'DRIVING' && routeInfo) {
      // Получаем ориентировочное время в свободной дороге
      // (используя примерное среднее 60 км/ч для автомобиля)
      const freeRoadTime = routeInfo.distance / 60 * 60; // время в минутах
      
      // Коэффициент загруженности (насколько дольше занимает поездка из-за пробок)
      const trafficRatio = routeInfo.duration / freeRoadTime;
      
      if (trafficRatio <= 1.1) {
        // Свободная дорога
        return theme.colors.trafficFree; // Зеленый
      } else if (trafficRatio <= 1.3) {
        // Умеренная загруженность
        return theme.colors.trafficModerate; // Желтый
      } else if (trafficRatio <= 1.7) {
        // Сильная загруженность
        return theme.colors.trafficHeavy; // Оранжевый
      } else {
        // Очень сильная загруженность
        return theme.colors.trafficSevere; // Красный
      }
    }
    
    // Для всех остальных типов маршрутов (не авто) используем синий
    switch (mode) {
      case 'WALKING':
      case 'BICYCLING':
      case 'TRANSIT':
        return theme.colors.routeWalk; // Синий
      default:
        return theme.colors.primary;
    }
  }, [mode, strokeColor, routeInfo]);
  
  // Получаем толщину линии в зависимости от типа маршрута
  const getRouteWidth = useCallback(() => {
    if (strokeWidth !== 5) return strokeWidth;
    
    switch (mode) {
      case 'WALKING':
        return 4; // Тоньше для пешеходных маршрутов
      case 'BICYCLING':
        return 4;
      case 'TRANSIT':
        return 6; // Толще для транспорта
      case 'DRIVING':
      default:
        return 5;
    }
  }, [mode, strokeWidth]);
  
  // Получаем стиль линии в зависимости от типа маршрута
  const getRouteLinePattern = useCallback(() => {
    switch (mode) {
      case 'WALKING':
        return [5, 5]; // Пунктирная линия для пешеходного маршрута
      case 'BICYCLING':
        return [10, 3]; // Штрих-пунктирная линия
      case 'TRANSIT':
        return null; // Сплошная для транспорта
      case 'DRIVING':
      default:
        return null; // Сплошная линия для авто
    }
  }, [mode]);
  
  // Функция для определения реального режима маршрута в зависимости от API
  const getEffectiveMode = (mode) => {
    // В нашем API теперь принимаются режимы в формате 'DRIVING', 'WALKING', 'BICYCLING', 'TRANSIT'
    // а не 'driving', 'walking', и т.д.
    switch (mode) {
      case 'walking':
      case 'foot':
        return 'WALKING';
      case 'cycling':
      case 'bike':
      case 'bicycle':
        return 'BICYCLING';
      case 'transit':
      case 'public_transport':
        return 'TRANSIT';
      case 'driving':
      case 'car':
      default:
        return 'DRIVING';
    }
  };
  
  // Используем useCallback для предотвращения лишних перерисовок
  const fetchRoute = useCallback(async (signal) => {
    try {
      console.log(`RouteDirections: запрашиваем маршрут для режима: ${mode}`);
      
      // Проверяем валидность точек маршрута
      if (!origin || !destination) {
        console.log('RouteDirections: отсутствуют начальная или конечная точки маршрута');
        setCoordinates([]);
        setRouteInfo(null);
        if (onRouteReady) {
          onRouteReady({
            coordinates: [],
            distance: 0,
            duration: 0,
            isApproximate: true,
            mode: mode
          });
        }
        return;
      }
      
      // Формируем строку с параметрами запроса для сравнения
      const requestParams = JSON.stringify({
        originLat: origin.latitude.toFixed(6),
        originLng: origin.longitude.toFixed(6),
        destLat: destination.latitude.toFixed(6),
        destLng: destination.longitude.toFixed(6),
        mode: mode,
      });
      
      // Если мы уже запрашивали эти же параметры и получили результат, не делаем новый запрос
      if (routeFetchedRef.current && requestParams === lastRequestParamsRef.current) {
        console.log('RouteDirections: пропускаем повторный запрос с теми же параметрами');
        
        // Но всё же отправляем существующие данные в колбэк, если это первый запрос
        if (!initialFetchDoneRef.current && onRouteReady && routeInfo) {
          onRouteReady({
            coordinates: coordinates,
            distance: routeInfo.distance,
            duration: routeInfo.duration,
            isApproximate: routeInfo.isApproximate || false,
            mode: mode
          });
          initialFetchDoneRef.current = true;
        }
        return;
      }
      
      // Обновляем параметры последнего запроса
      lastRequestParamsRef.current = requestParams;
      routeFetchedRef.current = false;
      
      // Если у нас уже есть запрос в процессе, отменяем его
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      // Создаём новый контроллер для возможности отмены
      abortControllerRef.current = new AbortController();
      const localSignal = signal || abortControllerRef.current.signal;
      
      // Используем реальный режим для API
      const effectiveMode = getEffectiveMode(mode);
      
      console.log(`RouteDirections: запрашиваем API маршрут для режима ${effectiveMode}`);
      
      // Получаем данные маршрута из API
      try {
        const result = await fetchRouteDirections(
          origin,
          destination,
          waypoints,
          effectiveMode,
          localSignal
        );
        
        // Проверяем что компонент все еще смонтирован
        if (!isMountedRef.current) return;
        
        // Проверяем результат
        if (result && result.coordinates && result.coordinates.length > 0) {
          console.log(`RouteDirections: получен маршрут: ${result.distance.toFixed(1)} км, ${Math.round(result.duration)} мин, координат: ${result.coordinates.length}`);
          
          setCoordinates(result.coordinates);
          setRouteInfo({
            distance: result.distance,
            duration: result.duration,
            isApproximate: result.isApproximate || false
          });
          
          if (onRouteReady) {
            console.log(`RouteDirections: отправляем данные маршрута в колбэк`);
            onRouteReady({
              coordinates: result.coordinates,
              distance: result.distance,
              duration: result.duration,
              isApproximate: result.isApproximate || false,
              mode: mode
            });
            initialFetchDoneRef.current = true;
          }
          
          routeFetchedRef.current = true;
        } else {
          console.error('RouteDirections: нет данных для построения маршрута');
          handleFallbackRoute();
        }
      } catch (error) {
        // Проверяем что компонент все еще смонтирован
        if (!isMountedRef.current) return;
        
        console.error('RouteDirections: ошибка при получении маршрута:', error);
        handleFallbackRoute();
      }
    } catch (error) {
      // Проверяем что компонент все еще смонтирован
      if (!isMountedRef.current) return;
      
      console.error('RouteDirections: общая ошибка:', error);
      handleFallbackRoute();
    }
  }, [origin, destination, waypoints, mode, onRouteReady]);
  
  // Обработка состояния ошибки - показываем прямую линию
  const handleFallbackRoute = useCallback(() => {
    if (!origin || !destination || !isMountedRef.current) return;
    
    console.log('RouteDirections: используем резервный маршрут по прямой линии');
    
    const directDistance = calculateDirectDistance(origin, destination);
    const approximateTime = calculateApproximateTime(directDistance, mode);
    
    // Создаем прямую линию с несколькими точками для плавности
    const coordinates = [origin];
    
    // Добавляем промежуточные точки
    const numPoints = Math.max(2, Math.min(10, Math.ceil(directDistance * 5)));
    for (let i = 1; i < numPoints; i++) {
      const ratio = i / numPoints;
      
      const lat = origin.latitude + (destination.latitude - origin.latitude) * ratio;
      const lng = origin.longitude + (destination.longitude - origin.longitude) * ratio;
      
      coordinates.push({ latitude: lat, longitude: lng });
    }
    
    coordinates.push(destination);
    
    setCoordinates(coordinates);
    setRouteInfo({
      distance: directDistance,
      duration: approximateTime,
      isApproximate: true
    });
    
    if (onRouteReady) {
      console.log(`RouteDirections: отправляем данные резервного маршрута в колбэк`);
      onRouteReady({
        coordinates: coordinates,
        distance: directDistance,
        duration: approximateTime,
        isApproximate: true,
        mode: mode
      });
      initialFetchDoneRef.current = true;
    }
    
    routeFetchedRef.current = true;
  }, [origin, destination, mode, onRouteReady]);

  // Сбрасываем флаг смонтированности компонента при размонтировании
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Эффект для запроса маршрута при изменении параметров
  useEffect(() => {
    // Проверяем, что компонент смонтирован
    isMountedRef.current = true;
    
    // Проверяем, что начальная и конечная точки существуют и не совпадают
    if (!origin || !destination ||
        (origin.latitude === destination.latitude && 
         origin.longitude === destination.longitude)) {
      console.log('RouteDirections: начальная и конечная точки маршрута совпадают или отсутствуют.');
      setCoordinates([]);
      setRouteInfo(null);
      if (onRouteReady) {
        onRouteReady({
          coordinates: [],
          distance: 0,
          duration: 0,
          isApproximate: true,
          mode: mode
        });
      }
      return;
    }
    
    // Формируем строку с параметрами запроса для сравнения
    const requestParams = JSON.stringify({
      originLat: origin.latitude.toFixed(6),
      originLng: origin.longitude.toFixed(6),
      destLat: destination.latitude.toFixed(6),
      destLng: destination.longitude.toFixed(6),
      mode: mode,
    });
    
    // Если мы уже запрашивали эти же параметры и получили результат, не делаем новый запрос
    if (routeFetchedRef.current && requestParams === lastRequestParamsRef.current) {
      console.log('RouteDirections: пропускаем повторный запрос с теми же параметрами');
      return;
    }
    
    // Обновляем параметры последнего запроса
    lastRequestParamsRef.current = requestParams;
    
    console.log(`RouteDirections: запрашиваем маршрут для режима ${mode}`);
    
    // Отменяем предыдущий запрос если он есть
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Создаем новый контроллер отмены
    abortControllerRef.current = new AbortController();
    
    // Запрашиваем маршрут
    fetchRouteDirections(origin, destination, waypoints, mode, abortControllerRef.current.signal)
      .then(result => {
        // Проверяем что компонент все еще смонтирован
        if (!isMountedRef.current) return;
        
        // Проверяем результат
        if (result && result.coordinates && result.coordinates.length > 0) {
          console.log(`RouteDirections: получен маршрут для режима ${mode}: ${result.coordinates.length} точек`);
          
          // Устанавливаем флаг успешного получения маршрута
          routeFetchedRef.current = true;
          
          setCoordinates(result.coordinates);
          setRouteInfo({
            distance: result.distance,
            duration: result.duration,
            isApproximate: result.isApproximate || false
          });
          
          if (onRouteReady) {
            onRouteReady({
              coordinates: result.coordinates,
              distance: result.distance,
              duration: result.duration,
              isApproximate: result.isApproximate || false,
              mode: mode
            });
          }
        } else {
          console.log('RouteDirections: получен пустой результат');
          handleFallbackRoute();
        }
      })
      .catch(error => {
        // Проверяем что компонент все еще смонтирован
        if (!isMountedRef.current) return;
        
        if (error.name !== 'AbortError') {
          console.error('RouteDirections: ошибка при получении маршрута:', error);
          handleFallbackRoute();
        }
      });
    
    // Очистка при размонтировании
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [origin, destination, mode, waypoints]);
  
  // Расчет прямого расстояния между двумя точками (формула Haversine)
  const calculateDirectDistance = (pointA, pointB) => {
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
  
  // Конвертация градусов в радианы
  const deg2rad = (deg) => {
    return deg * (Math.PI/180);
  };
  
  // Рассчитываем примерное время в зависимости от типа транспорта
  const calculateApproximateTime = (distance, mode) => {
    switch (mode) {
      case 'WALKING':
        // Средняя скорость ходьбы 5 км/ч
        return (distance / 5) * 60;
      case 'BICYCLING':
        // Средняя скорость велосипеда 15 км/ч
        return (distance / 15) * 60;
      case 'TRANSIT':
        // Среднее для общественного транспорта 25 км/ч + время ожидания
        return (distance / 25) * 60 + 10; // +10 минут на ожидание
      case 'DRIVING':
      default:
        // Минимум 5 минут для авто
        const carTime = (distance / 40) * 60;
        return Math.max(5, carTime);
    }
  };

  // Находим точку для размещения аннотации (рядом с серединой маршрута)
  const getAnnotationCoordinate = useCallback(() => {
    if (!coordinates || coordinates.length < 3) return null;
    
    // Убедимся, что массив координат правильный
    for (let i = 0; i < coordinates.length; i++) {
      const coord = coordinates[i];
      if (!coord || typeof coord.latitude !== 'number' || typeof coord.longitude !== 'number' ||
          isNaN(coord.latitude) || isNaN(coord.longitude)) {
        console.log(`Некорректные координаты в позиции ${i}:`, coord);
        return null;
      }
    }
    
    // Берем точку примерно на 40% пути (это обычно более заметная часть маршрута)
    const index = Math.floor(coordinates.length * 0.4);
    return coordinates[index];
  }, [coordinates]);

  if (!coordinates || coordinates.length === 0) {
    return null;
  }

  // Получаем текущий цвет и ширину линии
  const currentColor = getRouteColor();
  const currentWidth = getRouteWidth();
  const linePattern = getRouteLinePattern();
  
  // Получаем координату для аннотации
  const annotationCoordinate = getAnnotationCoordinate();

  return (
    <>
      <Polyline
        coordinates={coordinates}
        strokeColor={currentColor}
        strokeWidth={currentWidth}
        strokePattern={linePattern}
        geodesic
        zIndex={1}
        lineCap="round"
        lineJoin="round"
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

export default React.memo(RouteDirections);
