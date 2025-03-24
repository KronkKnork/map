import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';

/**
 * Компонент для отображения горизонтальных вкладок выбора типа маршрута
 * @param {string} activeTab - ID активной вкладки (car, walk, bicycle, public_transport, subway, details)
 * @param {function} onTabChange - Функция обратного вызова при смене вкладки
 */
const RouteTypeTabs = ({ 
  activeTab = 'car',
  onTabChange 
}) => {
  // Определяем соответствие между ID таба и нужным режимом для API маршрутов
  const tabModeMap = {
    car: 'DRIVING',
    walk: 'WALKING',
    bicycle: 'BICYCLING',
    public_transport: 'TRANSIT',
    subway: 'TRANSIT'
  };

  // Обработчик изменения таба
  const handleTabChange = (tabId) => {
    if (onTabChange) {
      // Если это вкладка с деталями, передаем ее ID напрямую
      if (tabId === 'details') {
        onTabChange(tabId);
      } else {
        // Иначе передаем соответствующий режим для API
        onTabChange(tabModeMap[tabId] || 'DRIVING');
      }
    }
  };

  const tabs = [
    { 
      id: 'car', 
      title: 'Маршрут для авто', 
      icon: 'car-outline' 
    },
    { 
      id: 'walk', 
      title: 'Маршрут для пеших прогулок', 
      icon: 'walk-outline' 
    },
    {
      id: 'bicycle',
      title: 'Маршрут для велосипедов',
      icon: 'bicycle-outline'
    },
    { 
      id: 'public_transport', 
      title: 'Маршрут для наземного транспорта', 
      icon: 'bus-outline' 
    },
    { 
      id: 'subway', 
      title: 'Маршрут метро', 
      icon: 'subway-outline' 
    },
    { 
      id: 'details', 
      title: 'Детали маршрута', 
      icon: 'list-outline' 
    },
  ];

  return (
    <View style={styles.container}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[
              styles.tab,
              activeTab === tab.id && styles.activeTab
            ]}
            onPress={() => handleTabChange(tab.id)}
          >
            <View style={styles.tabContent}>
              <Ionicons 
                name={tab.icon} 
                size={20} 
                color={activeTab === tab.id ? '#FFFFFF' : theme.colors.textSecondary} 
                style={styles.tabIcon}
              />
              <Text 
                style={[
                  styles.tabText,
                  activeTab === tab.id && styles.activeTabText
                ]}
                numberOfLines={2}
              >
                {tab.title}
              </Text>
            </View>
            {activeTab === tab.id && (
              <View style={styles.activeDot} />
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    marginTop: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  scrollContent: {
    paddingHorizontal: 0,
  },
  tab: {
    padding: 12,
    minWidth: 130,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: theme.colors.primary,
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIcon: {
    marginRight: 8,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.textSecondary,
    maxWidth: 100,
  },
  activeTabText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  activeDot: {
    position: 'absolute',
    right: 8,
    top: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
});

export default RouteTypeTabs; 