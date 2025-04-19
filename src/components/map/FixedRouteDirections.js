import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Polyline } from 'react-native-maps';
// Используем собственную реализацию вместо react-native-maps-directions
import { observer } from 'mobx-react-lite';
import { useStore } from '../../stores/StoreContext';
import { theme } from '../../theme';
import api from '../../services/api';
import { toJS } from 'mobx';

/**
 * Полностью переработанный компонент для отображения маршрутов без ошибок
 */
const FixedRouteDirections = ({ 
  origin, 
  destination, 
  mode = 'DRIVING', 
  onRouteReady, 
  strokeColor,
  strokeWidth = 5 
}) => {
  const [coordinates, setCoordinates] = useState([]);
  const [routeInfo, setRouteInfo] = useState(null);
  const [isRouteLoading, setIsRouteLoading] = useState(false);
  const mountedRef = useRef(true);
  const initializedRef = useRef(false);
  const rootStore = useStore();
  const mapStore = rootStore?.mapStore;
  
  const getRouteColor = useCallback(() => {
    if (strokeColor) return strokeColor;
    
    switch(mode) {
      case 'WALKING':
        return theme.colors.routeWalk || '#4285F4';
      case 'BICYCLING':
        return theme.colors.routeBike || '#0F9D58';
      case 'TRANSIT':
        return theme.colors.routeTransit || '#9C27B0';
      default:
        return theme.colors.routeDrive || '#DB4437';
    }
  }, [mode, strokeColor]);
  
  const getLinePattern = useCallback(() => {
    switch(mode) {
      case 'WALKING':
        return [5, 5];
      case 'BICYCLING':
        return [10, 5];
      case 'TRANSIT':
        return [15, 10];
      default:
        return null;
    }
  }, [mode]);

  // Функция для расчета расстояния
  const calculateDistance = useCallback((pointA, pointB) => {
    if (!pointA || !pointB) return 0;
    
    const deg2rad = (deg) => {
      return deg * (Math.PI/180);
    };
    
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
  }, []);

  // Запрос маршрута из API вместо прямой линии
  const buildRouteWithApi = useCallback(async () => {
    // Не запрашиваем маршрут, если нет данных
    if (!origin || !destination || !mode || !mountedRef.current) return;
    
    // Проверка валидности координат
    if (!origin.latitude || !origin.longitude || !destination.latitude || !destination.longitude) return;
    
    // Проверяем, что точки не совпадают
    if (
      Math.abs(origin.latitude - destination.latitude) < 0.0000001 && 
      Math.abs(origin.longitude - destination.longitude) < 0.0000001
    ) {
      console.log('Начальная и конечная точки совпадают');
      return;
    }
    
    // Проверяем, что маршрут еще не в кэше
    try {
      const requestKey = JSON.stringify({
        originLat: origin.latitude.toFixed(6),
        originLng: origin.longitude.toFixed(6),
        destLat: destination.latitude.toFixed(6),
        destLng: destination.longitude.toFixed(6),
        mode: mode
      });
      
      // Проверяем кэш
      if (mapStore) {
        const cachedRoute = mapStore.getCachedRoute(requestKey);
        if (cachedRoute) {
          console.log('Используем маршрут из кэша для режима:', mode);
          
          // Обновляем состояние компонента - преобразуем данные с toJS
          if (mountedRef.current) {
            setCoordinates(toJS(cachedRoute.coordinates) || []);
            setRouteInfo({
              distance: cachedRoute.distance || 0,
              duration: cachedRoute.duration || 0,
              isApproximate: cachedRoute.isApproximate || false,
              trafficData: toJS(cachedRoute.trafficData) || []
            });
            
            // Уведомляем о готовности маршрута
            if (onRouteReady && typeof onRouteReady === 'function') {
              onRouteReady({
                coordinates: toJS(cachedRoute.coordinates) || [],
                distance: cachedRoute.distance || 0,
                duration: cachedRoute.duration || 0,
                isApproximate: cachedRoute.isApproximate || false,
                mode: mode
              });
            }
          }
          return;
        }
      }
      
      // НЕ показываем временный маршрут прямой линией, как запросил пользователь
      // Вместо этого просто устанавливаем значение isRouteLoading = true и дожидаемся реального маршрута
      if (mountedRef.current) {
        setIsRouteLoading(true);
      }
      
      // Запрашиваем реальный маршрут из API
      try {
        // Трансформируем режим в формат для API - оставляем в ВЕРХНЕМ регистре, чтобы API правильно обработал режимы
        // НЕ преобразуем режимы, их обработает сам API
        
        // Создаем объекты для API из координат
        const originCoord = {
          latitude: origin.latitude,
          longitude: origin.longitude
        };
        
        const destinationCoord = {
          latitude: destination.latitude,
          longitude: destination.longitude
        };
        
        // Запрашиваем маршрут
        console.log(`Запрашиваем маршрут ${mode}...`);
        const result = await api.fetchRouteDirections(
          originCoord,
          destinationCoord,
          [], // waypoints
          mode // Используем оригинальный режим в верхнем регистре
        );
        
        // Проверяем, что компонент еще монтирован
        if (!mountedRef.current) return;
        
        console.log(`Получен маршрут: ${result.distance.toFixed(1)} км, ${result.duration} мин, тип: ${mode}`);
        
        // Обновляем состояние компонента
        if (result.coordinates && result.coordinates.length > 0) {
          // Сбрасываем статус загрузки
          setIsRouteLoading(false);
          
          // Для режима автомобиля получаем данные о пробках
          if (mode === 'DRIVING') {
            console.log('Запрашиваем данные о пробках для маршрута...');
            result.trafficData = api.getTrafficData(toJS(result.coordinates), 'DRIVING');
          }
          
          // Используем toJS при установке данных в состояние
          setCoordinates(toJS(result.coordinates));
          setRouteInfo({
            distance: result.distance,
            duration: result.duration,
            isApproximate: false,
            trafficData: toJS(result.trafficData || [])
          });
          
          // Уведомляем о готовности маршрута (используем toJS для массивов)
          if (onRouteReady && typeof onRouteReady === 'function') {
            onRouteReady({
              coordinates: toJS(result.coordinates),
              distance: result.distance,
              duration: result.duration,
              isApproximate: false,
              mode: mode,
              activeRouteType: mode === 'DRIVING' ? 'car' : 
                            mode === 'WALKING' ? 'walk' : 
                            mode === 'BICYCLING' ? 'bike' : 'transit'
            });
          }
          
          // Сохраняем в кэше
          if (mapStore) {
            mapStore.cacheRoute(requestKey, {
              coordinates: result.coordinates,
              distance: result.distance,
              duration: result.duration,
              isApproximate: false,
              mode: mode
            });
          }
        }
      } catch (error) {
        console.error('Ошибка при получении маршрута:', error);
        // Оставляем прямую линию, если произошла ошибка
      }
    } catch (error) {
      console.error('Ошибка при подготовке запроса маршрута:', error);
    }
  }, [origin, destination, mode, calculateDistance, onRouteReady, mapStore]);
  
  // Используем эффект для инициализации и очистки
  useEffect(() => {
    initializedRef.current = true;
    mountedRef.current = true;
    
    // Это предотвратит циклические обновления
    return () => {
      mountedRef.current = false;
    };
  }, []);
  
  // Отдельный эффект для перестроения маршрута только при смене исходных данных
  useEffect(() => {
    // Не запускаем при первом рендере, только при изменении параметров
    if (initializedRef.current && mountedRef.current) {
      const originKey = origin ? `${origin.latitude},${origin.longitude}` : 'null';
      const destKey = destination ? `${destination.latitude},${destination.longitude}` : 'null';
      const routeKey = `${originKey}-${destKey}-${mode}`;
      
      // Используем таймаут для уменьшения частоты запросов
      const timerId = setTimeout(() => {
        if (mountedRef.current) {
          buildRouteWithApi();
        }
      }, 300); // добавляем задержку для снижения частоты запросов
      
      return () => clearTimeout(timerId);
    }
  }, [origin, destination, mode, buildRouteWithApi]);
  
  // Не рендерим ничего, если нет координат или маршрут загружается
  if (!coordinates || coordinates.length < 2 || isRouteLoading) {
    return null;
  }
  
  // Функция для получения цвета сегмента в зависимости от загруженности дороги
  const getTrafficColor = (trafficValue) => {
    // Значения трафика от 0 (нет пробок) до 10 (максимальные пробки)
    // Цвета: зеленый -> желтый -> оранжевый -> красный
    
    if (trafficValue <= 3) {
      // Зеленый - свободная дорога
      return '#26A65B'; // Зеленый
    } else if (trafficValue <= 5) {
      // Желтый - небольшие затруднения
      return '#F9BF3B'; // Желтый
    } else if (trafficValue <= 8) {
      // Оранжевый - значительные затруднения
      return '#E87E04'; // Оранжевый
    } else {
      // Красный - пробки
      return '#CF000F'; // Красный
    }
  };
  
  // Отображение маршрута с учетом пробок для режима автомобиля
  if (mode === 'DRIVING' && routeInfo && routeInfo.trafficData && routeInfo.trafficData.length > 0) {
    // Преобразуем observable массивы в обычные JS массивы с toJS
    const jsCoordinates = toJS(coordinates);
    const jsTrafficData = toJS(routeInfo.trafficData);
    
    // Сегментированный маршрут с пробками
    return (
      <View>
        {jsCoordinates.map((coord, index) => {
          // Пропускаем последнюю точку, так как нам нужны пары точек для сегментов
          if (index === jsCoordinates.length - 1) return null;
          
          // Создаем сегмент маршрута (обычный JS массив, не observable)
          const segmentCoords = [coord, jsCoordinates[index + 1]];
          const trafficValue = jsTrafficData[index] || 0;
          
          return (
            <Polyline
              key={`segment-${index}`}
              coordinates={segmentCoords}
              strokeColor={getTrafficColor(trafficValue)}
              strokeWidth={strokeWidth}
              lineCap="round"
              lineJoin="round"
            />
          );
        })}
      </View>
    );
  } else {
    // Обычный маршрут для других режимов (преобразуем через toJS)
    return (
      <View>
        <Polyline
          coordinates={toJS(coordinates)}
          strokeColor={getRouteColor()}
          strokeWidth={strokeWidth}
          lineDashPattern={getLinePattern()}
          lineCap="round"
          lineJoin="round"
        />
      </View>
    );
  }
};

export default observer(FixedRouteDirections);
