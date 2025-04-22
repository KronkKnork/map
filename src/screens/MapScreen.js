import React, { useRef, useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Keyboard, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import MapViewComponent from '../components/map'; // Импортируем из index.js для надежности
import SafeMapWrapper from '../components/map/SafeMapWrapper';
import RouteBottomPanel from '../components/route/RouteBottomPanel';
import SearchBar from '../components/search/SearchBar';
import SearchResults from '../components/search/SearchResults';
import { MarkerAdapter } from '../components/map/MarkerAdapter'; // Добавляем импорт адаптера
import SelectedPlaceMarker from '../components/map/SelectedPlaceMarker';
import SelectedPlaceInfo from '../components/map/SelectedPlaceInfo';
import RouteMarkers from '../components/map/RouteMarkers';
// import LocationPermissionOverlay from '../components/common/LocationPermissionOverlay';
import { theme } from '../theme';
import { isOSMMapEnabled } from '../config'; // Правильный путь
import SimpleOSMMapView from '../components/map/SimpleOSMMapView'; // Добавляем новый компонент

// Импортируем созданные хуки
import useLocation from '../hooks/useLocation';
import useSearch from '../hooks/useSearch';
// import useRouting from '../hooks/useRoutingWrapper';
// Вместо хука useRouting используем базовые функции напрямую в компоненте
import { fetchRouteDirections } from '../services/api';
import useMapControls from '../hooks/useMapControls';

const MapScreen = () => {
  // Ссылка на компонент карты
  const mapRef = useRef(null);
  
  // Инициализируем хуки
  const { 
    location, 
    errorMsg, 
    region, 
    setRegion, 
    centerOnUserLocation, 
    calculateDistance,
    // Дополнительные состояния для отображения оверлея
    locationPermission,
    isLocationLoading,
    isMapReady,
    requestLocationPermission,
    fetchLocation
  } = useLocation();
  
  const {
    searchText,
    searchResults,
    isSearchFocused,
    isSearchLoading,
    selectedLocation,
    selectedPlaceInfo,
    setIsSearchFocused,
    handleSearchTextChange,
    handleSelectSearchResult,
    handleMapPress
  } = useSearch({ location, calculateDistance });
  
  // Состояние маршрута - вместо хука useRouting
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
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  
  // Слои карты временно отключены
  
  // Добавляем референс для отслеживания монтирования компонента
  const mounted = useRef(true);
  
  // Очищаем при размонтировании
  useEffect(() => {
    return () => {
      mounted.current = false;
    };
  }, []);
  
  // Кэш последних точек маршрута для оптимизации запросов
  const lastRoutePointsRef = useRef({
    origin: null,
    destination: null,
    requestedModes: {}
  });

  // Эффект для запроса маршрутов при активации режима маршрутизации
  useEffect(() => {
    // Функция для проверки, изменились ли точки маршрута
    const haveRoutePointsChanged = (newOrigin, newDestination) => {
      const lastPoints = lastRoutePointsRef.current;
      
      // Если нет предыдущих точек, значит точки изменились
      if (!lastPoints.origin || !lastPoints.destination) return true;
      
      // Проверяем, изменились ли координаты
      const originChanged = 
        Math.abs(lastPoints.origin.latitude - newOrigin.latitude) > 0.00001 || 
        Math.abs(lastPoints.origin.longitude - newOrigin.longitude) > 0.00001;
      
      const destinationChanged = 
        Math.abs(lastPoints.destination.latitude - newDestination.latitude) > 0.00001 || 
        Math.abs(lastPoints.destination.longitude - newDestination.longitude) > 0.00001;
      
      return originChanged || destinationChanged;
    };
    
    // Функция запроса маршрута для конкретного типа транспорта
    const requestRouteForMode = async (mode) => {
      if (!isRouting || !location || !selectedLocation || !mapRef?.current) return;
      
      // Получаем точки начала и конца маршрута
      const endpoints = getRouteEndpoints();
      
      // Нет точек - нет маршрута
      if (!endpoints.origin || !endpoints.destination) {
        console.log('[MapScreen] Невозможно запросить маршрут: нет точек');
        return;
      }
      
      // Проверяем, изменились ли точки маршрута и нужно ли запрашивать этот режим снова
      const pointsChanged = haveRoutePointsChanged(endpoints.origin, endpoints.destination);
      const modeRequested = lastRoutePointsRef.current.requestedModes[mode];
      
      // Если точки не изменились и этот режим уже запрашивался, используем кэшированный результат
      if (!pointsChanged && modeRequested && allRoutes[mode]) {
        console.log(`[MapScreen] Используем кэшированный маршрут для ${mode}`);
        
        // Если это активный режим, отрисовываем маршрут из кэша
        if (mode === routeMode && allRoutes[mode]) {
          const cachedRoute = allRoutes[mode];
          
          setRouteDetails({
            distance: cachedRoute.distance || 0,
            duration: cachedRoute.duration || 0,
            isApproximate: cachedRoute.isApproximate || false
          });
          
          // Отрисовываем кэшированный маршрут
          if (mapRef.current && cachedRoute.coordinates.length > 1) {
            mapRef.current.calculateRoute(
              endpoints.origin,
              endpoints.destination,
              mode,
              cachedRoute.coordinates
            );
          }
        }
        
        return; // Не выполняем запрос, если используем кэш
      }
      
      // Обновляем статус загрузки маршрута
      setRoutesLoading(prev => ({ ...prev, [mode]: true }));
      
      try {
        console.log(`[MapScreen] Запрашиваем маршрут типа ${mode}`);
        
        // Запрашиваем маршрут
        const result = await fetchRouteDirections(
          endpoints.origin,
          endpoints.destination,
          [], // Пустой массив waypoints
          mode
        );
        
        // Проверяем, что компонент всё ещё смонтирован
        if (!mounted.current) return;
        
        // Обрабатываем результат
        if (result && result.coordinates && result.coordinates.length > 0) {
          console.log(`[MapScreen] Получен маршрут типа ${mode}: ${result.distance.toFixed(1)} км, ${Math.round(result.duration)} мин`);
          
          // Сохраняем маршрут
          setAllRoutes(prev => ({ ...prev, [mode]: result }));
          
          // Обновляем кэш точек и отмечаем, что этот режим был запрошен
          lastRoutePointsRef.current = {
            origin: { ...endpoints.origin },
            destination: { ...endpoints.destination },
            requestedModes: {
              ...lastRoutePointsRef.current.requestedModes,
              [mode]: true
            }
          };
          
          // Если это активный режим, обновляем детали и отрисовываем маршрут
          if (mode === routeMode) {
            // Обновляем детали маршрута
            setRouteDetails({
              distance: result.distance || 0,
              duration: result.duration || 0,
              isApproximate: result.isApproximate || false
            });
            
            // Отрисовываем маршрут на карте
            if (mapRef.current && result.coordinates.length > 1) {
              // Вызываем отрисовку маршрута
              mapRef.current.calculateRoute(
                endpoints.origin,
                endpoints.destination,
                mode,
                result.coordinates
              );
              
              // Подгоняем карту под маршрут
              mapRef.current.fitToCoordinates(result.coordinates, {
                edgePadding: { top: 100, right: 50, bottom: 250, left: 50 },
                animated: true
              });
            }
          }
        } else {
          console.log(`[MapScreen] Не удалось получить маршрут типа ${mode}`);
        }
      } catch (error) {
        console.error(`[MapScreen] Ошибка при получении маршрута ${mode}:`, error);
        
        // При ошибке 429 (слишком много запросов) просто используем предыдущий маршрут, если он есть
        if (error.toString().includes('429') && allRoutes[mode]) {
          console.log(`[MapScreen] Используем предыдущий маршрут для ${mode} из-за ошибки 429`);
          
          // Если это активный режим, используем предыдущий маршрут
          if (mode === routeMode) {
            const prevRoute = allRoutes[mode];
            
            setRouteDetails({
              distance: prevRoute.distance || 0,
              duration: prevRoute.duration || 0,
              isApproximate: prevRoute.isApproximate || false
            });
          }
        }
      } finally {
        // Сбрасываем индикатор загрузки
        if (mounted.current) {
          setRoutesLoading(prev => ({ ...prev, [mode]: false }));
        }
      }
    };
    
    // Запрашиваем все маршруты сразу при активации маршрутизации
    if (isRouting) {
      const requestAllRoutes = async () => {
        // Для активного режима сначала запрашиваем маршрут, чтобы быстрее показать результат
        console.log(`[MapScreen] Запрашиваем все маршруты, сначала активный: ${routeMode}`);
        await requestRouteForMode(routeMode);
        
        // Затем запрашиваем все остальные типы маршрутов с небольшой задержкой
        setTimeout(async () => {
          // Запрашиваем ВСЕ возможные типы маршрутов, чтобы показывать время для всех сразу
          const allModes = ['DRIVING', 'WALKING', 'BICYCLING', 'TRANSIT'];
          const remainingModes = allModes.filter(mode => mode !== routeMode);
          
          console.log(`[MapScreen] Запрашиваем остальные типы: ${remainingModes.join(', ')}`);
          
          // Параллельный запуск всех запросов с небольшой задержкой между ними
          for (let i = 0; i < remainingModes.length; i++) {
            const mode = remainingModes[i];
            // Запускаем с небольшой задержкой между запросами, чтобы не перегрузить API
            setTimeout(() => {
              console.log(`[MapScreen] Запрашиваем маршрут ${mode}`);
              requestRouteForMode(mode);
            }, 300 * i); // Уменьшенная задержка 300ms вместо 500ms
          }
        }, 300); // Уменьшенная задержка для более быстрого расчета всех маршрутов
      };
      
      requestAllRoutes();
    } else {
      // При деактивации режима маршрутизации сбрасываем состояние запрошенных режимов,
      // но сохраняем последние координаты для возможного повторного использования
      if (lastRoutePointsRef.current.origin) {
        lastRoutePointsRef.current.requestedModes = {};
      }
    }
  }, [isRouting, routeMode, isReverseRoute]);
  
  // Простые функции для работы с маршрутами
  const handleStartRouting = (reverse = false) => {
    console.log('[MapScreen] Запуск построения маршрута, reverse:', reverse);
    setIsReverseRoute(reverse);
    setIsRouting(true);
    setIsMapExpanded(true);
  };
  
  const handleCancelRouting = () => {
    console.log('[MapScreen] Отмена построения маршрута');
    
    // Очищаем маршрут на карте
    if (mapRef.current) {
      console.log('[MapScreen] Очищаем маршрут на карте');
      mapRef.current.clearRoute();
      
      // Также очищаем все метки на карте
      if (mapRef.current.clearMarkers) {
        console.log('[MapScreen] Очищаем все метки при закрытии маршрута');
        mapRef.current.clearMarkers();
      }
    }
    
    // Сбрасываем состояние маршрута
    setIsMapExpanded(false);
    setIsRouting(false);
    setRouteDetails(null);
    
    // Сбрасываем выбранную локацию не нужно, т.к. она находится в useSearch
    // Достаточно очистить все метки на карте
  };
  
  const handleRouteReady = (routeData) => {
    console.log('[MapScreen] Маршрут готов:', routeData);
    // Реализация не требуется для демонстрации
  };
  
  const handleRouteTypeChange = (newMode) => {
    console.log('[MapScreen] Изменение типа маршрута на:', newMode);
    
    // Сохраняем новый режим маршрута
    setRouteMode(newMode);
    
    // Проверяем, есть ли уже рассчитанный маршрут для этого режима
    const existingRoute = allRoutes[newMode];
    
    if (existingRoute && existingRoute.coordinates && existingRoute.coordinates.length > 0) {
      console.log(`[MapScreen] Используем существующий маршрут для типа ${newMode}`);
      
      // Обновляем детали маршрута
      setRouteDetails({
        distance: existingRoute.distance || 0,
        duration: existingRoute.duration || 0,
        isApproximate: existingRoute.isApproximate || false
      });
      
      // Отрисовываем маршрут
      const endpoints = getRouteEndpoints();
      
      if (mapRef.current && endpoints.origin && endpoints.destination) {
        // Вызываем отрисовку маршрута без нового запроса API
        mapRef.current.calculateRoute(
          endpoints.origin,
          endpoints.destination,
          newMode,
          existingRoute.coordinates
        );
      }
    }
  };
  
  const isCurrentRouteLoading = () => {
    return routesLoading[routeMode] || false;
  };
  
  const getTransportTypeFromMode = (mode) => {
    const transportModes = {
      DRIVING: 'car',
      WALKING: 'walk',
      BICYCLING: 'bicycle',
      TRANSIT: 'public_transport'
    };
    return transportModes[mode] || 'car';
  };
  
  const getRouteDataForMap = () => {
    return {
      origin: getRouteEndpoints().origin,
      destination: getRouteEndpoints().destination,
      mode: routeMode
    };
  };
  
  const getRouteEndpoints = () => {
    if (!isRouting) return { origin: null, destination: null };
    
    return {
      origin: isReverseRoute ? selectedLocation : (location?.coords ? {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      } : null),
      destination: isReverseRoute ? (location?.coords ? {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      } : null) : selectedLocation,
      originInfo: isReverseRoute ? selectedPlaceInfo : { name: 'Моё местоположение' },
      destinationInfo: isReverseRoute ? { name: 'Моё местоположение' } : selectedPlaceInfo,
    };
  };
  
  const {
    currentMapType,
    showLayersMenu,
    handleMapTypeChange,
    toggleLayersMenu,
    handleVoiceSearch
  } = useMapControls();
  
  // Обработчик изменения региона карты
  const handleRegionChange = (newRegion) => {
    // Не обновляем регион, если активен маршрут
    if (!isRouting) { // Используем isRouting вместо несуществующей переменной isRoutingActive
      setRegion(newRegion);
    }
  };
  
  // Отладочный лог для проверки состояния isRouting
  console.log(`[MapScreen] isRouting: ${isRouting}`);
  
  // Обертка для handleMapPress, добавляющая контекст из других хуков
  const handleMapPressWrapper = (event) => {
    handleMapPress(event, isRouting, mapRef, isRouting ? handleCancelRouting : null);
  };
  
  // Обертка для handleSelectSearchResult
  const handleSelectSearchResultWrapper = (result) => {
    handleSelectSearchResult(result, mapRef, isRouting ? handleCancelRouting : null);
  };

  // Эффект для центрирования на местоположении пользователя при первой загрузке
  const [initialCenterDone, setInitialCenterDone] = useState(false);
  
  useEffect(() => {
    // Центрируем карту на местоположении пользователя, когда оно доступно
    if (location && location.coords && mapRef.current && isMapReady && !initialCenterDone) {
      console.log('Центрируем карту на местоположении пользователя...', location.coords);
      
      // Первый способ: используем нашу функцию centerOnUserLocation
      centerOnUserLocation(mapRef);
      
      // Второй способ: напрямую устанавливаем регион
      const newRegion = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,  // Более детальный зум
        longitudeDelta: 0.01
      };
      
      // Обновляем регион в состоянии
      setRegion(newRegion);
      
      // Прямой вызов анимации в компоненте карты
      if (mapRef.current.animateToRegion) {
        mapRef.current.animateToRegion(newRegion, 1000);
      }
      
      // Отмечаем, что начальное центрирование выполнено
      setInitialCenterDone(true);
    }
  }, [location, mapRef, isMapReady, initialCenterDone, centerOnUserLocation, setRegion]);

  // Рендер компонента
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Закомментировал оверлей, чтобы сделать успешный билд */}
      {/* <LocationPermissionOverlay
        permissionDenied={locationPermission === false}
        isLoading={isLocationLoading && locationPermission === true}
        onRequestPermission={requestLocationPermission}
      /> */}
      
      {/* Панель поиска */}
      {!isRouting && !isMapExpanded && (
        <>
          <View style={styles.searchContainer}>
            <SearchBar
              value={searchText}
              onChangeText={handleSearchTextChange}
              onSubmit={() => handleSearch()}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
              onClear={() => {
                handleSearchTextChange('');
                Keyboard.dismiss();
              }}
              isLoading={isSearchLoading}
              onVoiceSearch={handleVoiceSearch}
            />
          </View>
          
          {/* Результаты поиска */}
          <SearchResults
            results={searchResults.map(result => ({
              ...result,
              searchText: searchText
            }))}
            onSelectPlace={(result) => {
              handleSelectSearchResultWrapper(result);
              Keyboard.dismiss();
            }}
            loading={isSearchLoading}
            visible={isSearchFocused && (searchResults.length > 0 || isSearchLoading)}
            onClose={() => {
              setIsSearchFocused(false);
              Keyboard.dismiss();
            }}
            searchQuery={searchText}
          />
        </>
      )}
      
      <View style={[styles.mapContainer, isMapExpanded && styles.mapContainerFullscreen]}>
        <View style={{ flex: 1 }}>
          <SafeMapWrapper fallbackMessage="Убедитесь, что у вас есть подключение к интернету, и попробуйте перезапустить приложение.">
            <MapViewComponent
              ref={mapRef}
              region={region}
              onRegionChange={handleRegionChange}
              onPress={(e) => {
                try {
                  handleMapPressWrapper(e);
                  Keyboard.dismiss();
                } catch (error) {
                  console.error('Ошибка при нажатии на карту:', error);
                }
              }}
              mapType={'standard'}
              rotateEnabled={!isRouting}
              userLocation={location}
              routeData={getRouteDataForMap()}
              onRouteReady={handleRouteReady}
              isRouteLoading={isCurrentRouteLoading()}
            >
              {/* Слои временно отключены */}
              {/* Маркер выбранного места (не в режиме маршрута) */}
              {selectedLocation && (
                <MarkerAdapter.SelectedPlaceMarker 
                  location={selectedLocation} 
                  placeInfo={selectedPlaceInfo} 
                  isRouting={isRouting}
                  mapRef={mapRef}
                />
              )}
              
              {/* Маркеры маршрута (начало и конец) */}
              <MarkerAdapter.RouteMarkers 
                {...getRouteEndpoints()}
                isRouting={isRouting && !isCurrentRouteLoading()}
                mapRef={mapRef}
              />
              
              {/* Индикатор загрузки маршрута удален по требованию пользователя */}
            </MapViewComponent>
          </SafeMapWrapper>
  
          {/* Кнопка центрирования на текущем местоположении */}
          <TouchableOpacity
            style={[styles.mapControl, styles.locationButton]}
            onPress={() => centerOnUserLocation(mapRef)}
          >
            <Ionicons name="locate" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
  
          {/* Кнопки для контроля карты (слои, типы карты) */}
          <View style={styles.mapControlsContainer}>
          <TouchableOpacity
            style={[styles.mapControl, styles.layersButton]}
            onPress={toggleLayersMenu}
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
          <SelectedPlaceInfo 
            placeInfo={selectedPlaceInfo}
            onStartRouting={handleStartRouting}
            isVisible={!!selectedLocation && !isRouting}
          />
        )}

        {/* Панель маршрута */}
        {isRouting && (
          <RouteBottomPanel
            route={{
              origin: getRouteEndpoints().origin,
              destination: getRouteEndpoints().destination
            }}
            routeInfo={routeDetails}
            onCancel={handleCancelRouting}
            onStartNavigation={() => {
              Alert.alert("Навигация", "Функция навигации будет доступна в следующей версии приложения");
            }}
            onRouteTypeChange={handleRouteTypeChange}
            originName={getRouteEndpoints().originInfo?.name}
            destinationName={getRouteEndpoints().destinationInfo?.name}
            activeRouteType={getTransportTypeFromMode(routeMode)}
            allRoutes={allRoutes}
            routesLoading={routesLoading}
            onSwapDirection={() => setIsReverseRoute(!isReverseRoute)}
          />
        )}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    zIndex: 10,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
    marginTop: 10,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    bottom: 0,
    overflow: 'hidden',
  },
  mapControlsContainer: {
    position: 'absolute',
    right: 10,
    top: 10,
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
    bottom: 10,
    right: 10,
    zIndex: 1,
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
  // Стили для плашки "Строится маршрут" удалены
  
  mapContainerFullscreen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
});

export default MapScreen;
