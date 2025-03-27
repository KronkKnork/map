import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView,
  ActivityIndicator 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';

/**
 * Компонент с вкладками для выбора типа маршрута
 * 
 * @param {String} activeTab - Активная вкладка
 * @param {Function} onTabChange - Функция для смены вкладки
 * @param {Object} routesInfo - Информация о маршрутах по типам
 * @param {Object} loadingState - Состояние загрузки маршрутов по типам
 * @param {Boolean} showLoadingStates - Показывать ли состояние загрузки
 */
const RouteTypeTabs = ({ 
  activeTab = 'car',
  onTabChange,
  routesInfo = {},
  loadingState = {},
  showLoadingStates = true
}) => {
  // Форматирование времени маршрута
  const formatDuration = (minutes) => {
    if (minutes === undefined || minutes === null) return null;
    
    if (minutes < 1) {
      return "<1м";
    }
    
    if (minutes < 60) {
      return `${Math.round(minutes)}м`;
    }
    
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    
    if (mins === 0) {
      return `${hours}ч`;
    }
    
    return `${hours}ч ${mins}м`;
  };

  // Получение времени для типа маршрута
  const getRouteDuration = (routeType) => {
    const routeInfo = routesInfo[routeType];
    return routeInfo ? routeInfo.duration : null;
  };

  // Проверка загрузки для типа маршрута
  const isRouteLoading = (routeType) => {
    return loadingState[routeType] === true;
  };

  // Типы маршрутов
  const tabs = [
    {
      id: 'car',
      title: 'Маршрут на автомобиле', 
      icon: 'car',
      shortTitle: 'Авто',
    },
    {
      id: 'walk',
      title: 'Пешеходный маршрут', 
      icon: 'walk',
      shortTitle: 'Пешком',
    },
    {
      id: 'bicycle',
      title: 'Велосипедный маршрут', 
      icon: 'bicycle',
      shortTitle: 'Вело',
    },
    {
      id: 'public_transport',
      title: 'Маршрут для наземного транспорта', 
      icon: 'bus',
      shortTitle: 'Транспорт',
      disabled: true
    }
  ];

  return (
    <View style={styles.container}>
      <View style={styles.tabsContainer}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const duration = getRouteDuration(tab.id);
          const loading = isRouteLoading(tab.id);
          const formattedDuration = formatDuration(duration);
          
          return (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tab, isActive && styles.activeTab]}
              onPress={() => onTabChange && onTabChange(tab.id)}
              disabled={tab.disabled}
              activeOpacity={0.7}
            >
              <View style={styles.tabContent}>
                <Ionicons 
                  name={tab.icon}
                  size={20} 
                  color={isActive ? 'white' : '#FFFFFF99'} 
                />
                
              </View>
              
              {duration !== null && (
                <Text style={[styles.durationText, isActive && styles.activeDurationText]}>
                  {formattedDuration}
                </Text>
              )}
              
              {showLoadingStates && loading && (
                <ActivityIndicator 
                  size="small" 
                  color={isActive ? 'white' : '#FFFFFF99'} 
                  style={styles.loader}
                />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.primary,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
    paddingBottom: 20,
    display: 'flex',
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingTop: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  activeTab: {
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTabText: {
    fontWeight: '600',
  },
  durationText: {
    color: '#FFFFFF99',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
    marginTop: 4,
  },
  activeDurationText: {
    fontWeight: '600',
    color: '#FFFFFF',
  },
  loader: {
    marginLeft: 6,
  }
});

export default RouteTypeTabs;