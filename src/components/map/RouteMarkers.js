import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { DestinationMarker, OriginMarker } from '../../assets/icons';

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
      >
        <OriginMarker width={30} height={30} color={theme.colors.primary} />
      </Marker>
      
      {/* Маркер конечной точки */}
      <Marker
        coordinate={destination}
        title={destinationInfo?.name || "Конец маршрута"}
        description={destinationInfo?.address || "Конечная точка маршрута"}
      >
        <DestinationMarker color={theme.colors.primary} width={60} height={60} />
      </Marker>
    </>
  );
};

const styles = StyleSheet.create({
  markerContainer: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  startMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'white',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  endMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'red',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'white',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  }
});

export default RouteMarkers;