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
  const [trafficData, setTrafficData] = useState([]);
  const abortControllerRef = useRef(null);
  const timerRef = useRef(null);
  const lastRequestParamsRef = useRef('');
  const routeFetchedRef = useRef(false);
  const initialFetchDoneRef = useRef(false);
  const isMountedRef = useRef(true);
  const lastFetchTimeRef = useRef(0);
  
  // Создаем или используем глобальный флаг ошибки API
  if (typeof window.mapEaseApiBlocked === 'undefined') {
    window.mapEaseApiBlocked = false;
  }
  
  // Безопасное обновление состояния только если компонент смонтирован
  const safeSetState = (setter, value) => {
    if (isMountedRef.current) {
      setter(value);
    }
  };
  
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
  
  // Разделяем маршрут на сегменты с разными цветами для пробок
  const renderTrafficSegments = useCallback(() => {
    if (mode !== 'DRIVING' || !trafficData || trafficData.length === 0 || !coordinates || coordinates.length < 2) {
      // Если это не автомобильный маршрут или нет данных о пробках, рисуем обычную линию
      return (
        <Polyline
          coordinates={coordinates}
          strokeColor={strokeColor || theme.colors.primary}
          strokeWidth={getRouteWidth()}
          lineDashPattern={getRouteLinePattern()}
          zIndex={1}
        />
      );
    }
    
    // Создаем сегменты маршрута с разными цветами
    const segments = [];
    
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
        />
      );
    }
    
    return segments;
  }, [coordinates, trafficData, mode, strokeColor, getRouteWidth, getRouteLinePattern, getTrafficColor]);
  
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
      setTrafficData([]);
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
    
    // Проверяем глобальный флаг блокировки API
    if (window.mapEaseApiBlocked) {
      console.log('RouteDirections: API заблокирован из-за предыдущих ошибок');
      
      // Отправляем информацию об ошибке API в родительский компонент
      if (onRouteReady) {
        onRouteReady({
          coordinates: [],
          distance: 0,
          duration: 0,
          isApproximate: true,
          mode: mode,
          error: "API_ACCESS_DENIED"
        });
      }
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
        
        // Проверяем наличие ошибки API и устанавливаем глобальный флаг
        if (result && result.error === "API_ACCESS_DENIED") {
          console.error('RouteDirections: API недоступен (отказ в доступе)');
          
          // Устанавливаем глобальный флаг блокировки API, чтобы предотвратить повторные запросы
          window.mapEaseApiBlocked = true;
          
          // Очищаем данные маршрута
          safeSetState(setCoordinates, []);
          safeSetState(setRouteInfo, null);
          safeSetState(setTrafficData, []);
          
          // Уведомляем родительский компонент об ошибке
          if (onRouteReady && isMountedRef.current) {
            onRouteReady({
              coordinates: [],
              distance: 0,
              duration: 0,
              isApproximate: true,
              mode: mode,
              error: "API_ACCESS_DENIED"
            });
          }
          return;
        }
        
        // Проверяем результат
        if (result && result.coordinates && result.coordinates.length > 0) {
          console.log(`RouteDirections: получен маршрут для режима ${mode}: ${result.coordinates.length} точек`);
          
          // Устанавливаем флаг успешного получения маршрута
          routeFetchedRef.current = true;
          
          // Сбрасываем глобальный флаг блокировки API при успешном запросе
          window.mapEaseApiBlocked = false;
          
          safeSetState(setCoordinates, result.coordinates);
          safeSetState(setRouteInfo, {
            distance: result.distance,
            duration: result.duration,
            isApproximate: result.isApproximate || false
          });
          
          // Сохраняем данные о пробках, если они есть
          if (result.trafficData && Array.isArray(result.trafficData)) {
            safeSetState(setTrafficData, result.trafficData);
          } else {
            safeSetState(setTrafficData, []);
          }
          
          if (onRouteReady && isMountedRef.current) {
            onRouteReady({
              coordinates: result.coordinates,
              distance: result.distance,
              duration: result.duration,
              isApproximate: result.isApproximate || false,
              mode: mode,
              trafficData: result.trafficData
            });
          }
        } else {
          console.log('RouteDirections: получен пустой результат');
          
          safeSetState(setCoordinates, []);
          safeSetState(setRouteInfo, null);
          safeSetState(setTrafficData, []);
          
          if (onRouteReady && isMountedRef.current) {
            onRouteReady({
              coordinates: [],
              distance: 0,
              duration: 0,
              isApproximate: true,
              mode: mode,
              error: "EMPTY_RESPONSE"
            });
          }
        }
      })
      .catch(error => {
        // Проверяем что компонент все еще смонтирован
        if (!isMountedRef.current) return;
        
        if (error.name !== 'AbortError') {
          console.error('RouteDirections: ошибка при получении маршрута:', error);
          
          safeSetState(setCoordinates, []);
          safeSetState(setRouteInfo, null);
          safeSetState(setTrafficData, []);
          
          if (onRouteReady && isMountedRef.current) {
            onRouteReady({
              coordinates: [],
              distance: 0,
              duration: 0,
              isApproximate: true,
              mode: mode,
              error: "REQUEST_ERROR"
            });
          }
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
  }, [origin, destination, mode, waypoints, onRouteReady]);
  
  // Эффект для сброса флага смонтированности компонента при размонтировании
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      // Отменяем запрос если он в процессе
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      // Очищаем таймер если есть
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);
  
  // Расчет прямого расстояния между двумя точками (формула Haversine) - для аннотаций
  const calculateDirectDistance = (pointA, pointB) => {
    if (!pointA || !pointB || 
        !pointA.latitude || !pointA.longitude || 
        !pointB.latitude || !pointB.longitude) {
      return 0;
    }
    
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
  
  // Находим точку для размещения аннотации (рядом с серединой маршрута)
  const getAnnotationCoordinate = useCallback(() => {
    if (!coordinates || coordinates.length < 3) return null;
    
    // Безопасная проверка координат
    for (let i = 0; i < Math.min(coordinates.length, 100); i++) {
      const coord = coordinates[i];
      if (!coord || typeof coord.latitude !== 'number' || typeof coord.longitude !== 'number' ||
          isNaN(coord.latitude) || isNaN(coord.longitude)) {
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

    return (
      <>
        {/* Рендерим маршрут в зависимости от наличия данных о пробках */}
        {mode === 'DRIVING' && trafficData.length > 0 ? 
          renderTrafficSegments() : 
          coordinates.length > 0 && (
            <Polyline
              coordinates={coordinates}
              strokeColor={currentColor}
              strokeWidth={currentWidth}
              lineDashPattern={linePattern}
              geodesic
              zIndex={1}
              lineCap="round"
              lineJoin="round"
            />
          )
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

export default React.memo(RouteDirections);
