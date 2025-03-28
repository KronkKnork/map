import React, { useEffect } from 'react';
import { Marker } from 'react-native-maps';
import { View, StyleSheet } from 'react-native';
// Исправляем путь импорта с учетом регистра
import { LocationMarker } from '../../assets/icons/index';

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
  // Убираем проверку на isRouting, чтобы маркер отображался всегда при валидных координатах
  if (!isValidLocation) {
    console.log('SelectedPlaceMarker: Пропуск рендера - невалидные координаты');
    return null;
  }

  console.log('SelectedPlaceMarker: Рендерим маркер с координатами', location);
  
  return (
    <Marker
      coordinate={location}
      title={placeInfo?.name || "Выбранное место"}
      description={placeInfo?.address}
      tracksViewChanges={false}
      anchor={{ x: 0.5, y: 1.0 }} // Якорь в нижней точке капли
    >
      <View style={styles.container}>
        <LocationMarker width={50} height={50} color="#5853FC" />
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