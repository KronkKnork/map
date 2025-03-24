import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Dimensions, 
  Animated, 
  Platform,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
  routesLoading = {}
}) => {
  const [expanded, setExpanded] = useState(false);
  
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
    // Если это вкладка деталей, просто разворачиваем панель
    if (type === 'details') {
      setExpanded(true);
    } else {
      // Иначе вызываем родительский обработчик с соответствующим режимом API
      onRouteTypeChange && onRouteTypeChange(getApiModeFromTabType(type));
    }
  };
  
  // Обработчик переключения развернутого состояния
  const toggleExpanded = () => {
    setExpanded(!expanded);
  };
  
  // Получение названия активного типа
  const getActiveTypeName = () => {
    switch (activeRouteType) {
      case 'walk':
        return 'Пешком';
      case 'bicycle':
        return 'Велосипед';
      case 'public_transport':
        return 'Транспорт';
      case 'subway':
        return 'Метро';
      case 'car':
      default:
        return 'На машине';
    }
  };
  
  // Получаем длительность для отображения
  const getDisplayDuration = () => {
    if (!routeInfo) return "—";
    return formatDuration(routeInfo.duration);
  };
  
  // Получаем расстояние для отображения
  const getDisplayDistance = () => {
    if (!routeInfo) return "—";
    return formatDistance(routeInfo.distance);
  };
  
  // Проверяем, приблизительное ли значение у маршрута
  const isApproximateRoute = routeInfo?.isApproximate === true;
  
  // Получаем соответствие типов вкладок и режимов API
  const tabRoutesInfo = {
    car: getRouteInfoForTab('car'),
    walk: getRouteInfoForTab('walk'),
    bicycle: getRouteInfoForTab('bicycle'),
    public_transport: getRouteInfoForTab('public_transport'),
    subway: getRouteInfoForTab('subway')
  };
  
  // Получаем информацию о загрузке для каждого типа
  const tabsLoadingState = {
    car: isTabLoading('car'),
    walk: isTabLoading('walk'),
    bicycle: isTabLoading('bicycle'),
    public_transport: isTabLoading('public_transport'),
    subway: isTabLoading('subway')
  };
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
          <Ionicons name="close" size={24} color="#666" />
        </TouchableOpacity>
        
        <View style={styles.routeInfo}>
          <Text style={styles.routeType}>
            {getActiveTypeName()}
            {isApproximateRoute && " (примерно)"}
          </Text>
          <Text style={styles.routeMetrics}>
            {getDisplayDistance()} • {getDisplayDuration()}
          </Text>
        </View>
        
        <TouchableOpacity style={styles.expandButton} onPress={toggleExpanded}>
          <Ionicons name={expanded ? "chevron-down" : "chevron-up"} size={24} color="#666" />
        </TouchableOpacity>
      </View>
      
      {expanded && (
        <View style={styles.details}>
          <View style={styles.routePoints}>
            <View style={styles.routePoint}>
              <View style={styles.startDot} />
              <Text style={styles.pointText} numberOfLines={1}>{originName}</Text>
            </View>
            
            <View style={styles.verticalLine} />
            
            <View style={styles.routePoint}>
              <View style={styles.endDot} />
              <Text style={styles.pointText} numberOfLines={1}>{destinationName}</Text>
            </View>
          </View>
          
          {/* Дополнительная информация о маршруте */}
          <View style={styles.additionalInfo}>
            <Text style={styles.infoLabel}>Расстояние:</Text>
            <Text style={styles.infoValue}>{getDisplayDistance()}</Text>
            
            <Text style={styles.infoLabel}>Время в пути:</Text>
            <Text style={styles.infoValue}>{getDisplayDuration()}</Text>
          </View>
        </View>
      )}
      
      <RouteTypeTabs 
        activeTab={activeRouteType} 
        onTabChange={handleRouteTypeChange}
        routesInfo={tabRoutesInfo}
        loadingState={tabsLoadingState}
      />
      
      <TouchableOpacity 
        style={styles.startButton}
        onPress={onStartNavigation}
      >
        <Ionicons name="navigate" size={20} color="white" />
        <Text style={styles.startButtonText}>Начать движение</Text>
      </TouchableOpacity>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cancelButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  routeInfo: {
    flex: 1,
    marginRight: 8,
  },
  routeType: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
  },
  routeMetrics: {
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  expandButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  details: {
    marginBottom: 16,
  },
  routePoints: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  startDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.primary,
    marginRight: 8,
  },
  verticalLine: {
    width: 1,
    height: '100%',
    backgroundColor: theme.colors.border,
    marginHorizontal: 8,
  },
  endDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.error,
    marginLeft: 8,
  },
  pointText: {
    flex: 1,
    fontSize: 15,
    color: theme.colors.textPrimary,
  },
  additionalInfo: {
    marginTop: 16,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  startButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  startButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default RouteBottomPanel; 