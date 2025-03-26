import 'react-native-gesture-handler';
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, StyleSheet } from 'react-native';

// Импортируем заглушки для экранов (позже заменим на реальные компоненты)
import MapScreen from '../screens/MapScreen';
import MainScreen from '../screens/MainScreen';
import RouteScreen from '../screens/RouteScreen';
import FavoritesScreen from '../screens/FavoritesScreen';
import ProfileScreen from '../screens/ProfileScreen';

// Импорт темы приложения
import { theme } from '../theme';

// Создаем навигатор для нижнего меню
const Tab = createBottomTabNavigator();

// Компонент для кастомной иконки таба
const TabBarIcon = ({ focused, name, label }) => {
  return (
    <View style={styles.tabIconContainer}>
      <Ionicons 
        name={name} 
        size={22} 
        color={focused ? theme.colors.primary : theme.colors.textSecondary} 
      />
      <Text 
        style={[styles.tabLabel, { color: focused ? theme.colors.primary : theme.colors.textSecondary }]}
        numberOfLines={1} 
        ellipsizeMode="tail"
      >
        {label}
      </Text>
    </View>
  );
};

// Компонент с нижним меню
export const TabNavigator = () => {
  return (
    <Tab.Navigator
      initialRouteName="Main"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          switch (route.name) {
            case 'Route':
              iconName = focused ? 'navigate' : 'navigate-outline';
              break;
            case 'Map':
              iconName = focused ? 'map' : 'map-outline';
              break;
            case 'Main':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Places':
              iconName = focused ? 'location' : 'location-outline';
              break;
            case 'Profile':
              iconName = focused ? 'person' : 'person-outline';
              break;
            default:
              iconName = 'help-outline';
          }

          return <TabBarIcon focused={focused} name={iconName} label={getLabelForRoute(route.name)} />;
        },
        tabBarStyle: styles.tabBar,
        tabBarItemStyle: styles.tabItem,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarShowLabel: false,
      })}
    >
      <Tab.Screen 
        name="Route" 
        component={RouteScreen} 
        options={{ 
          title: 'Маршрут',
        }} 
      />
      <Tab.Screen 
        name="Map" 
        component={MapScreen} 
        options={{ 
          title: 'Карта',
        }} 
      />
      <Tab.Screen 
        name="Main" 
        component={MainScreen} 
        options={{ 
          title: 'Главная',
        }} 
      />
      <Tab.Screen 
        name="Places" 
        component={FavoritesScreen} 
        options={{ 
          title: 'Места',
        }} 
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen} 
        options={{ 
          title: 'Профиль',
        }} 
      />
    </Tab.Navigator>
  );
};

// Создаем стек навигатор для основных переходов между экранами
const Stack = createStackNavigator();

// Основная навигация приложения
export const AppNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={TabNavigator} />
    </Stack.Navigator>
  );
};

// Стили для компонентов навигации
const styles = StyleSheet.create({
  tabIconContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    padding: 2,
  },
  tabLabel: {
    fontSize: 10, 
    marginTop: 2,
    fontWeight: '500',
    textAlign: 'center', 
    width: '100%', 
  },
  tabBar: {
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    elevation: 8,
    shadowColor: theme.colors.shadowMedium,
    height: 60, 
    paddingTop: 6,
    paddingBottom: 6,
    justifyContent: 'center', 
    alignItems: 'center', 
  },
  tabItem: {
    height: 50, 
    paddingVertical: 4, 
    paddingHorizontal: 8, 
  },
});

// Вспомогательная функция для получения названия вкладки
const getLabelForRoute = (routeName) => {
  switch (routeName) {
    case 'Route':
      return 'Маршрут';
    case 'Map':
      return 'Карта';
    case 'Main':
      return 'Главная';
    case 'Places':
      return 'Места';
    case 'Profile':
      return 'Профиль';
    default:
      return '';
  }
};
