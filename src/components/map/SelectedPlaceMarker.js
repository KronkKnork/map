import React, { useEffect } from 'react';
import { Marker } from 'react-native-maps';
import { View, StyleSheet, Platform } from 'react-native';
// Импортируем иконки из правильного пути
import { LocationMarker, DestinationMarker } from '../../assets/icons';
import { theme } from '../../theme';

/**
 * Компонент маркера выбранного места с улучшенной логикой отображения
 * 
 * @param {Object} location - Координаты выбранного места {latitude, longitude}
 * @param {Object} placeInfo - Информация о выбранном месте {name, address}
 * @param {Boolean} isRouting - Флаг активности режима маршрутизации
 */
const SelectedPlaceMarker = ({ location, placeInfo, isRouting = false }) => {
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

  // Не отображаем маркер только если координаты невалидны
  if (!isValidLocation) {
    console.log('SelectedPlaceMarker: Пропуск рендера - невалидные координаты');
    return null;
  }

  console.log('SelectedPlaceMarker: Рендерим маркер с координатами', location);
  
  // Настройки маркера для разных платформ
  const markerProps = {
    tracksViewChanges: Platform.OS === 'android', // На Android нужно true
    anchor: { x: 0.5, y: 1.0 },
    zIndex: 2
  };
  
  // Выбираем цвет маркера в зависимости от режима
  const markerColor = isRouting ? theme.colors.primary : '#5853FC';
  
  return (
    <Marker
      coordinate={location}
      title={placeInfo?.name || "Выбранное место"}
      description={placeInfo?.address}
      {...markerProps}
    >
      <View style={styles.container}>
        {isRouting ? (
          <DestinationMarker width={50} height={50} color={markerColor} />
        ) : (
          <LocationMarker width={50} height={50} color={markerColor} />
        )}
      </View>
    </Marker>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  }
});

export default SelectedPlaceMarker;