import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';

/**
 * Компонент для отображения информации о маршруте
 * @param {object} info - Информация о маршруте (время, расстояние)
 * @param {string} routeType - Тип маршрута (car, walk, bicycle, public_transport, subway)
 */
const RouteInfo = ({ 
  info = { 
    distance: '0 км', 
    duration: '0 мин' 
  },
  routeType = 'car'
}) => {
  // Определяем иконку в зависимости от типа маршрута
  const getRouteIcon = () => {
    switch (routeType) {
      case 'car':
        return 'car-outline';
      case 'walk':
        return 'walk-outline';
      case 'bicycle':
        return 'bicycle-outline';
      case 'public_transport':
        return 'bus-outline';
      case 'subway':
        return 'subway-outline';
      default:
        return 'navigate-outline';
    }
  };

  // Определяем текст типа маршрута
  const getRouteTypeText = () => {
    switch (routeType) {
      case 'car':
        return 'На автомобиле';
      case 'walk':
        return 'Пешком';
      case 'bicycle':
        return 'На велосипеде';
      case 'public_transport':
        return 'На общественном транспорте';
      case 'subway':
        return 'На метро';
      default:
        return 'Маршрут';
    }
  };

  // Цвет для типа маршрута
  const getRouteColor = () => {
    switch (routeType) {
      case 'car':
        return theme.colors.primary;
      case 'walk':
        return '#4CAF50';
      case 'bicycle':
        return '#2196F3';
      case 'public_transport':
      case 'subway':
        return '#FF9800';
      default:
        return theme.colors.primary;
    }
  };

  const routeColor = getRouteColor();

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Ionicons name={getRouteIcon()} size={28} color={routeColor} />
      </View>
      
      <View style={styles.infoContainer}>
        <View style={styles.header}>
          <Text style={[styles.typeText, { color: routeColor }]}>
            {getRouteTypeText()}
          </Text>
          {routeType === 'car' && (
            <View style={[styles.trafficBadge, { backgroundColor: routeColor }]}>
              <Text style={styles.trafficText}>7</Text>
            </View>
          )}
        </View>
        
        <View style={styles.detailsContainer}>
          <Text style={styles.detailText}>
            <Text style={styles.valueText}>{info.duration}</Text> • {info.distance}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 16,
  },
  iconContainer: {
    marginRight: 14,
    justifyContent: 'center',
  },
  infoContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  typeText: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  trafficBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trafficText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  detailsContainer: {
    marginTop: 2,
  },
  detailText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  valueText: {
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
});

export default RouteInfo; 