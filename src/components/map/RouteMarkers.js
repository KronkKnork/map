import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';

/**
 * Компонент для отображения маркеров начальной и конечной точек маршрута
 * 
 * @param {Object} origin - Координаты начальной точки {latitude, longitude}
 * @param {Object} destination - Координаты конечной точки {latitude, longitude}
 * @param {Object} originInfo - Информация о начальной точке {name, address}
 * @param {Object} destinationInfo - Информация о конечной точке {name, address}
 * @param {Boolean} isRouting - Флаг активности режима маршрута
 */
const RouteMarkers = ({ 
  origin, 
  destination, 
  originInfo, 
  destinationInfo,
  isRouting 
}) => {
  
  // Если нет координат или не активен режим маршрута, не показываем маркеры
  if (!origin || !destination || !isRouting) {
    return null;
  }
  
  return (
    <>
      {/* Маркер начальной точки */}
      <Marker
        coordinate={origin}
        title={originInfo?.name || "Начало маршрута"}
        description={originInfo?.address || "Начальная точка маршрута"}
        pinColor="green"
      >
        <View style={styles.startMarker}>
          <Ionicons name="navigate" size={30} color={theme.colors.primary} />
        </View>
      </Marker>
      
      {/* Маркер конечной точки */}
      <Marker
        coordinate={destination}
        title={destinationInfo?.name || "Конец маршрута"}
        description={destinationInfo?.address || "Конечная точка маршрута"}
        pinColor="red"
      >
        <View style={styles.endMarker}>
          <Ionicons name="flag" size={30} color="red" />
        </View>
      </Marker>
    </>
  );
};

const styles = StyleSheet.create({
  startMarker: {
    position: 'absolute',
    top: -20,
    left: -10,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  endMarker: {
    position: 'absolute',
    top: -20,
    right: -10,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'red',
  },
});

export default RouteMarkers; 