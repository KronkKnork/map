import React, { useEffect, useRef } from 'react';

/**
 * Компонент для отображения маркеров начальной и конечной точек маршрута в Leaflet
 * 
 * @param {Object} origin - Координаты начальной точки {latitude, longitude}
 * @param {Object} destination - Координаты конечной точки {latitude, longitude}
 * @param {Object} originInfo - Информация о начальной точке {name, address}
 * @param {Object} destinationInfo - Информация о конечной точке {name, address}
 * @param {Boolean} isRouting - Флаг активности режима маршрута
 * @param {Object} mapRef - Ссылка на компонент карты OSMMapView
 */
const LeafletRouteMarkers = ({ 
  origin, 
  destination, 
  originInfo, 
  destinationInfo,
  isRouting,
  mapRef
}) => {
  // Идентификаторы маркеров
  const originMarkerId = useRef('route_origin_marker');
  const destMarkerId = useRef('route_destination_marker');
  const markersVisible = useRef(false);
  
  // Проверяем валидность координат
  const isValidOrigin = origin && 
    typeof origin.latitude === 'number' && 
    typeof origin.longitude === 'number' && 
    !isNaN(origin.latitude) && 
    !isNaN(origin.longitude);
    
  const isValidDest = destination && 
    typeof destination.latitude === 'number' && 
    typeof destination.longitude === 'number' && 
    !isNaN(destination.latitude) && 
    !isNaN(destination.longitude);

  useEffect(() => {
    // Если нет нужных данных или не в режиме маршрута - удаляем маркеры
    if (!isRouting || !mapRef?.current) {
      if (mapRef?.current && markersVisible.current) {
        // Проверяем, есть ли метод clearSearchResults для очистки маркеров
        if (typeof mapRef.current.clearSearchResults === 'function') {
          mapRef.current.clearSearchResults();
          markersVisible.current = false;
        }
      }
      return;
    }
    
    // Добавляем маркер начальной точки
    if (isValidOrigin && mapRef?.current) {
      try {
        if (typeof mapRef.current.addMarker === 'function') {
          // Используем метод addMarker вместо postMessage
          mapRef.current.addMarker(
            origin, 
            originInfo?.name || 'Начало маршрута'
          );
          markersVisible.current = true;
        }
      } catch (error) {
        console.error('Ошибка при добавлении маркера начальной точки:', error);
      }
    }
    
    // Добавляем маркер конечной точки
    if (isValidDest && mapRef?.current) {
      try {
        if (typeof mapRef.current.addMarker === 'function') {
          // Используем метод addMarker вместо postMessage
          mapRef.current.addMarker(
            destination, 
            destinationInfo?.name || 'Конец маршрута'
          );
          markersVisible.current = true;
        }
      } catch (error) {
        console.error('Ошибка при добавлении маркера конечной точки:', error);
      }
    }
    
    // Очищаем маркеры при размонтировании
    return () => {
      if (mapRef?.current && markersVisible.current) {
        if (typeof mapRef.current.clearSearchResults === 'function') {
          mapRef.current.clearSearchResults();
          markersVisible.current = false;
        }
      }
    };
  }, [origin, destination, originInfo, destinationInfo, isRouting, mapRef]);

  // Компонент не отображает ничего в DOM, только взаимодействует с картой
  return null;
};

export default LeafletRouteMarkers;
