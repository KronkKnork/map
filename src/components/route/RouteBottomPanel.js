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
 */
const RouteBottomPanel = ({ 
  route,
  routeInfo,
  onCancel,
  onStartNavigation,
  onRouteTypeChange,
  originName = "Исходная точка",
  destinationName = "Конечная точка",
  activeRouteType = 'car'
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
  
  // Данные о времени в пути для разных типов транспорта
  const routeTimes = useMemo(() => {
    if (!routeInfo || !routeInfo.distance) {
      // Значения по умолчанию, если нет данных о маршруте
      console.log('RouteBottomPanel: нет данных о маршруте, устанавливаю значения по умолчанию');
      return {
        car: 0,
        walk: 0,
        bicycle: 0, 
        public_transport: 0
      };
    }
    
    // Получаем данные расстояния и длительности из routeInfo
    const distance = routeInfo.distance || 0;
    const baseDuration = routeInfo.duration || 0;
    
    console.log('RouteBottomPanel рассчитывает время для маршрута:', {
      distance,
      duration: baseDuration,
      isApproximate: routeInfo.isApproximate,
      activeRouteType
    });
    
    // Рассчитываем время для автомобиля
    // Если значение слишком маленькое, берем минимум 5 минут
    const carTime = Math.max(5, Math.round(baseDuration));
    
    // Пешком - средняя скорость 5 км/ч
    const walkTime = Math.max(1, Math.round((distance / 5) * 60));
    
    // Велосипед - средняя скорость 15 км/ч
    const bicycleTime = Math.max(2, Math.round((distance / 15) * 60));
    
    // Общественный транспорт - средняя скорость 25 км/ч + время ожидания
    const ptTime = Math.max(5, Math.round((distance / 25) * 60 + 10)); // +10 минут на ожидание
    
    const result = {
      car: carTime,
      walk: walkTime,
      bicycle: bicycleTime,
      public_transport: ptTime
    };
    
    console.log('RouteBottomPanel рассчитал времена:', result);
    
    return result;
  }, [routeInfo]);
  
  // Преобразуем время из минут в формат часы:минуты для более удобного отображения
  const formatDuration = (minutes) => {
    if (minutes === undefined || minutes === null) return '--';
    
    // Обеспечиваем, что у нас всегда положительное число
    const positiveMinutes = Math.max(1, Math.round(minutes));
    
    if (positiveMinutes < 60) {
      return `${positiveMinutes}м`;
    } else {
      const hours = Math.floor(positiveMinutes / 60);
      const mins = Math.round(positiveMinutes % 60);
      return `${hours}ч ${mins > 0 ? `${mins}м` : ''}`;
    }
  };
  
  // Преобразуем расстояние для более удобного отображения
  const formatDistance = (kilometers) => {
    if (!kilometers && kilometers !== 0) return '--';
    return `${kilometers.toFixed(1)} км`;
  };
  
  // Переключение режима маршрута
  const handleRouteTypeChange = (type) => {
    console.log('RouteBottomPanel: переключение типа маршрута на', type);
    if (onRouteTypeChange) {
      onRouteTypeChange(type);
    }
  };
  
  // Функция для переключения развернутого/свернутого состояния
  const toggleExpanded = () => {
    setExpanded(!expanded);
  };
  
  // Получаем фактическое время для активного режима
  const getActiveDuration = () => {
    if (!routeInfo) return '--';
    
    let activeDuration;
    
    switch (activeRouteType) {
      case 'DRIVING':
      case 'car':
        activeDuration = routeTimes.car;
        break;
      case 'WALKING':
      case 'walk':
        activeDuration = routeTimes.walk;
        break;
      case 'BICYCLING':
      case 'bicycle':
        activeDuration = routeTimes.bicycle;
        break;
      case 'TRANSIT':
      case 'public_transport':
        activeDuration = routeTimes.public_transport;
        break;
      default:
        activeDuration = routeInfo.duration;
    }
    
    return formatDuration(activeDuration);
  };
  
  // Если нет данных о маршруте или информации о маршруте, ничего не отображаем
  if (!route || !route.origin || !route.destination) {
    return null;
  }
  
  return (
    <View style={styles.container}>
      {/* Главная информация о маршруте */}
      <View style={styles.mainInfoContainer}>
        <View style={styles.routeInfo}>
          {routeInfo ? (
            <>
              <View style={styles.timeDistanceContainer}>
                <Text style={styles.duration}>
                  {getActiveDuration()}
                </Text>
                {routeInfo.isApproximate && (
                  <Text style={styles.approximation}>примерно</Text>
                )}
                <Text style={styles.distance}>
                  • {formatDistance(routeInfo.distance)}
                </Text>
              </View>
              {routeInfo.isApproximate && (
                <Text style={styles.warning}>
                  Точные данные недоступны. Показана приблизительная информация.
                </Text>
              )}
            </>
          ) : (
            <View style={styles.timeDistanceContainer}>
              <Text style={styles.loadingText}>Расчет маршрута...</Text>
            </View>
          )}
        </View>
        
        <TouchableOpacity style={styles.closeButton} onPress={onCancel}>
          <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Выбор типа транспорта */}
      <View style={styles.transportTypeWrapper}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.transportTypesContainer}
        >
          <TouchableOpacity
            style={[
              styles.transportTypeButton,
              activeRouteType === 'car' && styles.transportTypeButtonActive
            ]}
            onPress={() => handleRouteTypeChange('DRIVING')}
          >
            <Ionicons 
              name="car-outline" 
              size={22} 
              color={activeRouteType === 'car' ? 'white' : theme.colors.textSecondary}
            />
            <Text 
              style={[
                styles.transportTypeText,
                activeRouteType === 'car' && styles.transportTypeTextActive
              ]}
            >
              {formatDuration(routeTimes.car)}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.transportTypeButton,
              activeRouteType === 'public_transport' && styles.transportTypeButtonActive
            ]}
            onPress={() => handleRouteTypeChange('TRANSIT')}
          >
            <Ionicons 
              name="bus-outline" 
              size={22} 
              color={activeRouteType === 'public_transport' ? 'white' : theme.colors.textSecondary}
            />
            <Text 
              style={[
                styles.transportTypeText,
                activeRouteType === 'public_transport' && styles.transportTypeTextActive
              ]}
            >
              {formatDuration(routeTimes.public_transport)}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.transportTypeButton,
              activeRouteType === 'bicycle' && styles.transportTypeButtonActive
            ]}
            onPress={() => handleRouteTypeChange('BICYCLING')}
          >
            <Ionicons 
              name="bicycle-outline" 
              size={22} 
              color={activeRouteType === 'bicycle' ? 'white' : theme.colors.textSecondary}
            />
            <Text 
              style={[
                styles.transportTypeText,
                activeRouteType === 'bicycle' && styles.transportTypeTextActive
              ]}
            >
              {formatDuration(routeTimes.bicycle)}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.transportTypeButton,
              activeRouteType === 'walk' && styles.transportTypeButtonActive
            ]}
            onPress={() => handleRouteTypeChange('WALKING')}
          >
            <Ionicons 
              name="walk-outline" 
              size={22} 
              color={activeRouteType === 'walk' ? 'white' : theme.colors.textSecondary}
            />
            <Text 
              style={[
                styles.transportTypeText,
                activeRouteType === 'walk' && styles.transportTypeTextActive
              ]}
            >
              {formatDuration(routeTimes.walk)}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Информация о начальной и конечной точке */}
      <View style={styles.routePointsContainer}>
        <View style={styles.routePoint}>
          <View style={styles.pointIconContainer}>
            <Ionicons 
              name="location" 
              size={16} 
              color={theme.colors.primary} 
            />
          </View>
          <Text style={styles.pointText} numberOfLines={1}>
            {originName}
          </Text>
          
          <TouchableOpacity style={styles.editPointButton}>
            <Ionicons name="create-outline" size={18} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>
        
        <View style={styles.routePointConnector}>
          <View style={styles.connectorLine} />
        </View>
        
        <View style={styles.routePoint}>
          <View style={styles.pointIconContainer}>
            <Ionicons 
              name="location" 
              size={16} 
              color={theme.colors.error} 
            />
          </View>
          <Text style={styles.pointText} numberOfLines={1}>
            {destinationName}
          </Text>
          
          <TouchableOpacity style={styles.editPointButton}>
            <Ionicons name="create-outline" size={18} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Кнопка начала маршрута */}
      <TouchableOpacity 
        style={styles.startButton}
        onPress={onStartNavigation}
      >
        <Ionicons name="navigate" size={20} color="white" style={styles.startButtonIcon} />
        <Text style={styles.startButtonText}>Начать маршрут</Text>
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
  mainInfoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  routeInfo: {
    flex: 1,
    marginRight: 8,
  },
  timeDistanceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  duration: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    marginRight: 4,
  },
  approximation: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
    marginRight: 4,
  },
  distance: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginLeft: 4,
  },
  warning: {
    fontSize: 12,
    color: theme.colors.warning,
    fontStyle: 'italic',
  },
  loadingText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  transportTypeWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  transportTypesContainer: {
    flexDirection: 'row',
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  transportTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginHorizontal: 4,
  },
  transportTypeButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  transportTypeText: {
    fontSize: 14,
    color: theme.colors.textPrimary,
    marginLeft: 6,
    fontWeight: '500',
  },
  transportTypeTextActive: {
    color: 'white',
    fontWeight: '600',
  },
  routePointsContainer: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 12,
    marginBottom: 16,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  pointIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.03)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  routePointConnector: {
    paddingLeft: 14,
    height: 16,
  },
  connectorLine: {
    width: 1,
    height: '100%',
    backgroundColor: theme.colors.border,
  },
  pointText: {
    flex: 1,
    fontSize: 15,
    color: theme.colors.textPrimary,
  },
  editPointButton: {
    padding: 8,
  },
  startButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  startButtonIcon: {
    marginRight: 8,
  },
  startButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default RouteBottomPanel; 