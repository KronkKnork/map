import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Polyline } from 'react-native-maps';
import { theme } from '../../theme';

/**
 * Специальный компонент для отображения маршрутов на Android
 * Использует упрощенную логику для предотвращения ошибок с представлениями
 */
const AndroidRouteView = ({ coordinates, routeInfo, mode, strokeColor, strokeWidth = 5 }) => {
  // Если нет координат, не рендерим ничего
  if (!coordinates || coordinates.length < 2) {
    return null;
  }

  // Определяем цвет в зависимости от режима
  const getColor = () => {
    if (!strokeColor) {
      if (mode === 'WALKING') {
        return theme.colors.routeWalk || '#4285F4';
      } else if (mode === 'BICYCLING') {
        return theme.colors.routeBike || '#0F9D58';
      } else if (mode === 'TRANSIT') {
        return theme.colors.routeTransit || '#9C27B0';
      } else {
        return theme.colors.routeDrive || '#DB4437';
      }
    }
    return strokeColor;
  };

  // Определяем стиль линии в зависимости от режима
  const getLinePattern = () => {
    if (mode === 'WALKING') {
      return [5, 5]; // Пунктирная линия для пешеходного маршрута
    } else if (mode === 'BICYCLING') {
      return [10, 5]; // Штрих-пунктирная линия для велосипедного маршрута
    } else if (mode === 'TRANSIT') {
      return [15, 10]; // Длинный штрих для общественного транспорта
    }
    return null; // Сплошная линия для автомобильного маршрута
  };

  return (
    <View style={styles.container}>
      <Polyline
        coordinates={coordinates}
        strokeColor={getColor()}
        strokeWidth={strokeWidth}
        lineDashPattern={getLinePattern()}
        zIndex={1}
        lineJoin="round"
        lineCap="round"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    // Пустой контейнер для предотвращения конфликтов с другими представлениями
  },
});

export default AndroidRouteView;
