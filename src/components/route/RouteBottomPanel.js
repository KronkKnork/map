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
import { ArrowRight, ArrowLeft, Swap, Options, CloseNav } from '../../assets/icons/index';

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
      {/* Верхняя мини-плашка с типами транспорта */}
      <View style={styles.routeTypeTabsContainer}>
        <RouteTypeTabs 
          activeTab={activeRouteType} 
          onTabChange={handleRouteTypeChange}
          routesInfo={tabRoutesInfo}
          loadingState={tabsLoadingState}
        />
      </View>
      
      {/* Основная плашка с информацией о маршруте */}
      <View style={styles.mainPanel}>
        {/* Блок адресов маршрута */}
        <View style={styles.addressesContainer}>
          <View style={styles.addressesContent}>
            {/* Адрес начальной точки */}
            <View style={styles.addressRow}>
              <View style={styles.addressDot}>
                <ArrowRight width={24} height={24} color="#5C5EF9" />
              </View>
              <Text style={[styles.addressText, originName === "Моё местоположение" && styles.myLocationText]} numberOfLines={1}>
                {originName}
              </Text>
            </View>
            <View style={styles.addressesDivider} />
            {/* Адрес конечной точки */}
            <View style={styles.addressRow}>
              <View style={styles.addressDot}>
                <ArrowLeft width={24} height={24} color="#5C5EF9" />
              </View>
              <Text style={[styles.addressText, destinationName === "Моё местоположение" && styles.myLocationText]} numberOfLines={1}>
                {destinationName}
              </Text>
            </View>
          </View>
          
          {/* Кнопки */}
          <TouchableOpacity 
            style={styles.swapButton}
            onPress={handleSwapDirection}
          >
            <Swap width={24} height={24} color="#5C5EF9" />
          </TouchableOpacity>
        </View>
        
        {/* Блок с кнопками действий */}
        <View style={styles.actionsContainer}>
          {/* Кнопка опций */}
          <TouchableOpacity 
            style={styles.optionsButton}
            onPress={handleOptionsPress}
          >
            <Options width={24} height={24} color="#5C5EF9" />
          </TouchableOpacity>
          
          {/* Кнопка запуска навигации */}
          <TouchableOpacity 
            style={styles.startButton}
            onPress={onStartNavigation}
          >
            <Text style={styles.startButtonText}>Начать маршрут</Text>
          </TouchableOpacity>

          {/* Кнопка отмены маршрута */}
          <TouchableOpacity 
            style={styles.cancelButton}
            onPress={onCancel}
          >
            <CloseNav width={24} height={24} color="#5C5EF9" />
          </TouchableOpacity>
        </View>
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
    zIndex: 2,
  },
  routeTypeTabsContainer: {
    marginBottom: -16,
    backgroundColor: 'transparent',
  },
  mainPanel: {
    backgroundColor: 'white',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    paddingTop: 12,
    paddingBottom: 16,
  },
  addressesContainer: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    backgroundColor: 'white',
  },
  addressesContent: {
    flex: 1,
    marginRight: 8,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
  },
  addressDot: {
    width: 24,
    alignItems: 'center',
    marginRight: 16,
  },
  addressText: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.text,
  },
  myLocationText: {
    color: '#33333338',
  },
  swapButton: {
    width: 30,
    height: 30,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
  addressesDivider: {
    height: 1,
    backgroundColor: '#33333338',
  },
  actionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 8,
    alignItems: 'center',
  },
  optionsButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#5853FC1A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  cancelButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#5853FC1A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  startButton: {
    flex: 1,
    height: 48,
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  startButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default RouteBottomPanel;