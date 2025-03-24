import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, TextInput, Keyboard, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import MapViewComponent from '../components/map/MapView';
import RouteBottomPanel from '../components/route/RouteBottomPanel';
import SearchBar from '../components/search/SearchBar';
import SearchResults from '../components/search/SearchResults';
import SelectedPlaceMarker from '../components/map/SelectedPlaceMarker';
import RouteMarkers from '../components/map/RouteMarkers';
import { theme } from '../theme';
import { searchPlaces, reverseGeocode, fetchRouteDirections } from '../services/api';
import { Marker } from 'react-native-maps';

const MapScreen = () => {
  // Состояние для региона карты
  const [region, setRegion] = useState(null);
  // Состояние для текущего местоположения
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  // Состояние для поля поиска
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  // Состояние для выбранного маршрута
  const [isRouting, setIsRouting] = useState(false);
  const [isReverseRoute, setIsReverseRoute] = useState(false);
  const [routeMode, setRouteMode] = useState('DRIVING');
  const [routeDetails, setRouteDetails] = useState(null);
  const [allRoutes, setAllRoutes] = useState({
    DRIVING: null,
    WALKING: null,
    BICYCLING: null,
    TRANSIT: null
  });
  const [routesLoading, setRoutesLoading] = useState({
    DRIVING: false,
    WALKING: false,
    BICYCLING: false,
    TRANSIT: false
  });

  // Состояние для выбранной локации
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [selectedPlaceInfo, setSelectedPlaceInfo] = useState(null);
  
  // Состояние для типа карты и слоев
  const [currentMapType, setCurrentMapType] = useState('standard');
  const [showLayersMenu, setShowLayersMenu] = useState(false);
  
  // Ссылки
  const mapRef = useRef(null);
  const searchInputRef = useRef(null);
  const routesRequestedRef = useRef(false);
  const searchTimerRef = useRef(null);

  // Эффект для получения разрешения на доступ к местоположению
  useEffect(() => {
    (async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        
        if (status !== 'granted') {
          setErrorMsg('Для работы приложения необходимо разрешение на доступ к геолокации');
          return;
        }
        
        // Получаем текущее местоположение
        let location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced
        });
        
        setLocation(location);
        
        // Инициализируем регион для карты
        if (!region) {
          setRegion({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            latitudeDelta: 0.02,
            longitudeDelta: 0.02
          });
        }
        
        // Подписка на обновления местоположения
        Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 5000,
            distanceInterval: 10
          },
          newLocation => {
            setLocation(newLocation);
          }
        );
      } catch (error) {
        setErrorMsg('Ошибка получения местоположения: ' + error.message);
        console.error('Ошибка геолокации:', error);
      }
    })();
  }, []);

  // Обработчик изменения региона карты
  const handleRegionChange = (newRegion) => {
    // Не обновляем регион, если активен маршрут
    if (!isRouting) {
      setRegion(newRegion);
    }
  };

  // Обработчик нажатия на карту
  const handleMapPress = useCallback(async (event) => {
    // Проверяем, что у нас есть валидное событие
    if (!event || !event.nativeEvent) {
      console.warn('Некорректное событие нажатия на карту');
      return;
    }
    
    // Если активно построение маршрута, игнорируем нажатие на карту
    if (isRouting) return;
    
    // Если открыта панель поиска, скрываем её
    if (isSearchFocused) {
      setIsSearchFocused(false);
      Keyboard.dismiss();
    }
    
    try {
      // Извлекаем координаты из события
      const { coordinate } = event.nativeEvent;
      
      if (!coordinate) {
        console.warn('Нет координат в событии нажатия');
        return;
      }
      
      const { latitude, longitude } = coordinate;
      
      // Проверяем валидность координат
      if (typeof latitude !== 'number' || 
          typeof longitude !== 'number' || 
          isNaN(latitude) || 
          isNaN(longitude)) {
        console.warn('Некорректные координаты в событии нажатия на карту');
        return;
      }
      
      // Создаем объект с координатами
      const newLocation = {
        latitude: parseFloat(latitude.toFixed(6)),
        longitude: parseFloat(longitude.toFixed(6))
      };
      
      console.log('Установка координат из тапа по карте:', newLocation);
      
      // Устанавливаем выбранную локацию
      setSelectedLocation(newLocation);
      
      // Сбрасываем результаты поиска и данные маршрута
      setSearchResults([]);
      setRouteDetails(null);
      
      // Перемещаем карту к выбранной точке
      mapRef.current?.animateToRegion({
        latitude: newLocation.latitude,
        longitude: newLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01
      }, 300);
      
      // Получаем информацию о месте по координатам
      const placeInfo = await reverseGeocode(latitude, longitude)
        .catch(error => {
          console.error('Ошибка получения адреса:', error);
          return {
            name: 'Выбранное место',
            address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
          };
        });
        
      // Если есть местоположение пользователя, рассчитываем расстояние
      if (location && location.coords) {
        const distance = calculateDistance(
          location.coords.latitude, location.coords.longitude,
          latitude, longitude
        );
        
        setSelectedPlaceInfo({
          ...placeInfo,
          distance
        });
      } else {
        setSelectedPlaceInfo(placeInfo);
      }
    } catch (error) {
      console.error('Ошибка при обработке нажатия на карту:', error);
    }
  }, [isRouting, isSearchFocused, location]);

  // Обработчик запроса поиска
  const handleSearch = () => {
    if (!searchText.trim()) {
      setSearchResults([]);
      return;
    }
    
    // Минимальная длина запроса
    if (searchText.trim().length < 3) {
      return;
    }
    
    console.log(`Выполняю поиск для запроса: "${searchText.trim()}"`);
    
    // Запрашиваем места по запросу, передавая координаты пользователя если они доступны
    const userCoords = location?.coords ? {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude
    } : null;
    
    searchPlaces(searchText, 20, userCoords)
      .then(results => {
        if (!results || !Array.isArray(results)) {
          console.error('Некорректный формат результатов поиска:', results);
          setSearchResults([]);
          return;
        }
        
        console.log(`Получено ${results.length} результатов поиска`);
        
        // Устанавливаем результаты (они уже отсортированы по расстоянию в API)
        setSearchResults(results);
      })
      .catch(error => {
        console.error('Ошибка при поиске мест:', error);
        Alert.alert(
          "Ошибка поиска", 
          "Не удалось получить результаты поиска. Попробуйте позже или измените запрос."
        );
        setSearchResults([]);
      });
  };

  // Обработчик выбора результата из поиска
  const handleSelectSearchResult = (result) => {
    // Проверка на валидность результата
    if (!result) {
      console.warn('Получен пустой результат поиска');
      return;
    }
    
    // Попытка получить и преобразовать координаты
    let lat, lng;
    
    try {
      // Проверяем формат данных в результатах поиска
      // Формат Nominatim API имеет прямые поля latitude и longitude
      if (result.latitude !== undefined && result.longitude !== undefined) {
        lat = result.latitude;
        lng = result.longitude;
      } else {
        console.warn('Некорректный формат координат в результате поиска:', result);
        return;
      }
      
      // Проверяем валидность координат
      if (isNaN(lat) || isNaN(lng) || lat === undefined || lng === undefined) {
        console.warn('Некорректные координаты в результате поиска:', result);
        return;
      }
    } catch (error) {
      console.error('Ошибка при обработке координат результата поиска:', error);
      return;
    }
    
    // Сбрасываем поиск
    setSearchText('');
    setSearchResults([]);
    setIsSearchFocused(false);
    
    // Скрываем клавиатуру
    Keyboard.dismiss();
    
    // Создаем объект с координатами в числовом формате
    const coordinate = {
      latitude: lat,
      longitude: lng
    };
    
    console.log('Установка координат из результата поиска:', coordinate);
    
    // Устанавливаем выбранное место
    setSelectedLocation(coordinate);
    setSelectedPlaceInfo({
      name: result.name || 'Выбранное место',
      address: result.address || `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
      distance: result.distance
    });
    
    // Сброс маршрута если он был активен
    if (isRouting) {
      setIsRouting(false);
      setRouteDetails(null);
    }
    
    // Центрируем карту на выбранном месте
    setRegion({
      ...coordinate,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01
    });
  };

  // Функция расчета расстояния по формуле Гаверсинуса
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Радиус Земли в км
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
    const distance = R * c; // Расстояние в км
    return distance;
  };

  // Перевод градусов в радианы
  const deg2rad = (deg) => {
    return deg * (Math.PI / 180);
  };

  // Функция для центрирования на текущем местоположении
  const centerOnUserLocation = () => {
    if (location && location.coords) {
      const newRegion = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01
      };
      
      mapRef.current?.animateToRegion(newRegion, 500);
    }
  };

  // Функция для смены типа карты
  const handleMapTypeChange = (type) => {
    setCurrentMapType(type);
    setShowLayersMenu(false);
  };

  // Начало построения маршрута
  const handleStartRouting = (reverse = false) => {
    if (!selectedLocation || !location) return;
    
    // Сбрасываем все данные маршрутов
    setAllRoutes({
      DRIVING: null,
      WALKING: null,
      BICYCLING: null,
      TRANSIT: null
    });
    
    setRouteDetails(null);
    routesRequestedRef.current = false;
    
    setIsRouting(true);
    setIsReverseRoute(reverse);
  };

  // Отмена построения маршрута
  const handleCancelRouting = () => {
    setIsRouting(false);
    setRouteDetails(null);
    routesRequestedRef.current = false;
  };

  // Обработчик изменения типа маршрута (автомобиль, пешком и т.д.)
  const handleRouteTypeChange = (mode) => {
    console.log(`MapScreen: изменение типа маршрута на ${mode}`);
    
    // Сразу устанавливаем режим маршрута для обновления UI
    setRouteMode(mode);
    
    // Если у нас уже есть данные для этого типа с координатами, просто переключаемся
    if (allRoutes[mode] && allRoutes[mode].coordinates && allRoutes[mode].coordinates.length > 0) {
      console.log(`MapScreen: у нас уже есть полные данные для типа ${mode}, устанавливаем их`);
      setRouteDetails(allRoutes[mode]);
    } else {
      // Если у нас нет координат маршрута, запрашиваем их сейчас
      console.log(`MapScreen: нет полных данных для типа ${mode}, запрашиваем маршрут`);
      setRouteDetails(null);
      
      // Устанавливаем загрузку для данного типа
      setRoutesLoading(prev => ({
        ...prev,
        [mode]: true
      }));
    }
  };

  // Вспомогательная функция для преобразования режима маршрута
  const getEffectiveMode = (mode) => {
    // Преобразуем режим в формат, который понимает API
    switch (mode) {
      case 'WALKING':
        return 'walking';
      case 'BICYCLING':
        return 'cycling';
      case 'TRANSIT':
        return 'transit';
      case 'DRIVING':
      default:
        return 'driving';
    }
  };

  // Преобразование режима маршрута в тип транспорта для панели маршрута
  const getTransportTypeFromMode = (mode) => {
    switch (mode) {
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

  // Обработчик голосового поиска
  const handleVoiceSearch = () => {
    Alert.alert(
      "Голосовой поиск",
      "Функция голосового поиска будет доступна в следующей версии приложения"
    );
  };

  // Обработчик готовности маршрута
  const handleRouteReady = (routeData) => {
    if (!routeData || !routeData.coordinates || routeData.coordinates.length === 0) {
      console.warn('Получены некорректные данные маршрута');
      return;
    }
    
    console.log(`Маршрут готов: ${routeData.distance.toFixed(1)} км, ${Math.round(routeData.duration)} мин`);
    
    // Сохраняем детали маршрута
    setRouteDetails(routeData);
    
    // Сохраняем маршрут в общем состоянии
    setAllRoutes(prev => ({
      ...prev,
      [routeMode]: routeData
    }));
    
    // Сбрасываем индикатор загрузки
    setRoutesLoading(prev => ({
      ...prev,
      [routeMode]: false
    }));
    
    // При первом получении маршрута, запрашиваем все остальные типы
    if (!routesRequestedRef.current) {
      routesRequestedRef.current = true;
      
      // Запрос всех типов маршрутов
      const requestAllRouteTypes = (initialResult) => {
        // Получаем параметры маршрута
        const origin = isReverseRoute ? selectedLocation : {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };
        
        const destination = isReverseRoute ? {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        } : selectedLocation;
        
        // Массив всех типов маршрутов кроме того, который уже запросили
        const allTypes = ['DRIVING', 'WALKING', 'BICYCLING', 'TRANSIT'];
        const currentType = initialResult.mode || 'DRIVING';
        
        // Формируем список типов для запроса времени (но не построения маршрутов)
        const typesToRequest = allTypes.filter(type => type !== currentType);
        
        // Функция для запроса времени маршрута без отображения
        const requestRouteTime = async (type) => {
          try {
            console.log(`MapScreen: запрашиваю время для типа ${type}`);
            
            // Устанавливаем загрузку для данного типа
            setRoutesLoading(prev => ({
              ...prev,
              [type]: true
            }));
            
            // Прямой запрос к API, не меняя текущий тип маршрута
            const effectiveMode = getEffectiveMode(type);
            const result = await fetchRouteDirections(
              origin, 
              destination, 
              [], 
              effectiveMode,
              null
            );
            
            if (result && result.distance && typeof result.duration === 'number') {
              // Записываем только время и расстояние, без координат маршрута
              setAllRoutes(prev => ({
                ...prev,
                [type]: {
                  distance: result.distance,
                  duration: result.duration,
                  isApproximate: result.isApproximate || false,
                  // Координаты не сохраняем, они будут запрошены при выборе этого типа
                  coordinates: []
                }
              }));
            }
            
            // Завершаем загрузку для этого типа
            setRoutesLoading(prev => ({
              ...prev,
              [type]: false
            }));
          } catch (error) {
            console.error(`Ошибка при запросе времени для типа ${type}:`, error);
            setRoutesLoading(prev => ({
              ...prev,
              [type]: false
            }));
          }
        };
        
        // Запрашиваем время для всех типов параллельно
        Promise.all(typesToRequest.map(type => requestRouteTime(type)))
          .then(() => {
            console.log('MapScreen: все запросы времени маршрутов завершены');
          })
          .catch(error => {
            console.error('Ошибка при запросе времени маршрутов:', error);
          });
      };
      
      // Запускаем запрос всех типов маршрутов
      requestAllRouteTypes(routeData);
    }
    
    // Подстраиваем карту под маршрут (если это первое построение)
    if (!routesRequestedRef.current && routeData.coordinates.length > 1) {
      const padding = { top: 100, right: 50, bottom: 250, left: 50 };
      mapRef.current?.fitToCoordinates(routeData.coordinates, { 
        edgePadding: padding, 
        animated: true 
      });
    }
  };

  // Эффект для очистки
  useEffect(() => {
    // Очистка при размонтировании компонента
    return () => {
      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current);
      }
    };
  }, []);

  // Рендер компонента
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.mapContainer}>
        <MapViewComponent
          ref={mapRef}
          region={region}
          onRegionChange={handleRegionChange}
          onPress={handleMapPress}
          mapType={currentMapType}
          rotateEnabled={!isRouting} // Отключаем вращение при маршруте
          userLocation={location}
          routeData={isRouting && selectedLocation && location ? {
            origin: isReverseRoute ? selectedLocation : {
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            },
            destination: isReverseRoute ? {
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            } : selectedLocation,
            mode: routeMode,
          } : null}
          onRouteReady={handleRouteReady}
        >
          {/* Маркер выбранного места (не в режиме маршрута) */}
          <SelectedPlaceMarker 
            location={selectedLocation} 
            placeInfo={selectedPlaceInfo} 
          />
          
          {/* Маркеры маршрута (начало и конец) */}
          <RouteMarkers 
            origin={isReverseRoute ? selectedLocation : (location?.coords ? {
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            } : null)}
            destination={isReverseRoute ? (location?.coords ? {
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            } : null) : selectedLocation}
            originInfo={isReverseRoute ? selectedPlaceInfo : { name: "Ваше местоположение" }}
            destinationInfo={isReverseRoute ? { name: "Ваше местоположение" } : selectedPlaceInfo}
            isRouting={isRouting}
          />
        </MapViewComponent>

        {/* Строка поиска */}
        <SearchBar 
          value={searchText}
          onChangeText={(text) => {
            setSearchText(text);
            // Если строка поиска пуста, очищаем результаты
            if (!text.trim()) {
              setSearchResults([]);
              if (searchTimerRef.current) {
                clearTimeout(searchTimerRef.current);
                searchTimerRef.current = null;
              }
            } 
            // Если длина строки поиска достаточна, автоматически выполняем поиск
            else if (text.trim().length >= 3) {
              // Отменяем предыдущий таймер, если он есть
              if (searchTimerRef.current) {
                clearTimeout(searchTimerRef.current);
              }
              // Устанавливаем новый таймер (дебаунс 500мс)
              searchTimerRef.current = setTimeout(() => {
                handleSearch();
                searchTimerRef.current = null;
              }, 500);
            }
          }}
          onSubmit={handleSearch}
          onFocus={() => setIsSearchFocused(true)}
          onBlur={() => setTimeout(() => setIsSearchFocused(false), 100)}
          onClear={() => {
            setSearchText('');
            setSearchResults([]);
            Keyboard.dismiss();
          }}
        />

        {/* Результаты поиска */}
        <SearchResults 
          results={searchResults}
          onSelectResult={handleSelectSearchResult}
          isVisible={isSearchFocused && searchResults.length > 0}
        />

        {/* Кнопка центрирования на текущем местоположении */}
        <TouchableOpacity
          style={[styles.mapControl, styles.locationButton]}
          onPress={centerOnUserLocation}
        >
          <Ionicons name="locate" size={24} color={theme.colors.primary} />
        </TouchableOpacity>

        {/* Кнопки для контроля карты (слои, типы карты) */}
        <View style={styles.mapControlsContainer}>
          <TouchableOpacity
            style={[styles.mapControl, styles.layersButton]}
            onPress={() => setShowLayersMenu(!showLayersMenu)}
          >
            <Ionicons
              name="layers"
              size={24}
              color={theme.colors.primary}
            />
          </TouchableOpacity>

          {/* Меню выбора типа карты */}
          {showLayersMenu && (
            <View style={styles.layersMenu}>
              <TouchableOpacity
                style={[
                  styles.layerOption,
                  currentMapType === 'standard' && styles.activeLayerOption,
                ]}
                onPress={() => handleMapTypeChange('standard')}
              >
                <Text style={styles.layerOptionText}>Обычная</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.layerOption,
                  currentMapType === 'satellite' && styles.activeLayerOption,
                ]}
                onPress={() => handleMapTypeChange('satellite')}
              >
                <Text style={styles.layerOptionText}>Спутник</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.layerOption,
                  currentMapType === 'hybrid' && styles.activeLayerOption,
                ]}
                onPress={() => handleMapTypeChange('hybrid')}
              >
                <Text style={styles.layerOptionText}>Гибрид</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Информация о выбранном месте */}
        {selectedLocation && !isRouting && selectedPlaceInfo && (
          <View style={styles.selectedPlaceContainer}>
            <View style={styles.selectedPlaceContent}>
              <Text style={styles.selectedPlaceName}>{selectedPlaceInfo.name || "Выбранное место"}</Text>
              {selectedPlaceInfo.address && (
                <Text style={styles.selectedPlaceAddress}>{selectedPlaceInfo.address}</Text>
              )}
              {selectedPlaceInfo.distance && (
                <Text style={styles.selectedPlaceDistance}>
                  {selectedPlaceInfo.distance < 1 
                    ? `${Math.round(selectedPlaceInfo.distance * 1000)} м от вас` 
                    : `${selectedPlaceInfo.distance.toFixed(1)} км от вас`}
                </Text>
              )}
            </View>
            <View style={styles.selectedPlaceActions}>
              <TouchableOpacity
                style={styles.locationAction}
                onPress={() => handleStartRouting(false)}
              >
                <Ionicons name="navigate" size={20} color="white" />
                <Text style={styles.locationActionText}>Сюда</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.locationAction}
                onPress={() => handleStartRouting(true)}
              >
                <Ionicons name="arrow-up" size={20} color="white" />
                <Text style={styles.locationActionText}>Отсюда</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Панель маршрута */}
        {isRouting && (
          <RouteBottomPanel
            route={{
              origin: isReverseRoute ? selectedLocation : (location?.coords ? {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude
              } : null),
              destination: isReverseRoute ? (location?.coords ? {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude
              } : null) : selectedLocation
            }}
            routeInfo={routeDetails}
            onCancel={handleCancelRouting}
            onStartNavigation={() => {
              Alert.alert("Навигация", "Функция навигации будет доступна в следующей версии приложения");
            }}
            onRouteTypeChange={handleRouteTypeChange}
            originName={isReverseRoute ? (selectedPlaceInfo?.name || "Выбранное место") : "Ваше местоположение"}
            destinationName={isReverseRoute ? "Ваше местоположение" : (selectedPlaceInfo?.name || "Выбранное место")}
            activeRouteType={getTransportTypeFromMode(routeMode)}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  searchBarContainer: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 10,
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: "#333",
  },
  searchButton: {
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapControlsContainer: {
    position: 'absolute',
    right: 10,
    top: 70,
    zIndex: 5,
  },
  mapControl: {
    backgroundColor: 'white',
    borderRadius: 30,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    marginBottom: 10,
  },
  locationButton: {
    position: 'absolute',
    bottom: 80,
    right: 10,
    zIndex: 5,
  },
  layersButton: {
    marginBottom: 10,
  },
  layersMenu: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    marginBottom: 10,
  },
  layerOption: {
    padding: 8,
    borderRadius: 4,
  },
  activeLayerOption: {
    backgroundColor: theme.colors.primary + '20',
  },
  layerOptionText: {
    color: "#333",
    fontSize: 14,
  },
  selectedPlaceContainer: {
    position: 'absolute',
    bottom: 20,
    left: 10,
    right: 10,
    backgroundColor: 'white',
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    flexDirection: 'row',
  },
  selectedPlaceContent: {
    flex: 1,
    padding: 15,
  },
  selectedPlaceName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
    color: "#333",
  },
  selectedPlaceAddress: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  selectedPlaceDistance: {
    fontSize: 14,
    color: theme.colors.primary,
  },
  selectedPlaceActions: {
    flexDirection: 'row',
    padding: 8,
    alignItems: 'center',
  },
  locationAction: {
    backgroundColor: theme.colors.primary,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginHorizontal: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationActionText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  searchResultsContainer: {
    position: 'absolute',
    top: 58,
    left: 10,
    right: 10,
    backgroundColor: 'white',
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    maxHeight: 300,
    zIndex: 9,
  },
  searchResultItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchResultContent: {
    flexDirection: 'column',
    justifyContent: 'flex-start',
  },
  searchResultName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: "#333",
    marginBottom: 4,
  },
  searchResultAddress: {
    fontSize: 14,
    color: "#666",
    marginBottom: 2,
  },
  searchResultDistance: {
    fontSize: 14,
    color: theme.colors.primary,
    textAlign: 'right',
  },
  startMarker: {
    position: 'absolute',
    top: -20,
    left: -10,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'green',
    justifyContent: 'center',
    alignItems: 'center',
  },
  endMarker: {
    position: 'absolute',
    top: -20,
    right: -10,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'red',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default MapScreen;

