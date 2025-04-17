import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Polyline } from 'react-native-maps';
import { observer } from 'mobx-react-lite';
import { useStore } from '../../stores/StoreContext';
import { theme } from '../../theme';
import api from '../../services/api';

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
          
          // Используем кэшированные данные
          if (mountedRef.current) {
            setCoordinates(cachedRoute.coordinates || []);
            setRouteInfo({
              distance: cachedRoute.distance || 0,
              duration: cachedRoute.duration || 0,
              isApproximate: cachedRoute.isApproximate || false
            });
            
            // Уведомляем о готовности маршрута
            if (onRouteReady && typeof onRouteReady === 'function') {
              onRouteReady({
                coordinates: cachedRoute.coordinates || [],
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
      
      // Сначала показываем временный маршрут прямой линией, чтобы пользователь видел отклик
      const tempDistance = calculateDistance(origin, destination);
      let tempSpeed = 0.5;
      
      switch(mode) {
        case 'WALKING':
          tempSpeed = 0.08;
          break;
        case 'BICYCLING': 
          tempSpeed = 0.25;
          break;
        case 'TRANSIT':
          tempSpeed = 0.7;
          break;
      }
      
      // Создаем временный маршрут прямой линией
      const tempCoords = [
        { latitude: origin.latitude, longitude: origin.longitude },
        { latitude: destination.latitude, longitude: destination.longitude }
      ];
      
      const tempDuration = Math.max(1, Math.round(tempDistance / tempSpeed));
      
      // Показываем временный маршрут, пока загружается настоящий
      if (mountedRef.current) {
        setCoordinates(tempCoords);
        setRouteInfo({
          distance: tempDistance,
          duration: tempDuration,
          isApproximate: true
        });
      }
      
      // Запрашиваем реальный маршрут из API
      try {
        // Трансформируем режим в формат для API
        let apiMode = mode;
        // По API режимы маленькими буквами
        if (mode === 'DRIVING') apiMode = 'driving';
        if (mode === 'WALKING') apiMode = 'walking';
        if (mode === 'BICYCLING') apiMode = 'cycling';
        if (mode === 'TRANSIT') apiMode = 'transit';
        
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
        console.log(`Запрашиваем маршрут ${apiMode}...`);
        const result = await api.fetchRouteDirections(
          originCoord,
          destinationCoord,
          [], // waypoints
          apiMode
        );
        
        // Проверяем, что компонент еще монтирован
        if (!mountedRef.current) return;
        
        console.log(`Получен маршрут: ${result.distance.toFixed(1)} км, ${result.duration} мин, тип: ${mode}`);
        
        // Обновляем состояние компонента
        if (result.coordinates && result.coordinates.length > 0) {
          setCoordinates(result.coordinates);
          setRouteInfo({
            distance: result.distance,
            duration: result.duration,
            isApproximate: false
          });
          
          // Уведомляем о готовности маршрута
          if (onRouteReady && typeof onRouteReady === 'function') {
            onRouteReady({
              coordinates: result.coordinates,
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
  
  // Не рендерим ничего, если нет координат
  if (!coordinates || coordinates.length < 2) {
    return null;
  }
  
  return (
    <Polyline
      coordinates={coordinates}
      strokeColor={getRouteColor()}
      strokeWidth={strokeWidth}
      lineDashPattern={getLinePattern()}
      lineJoin="round"
      lineCap="round"
      zIndex={1}
    />
  );
};

export default observer(FixedRouteDirections);
