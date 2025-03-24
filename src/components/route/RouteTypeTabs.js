import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';

/**
 * Компонент для отображения горизонтальных вкладок выбора типа маршрута с информацией о времени
 * @param {string} activeTab - ID активной вкладки (car, walk, bicycle, public_transport, subway)
 * @param {function} onTabChange - Функция обратного вызова при смене вкладки
 * @param {object} routesInfo - Объект с информацией о маршрутах для каждого типа транспорта
 * @param {object} loadingState - Объект с информацией о загрузке маршрутов
 */
const RouteTypeTabs = ({ 
  activeTab = 'car',
  onTabChange,
  routesInfo = {},
  loadingState = {}
}) => {
  // Форматирование времени маршрута
  const formatDuration = (minutes) => {
    if (minutes === undefined || minutes === null) return "—";
    
    if (minutes < 1) {
      return "<1";
    }
    
    if (minutes < 60) {
      return `${Math.round(minutes)}`;
    }
    
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    
    if (mins === 0) {
      return `${hours}ч`;
    }
    
    return `${hours}ч${mins}`;
  };

  // Получение времени для типа маршрута
  const getDurationForTab = (tabId) => {
    const routeInfo = routesInfo[tabId];
    if (!routeInfo) return null;
    
    return routeInfo.duration;
  };

  // Проверка, загружается ли маршрут
  const isLoading = (tabId) => {
    return loadingState[tabId] === true;
  };

  // Все доступные вкладки
  const tabs = [
    { 
      id: 'car', 
      title: 'Маршрут для авто', 
      icon: 'car',
      shortTitle: 'Авто',
    },
    { 
      id: 'walk', 
      title: 'Маршрут для пеших прогулок', 
      icon: 'walk',
      shortTitle: 'Пешком',
    },
    {
      id: 'bicycle',
      title: 'Маршрут для велосипедов',
      icon: 'bicycle',
      shortTitle: 'Вело',
    },
    { 
      id: 'public_transport', 
      title: 'Маршрут для наземного транспорта', 
      icon: 'bus',
      shortTitle: 'Транспорт',
    },
    { 
      id: 'subway', 
      title: 'Маршрут метро', 
      icon: 'subway', 
      shortTitle: 'Метро',
      disabled: true // Временно отключена
    }
  ];

  return (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {tabs.map((tab) => {
        // Получаем длительность маршрута
        const duration = getDurationForTab(tab.id);
        // Проверяем состояние загрузки
        const loading = isLoading(tab.id);
        // Проверяем активность таба
        const isActive = activeTab === tab.id;
        // Проверяем доступность таба
        const isDisabled = tab.disabled === true;
        
        return (
          <TouchableOpacity
            key={tab.id}
            style={[
              styles.tab,
              isActive && styles.activeTab,
              isDisabled && styles.disabledTab
            ]}
            onPress={() => !isDisabled && onTabChange && onTabChange(tab.id)}
            disabled={isDisabled}
            activeOpacity={0.7}
          >
            <Ionicons 
              name={`${tab.icon}${isActive ? '' : '-outline'}`}
              size={20} 
              color={isActive ? 'white' : theme.colors.textSecondary} 
            />
            
            <View style={styles.tabTextContainer}>
              <Text 
                style={[
                  styles.tabText, 
                  isActive && styles.activeTabText,
                  isDisabled && styles.disabledTabText
                ]}
                numberOfLines={1}
              >
                {tab.shortTitle}
              </Text>
              
              {loading ? (
                <ActivityIndicator 
                  size="small" 
                  color={isActive ? 'white' : theme.colors.primary} 
                  style={styles.loader}
                />
              ) : (
                duration !== null && (
                  <Text 
                    style={[
                      styles.durationText, 
                      isActive && styles.activeDurationText,
                      isDisabled && styles.disabledTabText
                    ]}
                  >
                    {formatDuration(duration)}
                  </Text>
                )
              )}
            </View>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingVertical: 4,
    paddingHorizontal: 4,
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    marginBottom: 16,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginHorizontal: 2,
  },
  activeTab: {
    backgroundColor: theme.colors.primary,
  },
  disabledTab: {
    opacity: 0.5,
  },
  tabTextContainer: {
    flexDirection: 'column',
    marginLeft: 6,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.textPrimary,
  },
  activeTabText: {
    color: 'white',
  },
  disabledTabText: {
    color: theme.colors.textSecondary,
  },
  durationText: {
    fontSize: 10,
    color: theme.colors.primary,
    fontWeight: 'bold',
    marginTop: 2,
  },
  activeDurationText: {
    color: 'white',
  },
  loader: {
    marginTop: 2,
    height: 10,
  }
});

export default RouteTypeTabs; 