import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Dimensions, 
  Platform
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../theme';
import RouteTypeTabs from './RouteTypeTabs';

/**
 * Компонент плашки навигации, который отображается снизу при построении маршрута
 * 
 * @param {Object} route - Данные о маршруте (origin, destination)
 * @param {Object} routeInfo - Информация о маршруте (distance, duration, coordinates)
 * @param {Function} onCancel - Функция для отмены маршрута
 * @param {Function} onStartNavigation - Функция для запуска навигации
 * @param {Function} onRouteTypeChange - Функция для смены типа маршрута
 * @param {String} originName - Название начальной точки
 * @param {String} destinationName - Название конечной точки
 * @param {String} activeRouteType - Активный тип маршрута
 * @param {Object} allRoutes - Все доступные маршруты по типам
 * @param {Object} routesLoading - Состояние загрузки маршрутов по типам
 * @param {Function} onSwapDirection - Функция для смены направления маршрута
 */
const RouteBottomPanel = ({ 
  route,
  routeInfo,
  onCancel,
  onStartNavigation,
  onRouteTypeChange,
  originName = "Исходная точка",
  destinationName = "Конечная точка",
  activeRouteType = 'car',
  allRoutes = {},
  routesLoading = {},
  onSwapDirection
}) => {
  // Отладочное сообщение при изменении routeInfo
  useEffect(() => {
    if (routeInfo) {
      console.log('RouteBottomPanel получил обновление routeInfo:', {
        distance: routeInfo.distance,
        duration: routeInfo.duration,
        isApproximate: routeInfo.isApproximate,
        coordinates: routeInfo.coordinates ? `${routeInfo.coordinates.length} точек` : 'нет координат',
        activeRouteType
      });
    }
  }, [routeInfo, activeRouteType]);
  
  // Преобразование типа маршрута API в формат для вкладок
  const getTabTypeFromApiMode = (apiMode) => {
    switch (apiMode) {
      case 'WALKING':
        return 'walk';
      case 'BICYCLING':
        return 'bicycle';
      case 'TRANSIT':
        return 'public_transport';
      case 'DRIVING':
      default:
        return 'car';
    }
  };
  
  // Преобразование типа вкладки в режим API
  const getApiModeFromTabType = (tabType) => {
    switch (tabType) {
      case 'walk':
        return 'WALKING';
      case 'bicycle':
        return 'BICYCLING';
      case 'public_transport':
      case 'subway':
        return 'TRANSIT';
      case 'car':
      default:
        return 'DRIVING';
    }
  };
  
  // Получение информации о загрузке для типа вкладки
  const isTabLoading = (tabType) => {
    const apiMode = getApiModeFromTabType(tabType);
    return routesLoading[apiMode] === true;
  };
  
  // Получение информации о маршруте для типа вкладки
  const getRouteInfoForTab = (tabType) => {
    const apiMode = getApiModeFromTabType(tabType);
    return allRoutes[apiMode];
  };
  
  // Форматирование времени маршрута
  const formatDuration = (minutes) => {
    if (minutes === undefined || minutes === null) return "—";
    
    if (minutes < 1) {
      return "< 1 мин";
    }
    
    if (minutes < 60) {
      return `${Math.round(minutes)} мин`;
    }
    
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    
    if (mins === 0) {
      return `${hours} ч`;
    }
    
    return `${hours} ч ${mins} мин`;
  };
  
  // Форматирование расстояния
  const formatDistance = (kilometers) => {
    if (kilometers === undefined || kilometers === null) return "—";
    
    return kilometers < 1 
      ? `${Math.round(kilometers * 1000)} м` 
      : `${kilometers.toFixed(1)} км`;
  };
  
  // Обработчик смены типа маршрута
  const handleRouteTypeChange = (type) => {
    // Вызываем родительский обработчик с соответствующим режимом API
    onRouteTypeChange && onRouteTypeChange(getApiModeFromTabType(type));
  };
  
  // Проверяем, приблизительное ли значение у маршрута
  const isApproximateRoute = routeInfo?.isApproximate === true;
  
  // Получаем соответствие типов вкладок и режимов API
  const tabRoutesInfo = {
    car: getRouteInfoForTab('car'),
    walk: getRouteInfoForTab('walk'),
    bicycle: getRouteInfoForTab('bicycle'),
    public_transport: getRouteInfoForTab('public_transport')
  };
  
  // Получаем информацию о загрузке для каждого типа
  const tabsLoadingState = {
    car: isTabLoading('car'),
    walk: isTabLoading('walk'),
    bicycle: isTabLoading('bicycle'),
    public_transport: isTabLoading('public_transport')
  };

  // Обработчик нажатия на кнопку смены направления
  const handleSwapDirection = () => {
    if (onSwapDirection) {
      onSwapDirection();
    }
  };
  
  // Обработчик нажатия на кнопку опций
  const handleOptionsPress = () => {
    // Здесь будет логика для опций маршрута (в следующей версии)
    console.log('Открыть опции маршрута');
  };
  
  return (
    <View style={styles.container}>
      {/* Вкладки с типами транспорта */}
      <RouteTypeTabs 
        activeTab={activeRouteType} 
        onTabChange={handleRouteTypeChange}
        routesInfo={tabRoutesInfo}
        loadingState={tabsLoadingState}
      />
      
      {/* Блок адресов маршрута */}
      <View style={styles.addressesContainer}>
        <View style={styles.addressesContent}>
          {/* Адрес начальной точки */}
          <View style={styles.addressRow}>
            <View style={styles.addressDot}>
              <Ionicons name="radio-button-on" size={18} color="#4CAF50" />
            </View>
            <Text style={styles.addressText} numberOfLines={1}>
              {originName}
            </Text>
          </View>
          
          {/* Разделитель */}
          <View style={styles.addressesDivider} />
          
          {/* Адрес конечной точки */}
          <View style={styles.addressRow}>
            <View style={styles.addressDot}>
              <Ionicons name="location" size={18} color="#F44336" />
            </View>
            <Text style={styles.addressText} numberOfLines={1}>
              {destinationName}
            </Text>
          </View>
        </View>
        
        {/* Кнопка смены направления */}
        <TouchableOpacity 
          style={styles.swapButton} 
          onPress={handleSwapDirection}
        >
          <MaterialIcons name="swap-vert" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>
      
      {/* Блок с кнопками */}
      <View style={styles.buttonsContainer}>
        {/* Кнопка опций */}
        <TouchableOpacity style={styles.iconButton} onPress={handleOptionsPress}>
          <MaterialIcons name="tune" size={24} color={theme.colors.textSecondary} />
        </TouchableOpacity>
        
        {/* Основная кнопка маршрута */}
        <TouchableOpacity 
          style={styles.startButton}
          onPress={onStartNavigation}
        >
          <Text style={styles.startButtonText}>Начать маршрут</Text>
        </TouchableOpacity>
        
        {/* Кнопка закрытия */}
        <TouchableOpacity style={styles.iconButton} onPress={onCancel}>
          <MaterialIcons name="close" size={24} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 10,
  },
  // Стили для блока адресов
  addressesContainer: {
    flexDirection: 'row',
    marginVertical: 16,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    padding: 8,
  },
  addressesContent: {
    flex: 1,
    marginRight: 8,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  addressDot: {
    marginRight: 8,
    width: 24,
    alignItems: 'center',
  },
  addressText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.textPrimary,
  },
  addressesDivider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginLeft: 32,
    marginVertical: 2,
  },
  swapButton: {
    alignSelf: 'center',
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
    backgroundColor: '#EEEEEE',
  },
  // Стили для блока кнопок
  buttonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  iconButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
    backgroundColor: '#F5F5F5',
  },
  startButton: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 12,
  },
  startButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default RouteBottomPanel; 