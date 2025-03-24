import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Dimensions } from 'react-native';
import { observer } from 'mobx-react-lite';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import MapViewComponent from '../components/map/MapView';
import * as Location from 'expo-location';
import RouteBottomPanel from '../components/route/RouteBottomPanel';

/**
 * Экран построения и навигации по маршруту
 * Позволяет пользователю выбрать начальную и конечную точки маршрута,
 * просмотреть варианты маршрутов и начать навигацию
 */
const RouteScreen = () => {
  const mapRef = useRef(null);
  const [routes, setRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [startPoint, setStartPoint] = useState('Текущее местоположение');
  const [endPoint, setEndPoint] = useState('');
  const [loading, setLoading] = useState(false);
  const [routeDetails, setRouteDetails] = useState(null);
  const [location, setLocation] = useState(null);
  const [region, setRegion] = useState({
    latitude: 59.9343, // Санкт-Петербург по умолчанию
    longitude: 30.3351,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  
  // Данные о маршруте, которые будут переданы в компонент карты
  const [routeData, setRouteData] = useState(null);
  
  // Добавляем состояние для активного типа транспорта
  const [activeTransportType, setActiveTransportType] = useState('car');

  // Заглушка для конечных точек маршрутов (для демонстрации)
  const mockDestinations = [
    { id: 1, name: 'Эрмитаж', latitude: 59.9398, longitude: 30.3146 },
    { id: 2, name: 'Петропавловская крепость', latitude: 59.9502, longitude: 30.3170 },
    { id: 3, name: 'Спас на Крови', latitude: 59.9400, longitude: 30.3289 },
  ];

  // Получение текущего местоположения
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.error('Доступ к геолокации не предоставлен');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setLocation(location);

      // Обновляем регион карты на текущую локацию пользователя
      const newRegion = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      setRegion(newRegion);
    })();
  }, []);

  // Генерация маршрутов при выборе конечной точки
  useEffect(() => {
    if (endPoint) {
      setLoading(true);
      
      // Имитация задержки загрузки маршрутов
      setTimeout(() => {
        // Находим выбранное место по имени
        const destination = mockDestinations.find(dest => dest.name === endPoint);
        
        if (destination) {
          // Устанавливаем данные для маршрута
          const originCoords = location ? 
            { latitude: location.coords.latitude, longitude: location.coords.longitude } : 
            { latitude: region.latitude, longitude: region.longitude };
            
          setRouteData({
            origin: originCoords,
            destination: { 
              latitude: destination.latitude, 
              longitude: destination.longitude 
            }
          });
          
          // Получаем регион, который охватывает начальную и конечную точки маршрута
          const bounds = getBoundsForRoute(originCoords, destination);
          if (mapRef.current) {
            mapRef.current.animateToRegion(bounds, 1000);
          }
          
          // Имитируем варианты маршрутов
          setRoutes([
            { 
              id: 1, 
              name: 'Самый быстрый', 
              duration: '25 мин', 
              distance: '5.2 км', 
              traffic: 'Низкий',
              mode: 'DRIVING',
              color: theme.colors.primary
            },
            { 
              id: 2, 
              name: 'Альтернативный', 
              duration: '30 мин', 
              distance: '4.8 км', 
              traffic: 'Средний',
              mode: 'DRIVING',
              color: '#FF8E1E'
            },
            { 
              id: 3, 
              name: 'Без платных дорог', 
              duration: '35 мин', 
              distance: '6.1 км', 
              traffic: 'Высокий',
              mode: 'DRIVING',
              color: theme.colors.error
            },
          ]);
          
          // Выбираем первый маршрут по умолчанию
          setSelectedRoute({
            id: 1, 
            name: 'Самый быстрый', 
            duration: '25 мин', 
            distance: '5.2 км', 
            traffic: 'Низкий',
            mode: 'DRIVING',
            color: theme.colors.primary
          });
        }
        
        setLoading(false);
      }, 1500);
    }
  }, [endPoint, location]);

  // Обработчик выбора маршрута
  const handleRouteSelect = (route) => {
    setSelectedRoute(route);
    
    // Обновляем цвет маршрута на карте
    if (routeData) {
      setRouteData({
        ...routeData,
        color: route.color,
        mode: route.mode
      });
    }
  };

  // Обработчик события готовности маршрута
  const handleRouteReady = (result) => {
    setRouteDetails({
      distance: result.distance,
      duration: result.duration,
    });
    
    // Получаем регион, который охватывает весь маршрут
    if (mapRef.current) {
      const margin = Math.min(Dimensions.get('window').width, Dimensions.get('window').height) * 0.1;
      mapRef.current.fitToCoordinates(result.coordinates, {
        edgePadding: { top: margin, right: margin, bottom: margin, left: margin },
        animated: true,
      });
    }
  };

  // Обработчик начала навигации
  const handleStartNavigation = () => {
    // Здесь будет логика начала навигации по выбранному маршруту
    console.log('Начинаем навигацию по маршруту:', selectedRoute);
  };
  
  // Обработчик изменения типа транспорта
  const handleRouteTypeChange = (mode) => {
    // Преобразуем формат типа транспорта из RouteBottomPanel в формат MapViewComponent
    const modeMapping = {
      'DRIVING': 'car',
      'WALKING': 'walk',
      'BICYCLING': 'bicycle',
      'TRANSIT': 'public_transport'
    };
    
    // Обновляем активный тип транспорта в состоянии
    const newTransportType = modeMapping[mode] || 'car';
    setActiveTransportType(newTransportType);
    
    // Обновляем маршрут с новым типом транспорта
    if (routeData) {
      setRouteData({
        ...routeData,
        mode: mode
      });
    }
  };
  
  // Функция для отмены маршрута
  const handleCancelRoute = () => {
    setEndPoint('');
    setRoutes([]);
    setSelectedRoute(null);
    setRouteData(null);
    setRouteDetails(null);
  };

  // Функция для определения региона карты, включающего начальную и конечную точки
  const getBoundsForRoute = (origin, destination) => {
    const latDelta = Math.abs(origin.latitude - destination.latitude) * 1.5;
    const lngDelta = Math.abs(origin.longitude - destination.longitude) * 1.5;
    
    return {
      latitude: (origin.latitude + destination.latitude) / 2,
      longitude: (origin.longitude + destination.longitude) / 2,
      latitudeDelta: Math.max(0.01, latDelta),
      longitudeDelta: Math.max(0.01, lngDelta),
    };
  };

  // Заглушка для выбора конечного пункта
  const selectDestination = (destination) => {
    setEndPoint(destination.name);
  };

  return (
    <View style={styles.container}>
      {/* Карта с маршрутом */}
      <View style={styles.mapContainer}>
        <MapViewComponent
          mapRef={mapRef}
          region={region}
          onRegionChangeComplete={setRegion}
          onLocationPress={() => {
            // При нажатии на кнопку геолокации - перемещаемся к текущему местоположению
            if (location) {
              const newRegion = {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              };
              setRegion(newRegion);
              mapRef.current?.animateToRegion(newRegion, 1000);
            }
          }}
          markers={[
            // Маркер текущего местоположения
            ...(location ? [{
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              title: 'Вы здесь',
              description: 'Ваше текущее местоположение',
              isCurrentLocation: true,
            }] : []),
            // Маркер выбранного пункта назначения
            ...(endPoint ? [mockDestinations.find(dest => dest.name === endPoint)].filter(Boolean).map(dest => ({
              latitude: dest.latitude,
              longitude: dest.longitude,
              title: dest.name,
              description: `Пункт назначения: ${dest.name}`,
              isSelectedPlace: true,
            })) : [])
          ]}
          route={routeData ? {
            origin: routeData.origin,
            destination: routeData.destination,
            waypoints: routeData.waypoints || [],
          } : null}
          routeOptions={{
            mode: routeData?.mode || 'DRIVING',
            strokeColor: selectedRoute?.color || theme.colors.primary,
            strokeWidth: 5,
            showEstimates: true,
            onError: (error) => console.error('Ошибка маршрута:', error),
          }}
          onRouteReady={handleRouteReady}
        />
      </View>

      {/* Нижняя панель с информацией о маршруте */}
      {routeData && routeDetails && (
        <RouteBottomPanel
          route={routeData}
          routeInfo={routeDetails}
          onCancel={handleCancelRoute}
          onStartNavigation={handleStartNavigation}
          onRouteTypeChange={handleRouteTypeChange}
          originName={startPoint}
          destinationName={endPoint}
          activeRouteType={activeTransportType}
        />
      )}

      {/* Панель выбора маршрута (отображается, если маршрут не построен) */}
      {!routeData && (
        <View style={styles.bottomPanel}>
          {/* Панель ввода адресов */}
          <View style={styles.addressPanel}>
            <View style={styles.addressInputContainer}>
              <Ionicons name="location" size={24} color={theme.colors.primary} />
              <Text style={styles.addressText}>{startPoint}</Text>
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.addressInputContainer}>
              <Ionicons name="flag" size={24} color={theme.colors.primary} />
              <View style={styles.destinationSelector}>
                {!endPoint ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.destinationsScroll}>
                    {mockDestinations.map(dest => (
                      <TouchableOpacity 
                        key={dest.id}
                        style={styles.destinationChip}
                        onPress={() => selectDestination(dest)}
                      >
                        <Text style={styles.destinationChipText}>{dest.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                ) : (
                  <View style={styles.selectedDestinationContainer}>
                    <Text style={styles.addressText}>{endPoint}</Text>
                    <TouchableOpacity 
                      style={styles.clearButton}
                      onPress={handleCancelRoute}
                    >
                      <Ionicons name="close-circle" size={22} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* Индикатор загрузки маршрутов */}
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={styles.loadingText}>Расчет маршрутов...</Text>
            </View>
          )}

          {/* Список маршрутов */}
          {routes.length > 0 && !loading && (
            <>
              <Text style={styles.sectionTitle}>Варианты маршрутов</Text>
              <ScrollView style={styles.routesList}>
                {routes.map((route) => (
                  <TouchableOpacity 
                    key={route.id}
                    style={[
                      styles.routeItem, 
                      selectedRoute?.id === route.id && styles.selectedRoute,
                      { borderColor: selectedRoute?.id === route.id ? route.color : 'transparent' }
                    ]}
                    onPress={() => handleRouteSelect(route)}
                  >
                    <View style={styles.routeHeader}>
                      <Text style={styles.routeName}>{route.name}</Text>
                      <View style={[styles.trafficIndicator, { backgroundColor: getTrafficColor(route.traffic) }]} />
                    </View>
                    <View style={styles.routeDetails}>
                      <Text style={styles.routeInfo}>{route.duration}</Text>
                      <Text style={styles.routeInfo}>{route.distance}</Text>
                      <Text style={styles.routeInfo}>Трафик: {route.traffic}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          )}

          {/* Кнопка начала навигации */}
          {selectedRoute && (
            <TouchableOpacity style={styles.startButton} onPress={handleStartNavigation}>
              <Ionicons name="navigate" size={20} color="white" style={styles.buttonIcon} />
              <Text style={styles.startButtonText}>Начать навигацию</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

// Вспомогательная функция для определения цвета индикатора трафика
const getTrafficColor = (traffic) => {
  switch (traffic) {
    case 'Низкий': return theme.colors.success;
    case 'Средний': return theme.colors.warning;
    case 'Высокий': return theme.colors.error;
    default: return theme.colors.success;
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  mapContainer: {
    flex: 1,
  },
  bottomPanel: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 30,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    maxHeight: '60%',
  },
  addressPanel: {
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: theme.colors.shadowMedium,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  addressInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  addressText: {
    marginLeft: 12,
    fontSize: 16,
    color: theme.colors.textPrimary,
    flex: 1,
  },
  destinationSelector: {
    flex: 1,
    marginLeft: 12,
  },
  destinationsScroll: {
    maxHeight: 40,
  },
  destinationChip: {
    backgroundColor: theme.colors.primary + '15',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: theme.colors.primary + '30',
  },
  destinationChipText: {
    color: theme.colors.primary,
    fontWeight: '500',
  },
  selectedDestinationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clearButton: {
    padding: 4,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: 8,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    marginBottom: 12,
  },
  routesList: {
    flex: 1,
    marginBottom: 16,
    maxHeight: 200,
  },
  routeItem: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 1,
    shadowColor: theme.colors.shadowLight,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedRoute: {
    borderWidth: 2,
  },
  routeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  routeName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
  },
  trafficIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  routeDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  routeInfo: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  startButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  buttonIcon: {
    marginRight: 8,
  },
  startButtonText: {
    color: theme.colors.textOnPrimary,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default observer(RouteScreen);
