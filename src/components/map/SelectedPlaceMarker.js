import React, { useEffect } from 'react';
import { Marker } from 'react-native-maps';

/**
 * Компонент маркера выбранного места с улучшенной логикой отображения
 * 
 * @param {Object} location - Координаты выбранного места {latitude, longitude}
 * @param {Object} placeInfo - Информация о выбранном месте {name, address}
 */
const SelectedPlaceMarker = ({ location, placeInfo }) => {
  useEffect(() => {
    if (location) {
      console.log('SelectedPlaceMarker: Получены новые координаты', location);
    }
  }, [location]);

  // Валидация координат для предотвращения ошибок маркера
  const isValidLocation = 
    location && 
    typeof location === 'object' && 
    typeof location.latitude === 'number' && 
    typeof location.longitude === 'number' && 
    !isNaN(location.latitude) && 
    !isNaN(location.longitude);

  if (!isValidLocation) {
    console.log('SelectedPlaceMarker: Пропуск рендера - невалидные координаты', location);
    return null;
  }

  console.log('SelectedPlaceMarker: Рендерим маркер с координатами', location);
  
  return (
    <Marker
      coordinate={location}
      title={placeInfo?.name || "Выбранное место"}
      description={placeInfo?.address}
      pinColor="red"
      tracksViewChanges={false}
    />
  );
};

export default React.memo(SelectedPlaceMarker); 