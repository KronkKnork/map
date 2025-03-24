import React from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, Image } from 'react-native';
import { observer } from 'mobx-react';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { useNavigation } from '@react-navigation/native';

/**
 * Экран для отображения любимых маршрутов пользователя
 */
const FavoritesScreen = observer(() => {
  const navigation = useNavigation();
  
  // Пример данных для демонстрации
  const demoRoutes = [
    { 
      id: '1', 
      name: 'Дом — Работа', 
      origin: 'ул. Пушкина, 10, кв. 5',
      destination: 'Бизнес-центр "Горизонт"',
      distance: 5.7,
      duration: 25,
      transportType: 'car',
      addedAt: '2025-03-01T12:00:00.000Z'
    },
    { 
      id: '2', 
      name: 'Работа — Спортзал', 
      origin: 'Бизнес-центр "Горизонт"',
      destination: 'Фитнес-клуб "Олимпия"',
      distance: 3.2,
      duration: 15,
      transportType: 'car',
      addedAt: '2025-03-02T10:30:00.000Z'
    },
    { 
      id: '3', 
      name: 'Прогулка в парке', 
      origin: 'ул. Пушкина, 10, кв. 5',
      destination: 'Центральный парк',
      distance: 2.8,
      duration: 35,
      transportType: 'walk',
      addedAt: '2025-03-05T18:15:00.000Z'
    },
  ];

  // Получение иконки для типа транспорта
  const getTransportIcon = (type) => {
    switch (type) {
      case 'car':
        return 'car-outline';
      case 'walk':
        return 'walk-outline';
      case 'bicycle':
        return 'bicycle-outline';
      case 'public_transport':
        return 'bus-outline';
      default:
        return 'navigate-outline';
    }
  };

  // Форматирование длительности маршрута
  const formatDuration = (minutes) => {
    if (minutes < 60) {
      return `${minutes} мин`;
    } else {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return remainingMinutes > 0 ? `${hours} ч ${remainingMinutes} мин` : `${hours} ч`;
    }
  };

  // Обработчик перехода к маршруту
  const handleNavigateToRoute = (route) => {
    // Здесь был бы переход на экран маршрута с параметрами
    console.log(`Переход к маршруту: ${route.name}`);
    
    // Переходим на экран карты с параметрами маршрута
    navigation.navigate('Map', {
      routeData: {
        origin: route.origin,
        destination: route.destination,
        transportType: route.transportType,
      }
    });
  };

  // Обработчик удаления маршрута
  const handleDeleteRoute = (routeId) => {
    console.log(`Удалить маршрут: ${routeId}`);
    // Здесь был бы код для удаления маршрута
  };

  const renderItem = ({ item }) => {
    // Форматируем дату добавления
    const addedDate = new Date(item.addedAt);
    const formattedDate = `${addedDate.getDate()}.${addedDate.getMonth() + 1}.${addedDate.getFullYear()}`;

    return (
      <TouchableOpacity 
        style={styles.routeItem}
        onPress={() => handleNavigateToRoute(item)}
      >
        <View style={styles.routeContent}>
          <View style={styles.routeHeader}>
            <Text style={styles.routeName}>{item.name}</Text>
            <TouchableOpacity 
              style={styles.favoriteAction}
              onPress={() => handleDeleteRoute(item.id)}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="heart" size={24} color={theme.colors.error} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.routePoints}>
            <View style={styles.routePoint}>
              <View style={styles.routePointMarker}>
                <View style={styles.originMarker} />
              </View>
              <Text style={styles.routePointText} numberOfLines={1}>{item.origin}</Text>
            </View>
            
            <View style={styles.routePointConnector}>
              <View style={styles.connectorLine} />
            </View>
            
            <View style={styles.routePoint}>
              <View style={styles.routePointMarker}>
                <View style={styles.destinationMarker} />
              </View>
              <Text style={styles.routePointText} numberOfLines={1}>{item.destination}</Text>
            </View>
          </View>
          
          <View style={styles.routeDetails}>
            <View style={styles.routeDetail}>
              <Ionicons name={getTransportIcon(item.transportType)} size={16} color={theme.colors.textSecondary} />
              <Text style={styles.routeDetailText}>{formatDuration(item.duration)}</Text>
            </View>
            
            <View style={styles.routeDetail}>
              <Ionicons name="resize" size={16} color={theme.colors.textSecondary} />
              <Text style={styles.routeDetailText}>{item.distance.toFixed(1)} км</Text>
            </View>
            
            <View style={styles.routeDetail}>
              <Ionicons name="time-outline" size={16} color={theme.colors.textSecondary} />
              <Text style={styles.routeDetailText}>{formattedDate}</Text>
            </View>
          </View>
          
          <TouchableOpacity 
            style={styles.startButton}
            onPress={() => handleNavigateToRoute(item)}
          >
            <Ionicons name="navigate" size={18} color="white" />
            <Text style={styles.startButtonText}>Начать маршрут</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Любимые маршруты</Text>
      </View>
      
      {demoRoutes.length > 0 ? (
        <FlatList
          data={demoRoutes}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.routesList}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="navigate-outline" size={60} color={theme.colors.textSecondary} />
          <Text style={styles.emptyText}>У вас пока нет сохраненных маршрутов</Text>
          <Text style={styles.emptySubtext}>
            Сохраняйте часто используемые маршруты для быстрого доступа
          </Text>
          <TouchableOpacity 
            style={styles.exploreButton}
            onPress={() => navigation.navigate('Map')}
          >
            <Text style={styles.exploreButtonText}>Открыть карту</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    padding: 16,
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
  },
  routesList: {
    padding: 16,
  },
  routeItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  routeContent: {
    padding: 16,
  },
  routeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  routeName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    flex: 1,
  },
  favoriteAction: {
    padding: 4,
  },
  routePoints: {
    marginBottom: 16,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6,
  },
  routePointMarker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    marginRight: 10,
  },
  originMarker: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.primary,
  },
  destinationMarker: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.error,
  },
  routePointConnector: {
    paddingLeft: 10,
    height: 20,
  },
  connectorLine: {
    width: 1,
    height: '100%',
    backgroundColor: theme.colors.border,
  },
  routePointText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    flex: 1,
  },
  routeDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  routeDetail: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  routeDetailText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginLeft: 4,
  },
  startButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  startButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
  },
  exploreButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  exploreButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default FavoritesScreen;
