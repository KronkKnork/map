import React, { useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';

/**
 * Компонент маркера выбранного места для Leaflet
 * 
 * @param {Object} location - Координаты выбранного места {latitude, longitude}
 * @param {Object} placeInfo - Информация о выбранном месте {name, address}
 * @param {Boolean} isRouting - Флаг активности режима маршрутизации
 * @param {Object} mapRef - Ссылка на компонент карты OSMMapView
 */
const LeafletSelectedPlaceMarker = ({ location, placeInfo, isRouting = false, mapRef }) => {
  // идентификатор маркера
  const markerId = useRef('selected_place_marker');
  const markerVisible = useRef(false);
  
  // Валидация координат для предотвращения ошибок маркера
  const isValidLocation = 
    location && 
    typeof location === 'object' && 
    typeof location.latitude === 'number' && 
    typeof location.longitude === 'number' && 
    !isNaN(location.latitude) && 
    !isNaN(location.longitude);

  useEffect(() => {
    if (!isValidLocation || !mapRef?.current) {
      return;
    }
    
    try {
      // Проверяем, поддерживает ли mapRef метод addMarker
      if (typeof mapRef.current.addMarker === 'function') {
        // Используем метод addMarker вместо postMessage
        mapRef.current.addMarker(
          location,
          placeInfo?.name || 'Выбранное место'
        );
        markerVisible.current = true;
      }
    } catch (error) {
      console.error('Ошибка при добавлении маркера выбранного места:', error);
    }
    
    // Очищаем маркер при размонтировании
    return () => {
      if (mapRef?.current && markerVisible.current) {
        if (typeof mapRef.current.clearSearchResults === 'function') {
          mapRef.current.clearSearchResults();
          markerVisible.current = false;
        }
      }
    };
  }, [location, placeInfo, isRouting, mapRef]);

  // Компонент не рендерит ничего видимого, только отправляет команды
  return null;
};

export default LeafletSelectedPlaceMarker;
