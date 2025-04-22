import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { observer } from 'mobx-react-lite';
import { useStore } from '../../stores/StoreContext';

/**
 * Компонент для построения маршрутов с использованием Leaflet (WebView)
 *
 * @param {Object} origin - Координаты начальной точки
 * @param {Object} destination - Координаты конечной точки
 * @param {Array} waypoints - Массив путевых точек (опционально)
 * @param {String} mode - Режим маршрута (DRIVING, WALKING, BICYCLING, TRANSIT)
 * @param {Function} onRouteReady - Колбэк, вызываемый при получении маршрута
 * @param {String} strokeColor - Цвет линии маршрута (обрабатывается в OSMMapView)
 * @param {Number} strokeWidth - Толщина линии маршрута (обрабатывается в OSMMapView)
 * @param {Boolean} showMarkers - Показывать ли маркеры начала и конца маршрута
 * @param {Object} mapRef - Ссылка на компонент OSMMapView
 */
const LeafletRouteDirections = observer(({ 
  origin,
  destination,
  waypoints = [],
  mode = 'DRIVING',
  onRouteReady,
  strokeColor = '#5C5EF9',
  strokeWidth = 5,
  showMarkers = true,
  mapRef
}) => {
  // Состояния
  const [isRouting, setIsRouting] = useState(false);
  const [lastRouteKey, setLastRouteKey] = useState('');
  const routeRequestedRef = useRef(false);

  // Доступ к глобальному состоянию
  const { routeStore } = useStore();
  
  // Преобразование режима маршрута для Leaflet
  const getLeafletRouteType = (mode) => {
    switch (mode.toUpperCase()) {
      case 'WALKING':
        return 'walking';
      case 'BICYCLING':
        return 'cycling';
      case 'TRANSIT':
        return 'transit';
      case 'DRIVING':
      default:
        return 'driving';
    }
  };

  // Проверяем валидны ли точки
  const checkValidCoordinates = () => {
    return origin && 
           destination && 
           origin.latitude && 
           origin.longitude &&
           destination.latitude && 
           destination.longitude &&
           !isNaN(origin.latitude) && 
           !isNaN(origin.longitude) &&
           !isNaN(destination.latitude) && 
           !isNaN(destination.longitude);
  };

  // Построение маршрута
  useEffect(() => {
    // Мы не делаем ничего, если нет ссылки на карту или координаты невалидны
    if (!mapRef?.current || !checkValidCoordinates()) {
      return;
    }

    // Формируем уникальный ключ для этого маршрута
    const routeKey = `${origin.latitude.toFixed(6)},${origin.longitude.toFixed(6)}-${destination.latitude.toFixed(6)},${destination.longitude.toFixed(6)}-${mode}`;
    
    // Не запрашиваем маршрут повторно, если он тот же
    if (routeKey === lastRouteKey && routeRequestedRef.current) {
      console.log('LeafletRouteDirections: маршрут уже запрошен с тем же ключом');
      return;
    }

    // Сохраняем новый ключ и флаг запроса
    setLastRouteKey(routeKey);
    routeRequestedRef.current = true;
    setIsRouting(true);

    // Подготавливаем данные для отправки в WebView
    const originPoint = { lat: origin.latitude, lng: origin.longitude };
    const destinationPoint = { lat: destination.latitude, lng: destination.longitude };
    const waypointsArray = waypoints.map(wp => ({ lat: wp.latitude, lng: wp.longitude }));

    // Отправляем запрос построения маршрута в WebView
    mapRef.current.sendMessageToWebView({
      action: 'calculateRoute',
      origin: originPoint,
      destination: destinationPoint,
      waypoints: waypointsArray,
      routeType: getLeafletRouteType(mode)
    });

    // Если нужно отображать маркеры, добавляем их
    if (showMarkers) {
      // Маркер начала маршрута
      mapRef.current.sendMessageToWebView({
        action: 'addPlaceMarker',
        id: 'route-origin',
        lat: origin.latitude,
        lng: origin.longitude,
        title: 'Начало маршрута'
      });

      // Маркер конца маршрута
      mapRef.current.sendMessageToWebView({
        action: 'addPlaceMarker',
        id: 'route-destination',
        lat: destination.latitude,
        lng: destination.longitude,
        title: 'Конец маршрута'
      });

      // Маркеры для путевых точек
      waypoints.forEach((waypoint, index) => {
        mapRef.current.sendMessageToWebView({
          action: 'addPlaceMarker',
          id: `route-waypoint-${index}`,
          lat: waypoint.latitude,
          lng: waypoint.longitude,
          title: `Точка ${index + 1}`
        });
      });
    }
  }, [origin, destination, waypoints, mode, mapRef]);

  // Обработчик события готовности маршрута, должен быть установлен в OSMMapView
  // Этот код здесь как документация
  // routeData = {
  //   distance: Number, // расстояние в километрах
  //   duration: Number, // время в минутах
  //   coordinates: [{ latitude, longitude }, ...], // координаты маршрута
  //   instructions: [{ text, distance, time, index, direction }, ...] // инструкции
  // }

  // Компонент не рендерит ничего видимого, так как вся отрисовка происходит в WebView
  return null;
});

export default LeafletRouteDirections;
