import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import axios from 'axios';
import { theme } from '../../theme';
import { GOOGLE_MAPS_API_KEY } from '../../config';
import RouteTypeTabs from './RouteTypeTabs';
import RouteInfo from './RouteInfo';
import MapControls from '../shared/MapControls';

const RouteDirections = ({ 
  origin, 
  destination, 
  onGoBack, 
  transportType = 'car' 
}) => {
  const [route, setRoute] = useState(null);
  const [routeDetails, setRouteDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(transportType);
  const [selectedRoute, setSelectedRoute] = useState(0);
  const [mapRef, setMapRef] = useState(null);
  const isMountedRef = React.useRef(true);
  const abortControllerRef = React.useRef(null);
  
  // Конвертирует тип транспорта из UI в формат API
  const getTransportMode = (tabId) => {
    const modes = {
      'car': 'DRIVING',
      'walk': 'WALKING',
      'bicycle': 'BICYCLING',
      'public_transport': 'TRANSIT'
    };
    return modes[tabId] || 'DRIVING';
  };
  
  // Мемоизированная функция загрузки маршрута для предотвращения повторных вызовов
  const fetchRoute = useCallback(async () => {
    if (!origin || !destination) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const mode = getTransportMode(activeTab);
      
      // Создаем новый контроллер для отмены запроса
      abortControllerRef.current = new AbortController();
      
      // Проверяем наличие координат
      if (!origin || !destination || !origin.latitude || !destination.latitude) {
        console.log('RouteDirections: отсутствуют координаты для построения маршрута');
        return;
      }
      
      // Проверяем, совпадают ли координаты
      const isSameLocation = 
        Math.abs(origin.latitude - destination.latitude) < 0.0000001 && 
        Math.abs(origin.longitude - destination.longitude) < 0.0000001;
      
      // Добавляем задержку перед запросом маршрута,
      // чтобы дать время карте перерисоваться
      const timeoutId = setTimeout(() => {
        if (!isMountedRef.current) return;
        
        if (isSameLocation) {
          console.log('RouteDirections: начальная и конечная точки маршрута совпадают');
          safeSetState(setRoute, null);
          safeSetState(setRouteDetails, null);
          safeSetState(setSelectedRoute, 0);
          safeSetState(setCoordinates, []);
          safeSetState(setRouteInfo, null);
          safeSetState(setTrafficData, []);
          
          if (onRouteReady && typeof onRouteReady === 'function') {
            try {
              onRouteReady({
                coordinates: [],
                distance: 0,
                duration: 0,
                isApproximate: true,
                mode: mode,
                error: "SAME_COORDINATES"
              });
            } catch (callbackError) {
              console.error('Ошибка при вызове onRouteReady:', callbackError);
            }
          }
          return;
        }
        
        // Формируем запрос к API маршрутов
        const response = await axios.get(
          `https://maps.googleapis.com/maps/api/directions/json`,
          {
            params: {
              origin: `${origin.latitude},${origin.longitude}`,
              destination: `${destination.latitude},${destination.longitude}`,
              mode: mode.toLowerCase(),
              alternatives: true,
              key: GOOGLE_MAPS_API_KEY
            }
          }
        );
        
        if (response.data.status === 'OK') {
          const routes = response.data.routes.map(route => {
            // Декодируем полилинию
            const points = decodePolyline(route.overview_polyline.points);
            
            // Извлекаем информацию о маршруте
            const distance = route.legs[0].distance.text;
            const duration = route.legs[0].duration.text;
            const steps = route.legs[0].steps;
            
            return {
              points,
              distance,
              duration,
              steps
            };
          });
          
          setRoute(routes);
          setRouteDetails(response.data.routes);
          setSelectedRoute(0);
          
          // Подгоняем карту под маршрут
          if (mapRef && routes.length > 0) {
            const coordinates = routes[0].points;
            mapRef.fitToCoordinates(coordinates, {
              edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
              animated: true
            });
          }
        } else {
          setError('Не удалось построить маршрут. Пожалуйста, попробуйте еще раз.');
        }
      }, 500);
      
      // Очищаем таймер при размонтировании компонента
      return () => {
        clearTimeout(timeoutId);
        isMountedRef.current = false;
      };
    } catch (err) {
      console.error('Ошибка при получении маршрута:', err);
      setError('Ошибка сети. Пожалуйста, проверьте подключение к интернету.');
    } finally {
      setLoading(false);
    }
  }, [origin, destination, activeTab]);
  
  // Эффект для загрузки маршрута при изменении точек или типа транспорта
  useEffect(() => {
    if (origin && destination) {
      fetchRoute();
    }
  }, [origin, destination, activeTab, fetchRoute]);
  
  // Функция декодирования полилинии от Google Maps
  const decodePolyline = (encoded) => {
    let index = 0, len = encoded.length;
    let lat = 0, lng = 0;
    let coordinates = [];
    
    while (index < len) {
      let b, shift = 0, result = 0;
      
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      
      let dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lat += dlat;
      
      shift = 0;
      result = 0;
      
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      
      let dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lng += dlng;
      
      coordinates.push({
        latitude: lat / 1e5,
        longitude: lng / 1e5
      });
    }
    
    return coordinates;
  };
  
  // Обработчик изменения типа транспорта
  const handleTransportTypeChange = (type) => {
    if (type !== activeTab) {
      setActiveTab(type);
    }
  };
  
  // Выбор альтернативного маршрута
  const handleRouteSelect = (index) => {
    setSelectedRoute(index);
    
    if (mapRef && route && route[index]) {
      mapRef.fitToCoordinates(route[index].points, {
        edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
        animated: true
      });
    }
  };
  
  return (
    <View style={styles.container}>
      <View style={styles.mapContainer}>
        {(origin && destination) ? (
          <MapView
            ref={(ref) => setMapRef(ref)}
            style={styles.map}
            initialRegion={{
              latitude: origin.latitude,
              longitude: origin.longitude,
              latitudeDelta: 0.0922,
              longitudeDelta: 0.0421,
            }}
          >
            {/* Маркер начальной точки */}
            <Marker
              coordinate={origin}
              title="Начало"
              pinColor={theme.colors.primary}
            >
              <View style={styles.originMarker}>
                <Ionicons name="location" size={24} color={theme.colors.primary} />
              </View>
            </Marker>
            
            {/* Маркер конечной точки */}
            <Marker
              coordinate={destination}
              title="Назначение"
              pinColor={theme.colors.accent}
            >
              <View style={styles.destinationMarker}>
                <Ionicons name="location" size={24} color={theme.colors.accent} />
              </View>
            </Marker>
            
            {/* Отображение маршрутов */}
            {route && route.map((routeOption, index) => (
              <Polyline
                key={index}
                coordinates={routeOption.points}
                strokeWidth={index === selectedRoute ? 4 : 2}
                strokeColor={index === selectedRoute ? theme.colors.primary : theme.colors.textSecondary}
                lineDashPattern={index === selectedRoute ? null : [1, 3]}
              />
            ))}
          </MapView>
        ) : (
          <View style={styles.mapPlaceholder}>
            <Text>Загрузка карты...</Text>
          </View>
        )}
        
        {/* Элементы управления картой */}
        <MapControls mapRef={mapRef} />
        
        {/* Кнопка возврата */}
        <TouchableOpacity style={styles.backButton} onPress={onGoBack}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
      </View>
      
      <View style={styles.routePanel}>
        {/* Вкладки для выбора типа транспорта */}
        <RouteTypeTabs
          activeTab={activeTab}
          onTabChange={handleTransportTypeChange}
        />
        
        {/* Содержимое панели информации о маршруте */}
        <View style={styles.routeContent}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={styles.loadingText}>Поиск маршрута...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={40} color={theme.colors.error} />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={fetchRoute}>
                <Text style={styles.retryButtonText}>Повторить</Text>
              </TouchableOpacity>
            </View>
          ) : route && route.length > 0 ? (
            <ScrollView style={styles.routeDetails}>
              {/* Информация о выбранном маршруте */}
              <RouteInfo 
                route={route[selectedRoute]} 
                routeDetails={routeDetails ? routeDetails[selectedRoute] : null}
                transportType={activeTab}
              />
              
              {/* Выбор альтернативных маршрутов, если есть */}
              {route.length > 1 && (
                <View style={styles.alternativeRoutes}>
                  <Text style={styles.alternativesTitle}>Другие маршруты:</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {route.map((routeOption, index) => (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.alternativeRoute,
                          selectedRoute === index && styles.selectedAlternative
                        ]}
                        onPress={() => handleRouteSelect(index)}
                      >
                        <Text style={styles.alternativeRouteTime}>
                          {routeOption.duration}
                        </Text>
                        <Text style={styles.alternativeRouteDistance}>
                          {routeOption.distance}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </ScrollView>
          ) : (
            <View style={styles.noRouteContainer}>
              <Text style={styles.noRouteText}>
                Маршрут не найден. Пожалуйста, выберите другие точки или тип транспорта.
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  mapPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 40,
    left: 15,
    backgroundColor: theme.colors.white,
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  routePanel: {
    backgroundColor: theme.colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    maxHeight: '50%',
  },
  routeContent: {
    marginTop: 16,
    minHeight: 150,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    color: theme.colors.text,
    fontSize: 16,
  },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    marginTop: 10,
    color: theme.colors.error,
    fontSize: 16,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: theme.colors.white,
    fontWeight: 'bold',
  },
  routeDetails: {
    flex: 1,
  },
  alternativeRoutes: {
    marginTop: 20,
    paddingBottom: 10,
  },
  alternativesTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: theme.colors.text,
  },
  alternativeRoute: {
    backgroundColor: theme.colors.background,
    padding: 10,
    borderRadius: 8,
    marginRight: 10,
    minWidth: 100,
    alignItems: 'center',
  },
  selectedAlternative: {
    backgroundColor: theme.colors.primaryLight,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  alternativeRouteTime: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  alternativeRouteDistance: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  noRouteContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  noRouteText: {
    color: theme.colors.textSecondary,
    fontSize: 16,
    textAlign: 'center',
  },
  originMarker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  destinationMarker: {
    alignItems: 'center',
    justifyContent: 'center',
  }
});

export default RouteDirections; 