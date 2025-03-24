import React from 'react';
import { Marker } from 'react-native-maps';

/**
 * Компонент маркера выбранного места
 * 
 * @param {Object} location - Координаты выбранного места {latitude, longitude}
 * @param {Object} placeInfo - Информация о выбранном месте {name, address}
 */
const SelectedPlaceMarker = ({ location, placeInfo }) => {
  // Проверяем, что локация валидна перед отображением
  if (!location || 
      typeof location !== 'object' || 
      typeof location.latitude !== 'number' || 
      typeof location.longitude !== 'number' || 
      isNaN(location.latitude) || 
      isNaN(location.longitude)) {
    return null;
  }
  
  return (
    <Marker
      coordinate={location}
      title={placeInfo?.name || "Выбранное место"}
      description={placeInfo?.address}
      pinColor="red"
    />
  );
};

export default SelectedPlaceMarker; 