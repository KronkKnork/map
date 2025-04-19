import React, { useRef, useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Keyboard, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import MapViewComponent from '../components/map'; // Импортируем из index.js для надежности
import SafeMapWrapper from '../components/map/SafeMapWrapper';
import RouteBottomPanel from '../components/route/RouteBottomPanel';
import SearchBar from '../components/search/SearchBar';
import SearchResults from '../components/search/SearchResults';
import SelectedPlaceMarker from '../components/map/SelectedPlaceMarker';
import SelectedPlaceInfo from '../components/map/SelectedPlaceInfo';
import RouteMarkers from '../components/map/RouteMarkers';
// import LocationPermissionOverlay from '../components/common/LocationPermissionOverlay';
import { theme } from '../theme';

// Импортируем созданные хуки
import useLocation from '../hooks/useLocation';
import useSearch from '../hooks/useSearch';
import useRouting from '../hooks/useRouting';
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
  
  const {
    isRouting,
    isReverseRoute,
    routeMode,
    routeDetails,
    allRoutes,
    routesLoading,
    isMapExpanded,
    setIsReverseRoute,
    handleStartRouting,
    handleCancelRouting,
    handleRouteReady,
    handleRouteTypeChange,
    isCurrentRouteLoading,
    getTransportTypeFromMode,
    getRouteDataForMap,
    getRouteEndpoints
  } = useRouting({ location, selectedLocation, selectedPlaceInfo, mapRef });
  
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
    if (!isRouting) {
      setRegion(newRegion);
    }
  };
  
  // Обертка для handleMapPress, добавляющая контекст из других хуков
  const handleMapPressWrapper = (event) => {
    handleMapPress(event, isRouting, mapRef, isRouting ? handleCancelRouting : null);
  };
  
  // Обертка для handleSelectSearchResult
  const handleSelectSearchResultWrapper = (result) => {
    handleSelectSearchResult(result, mapRef, isRouting ? handleCancelRouting : null);
  };

  // Эффект для центрирования на местоположении пользователя при первой загрузке
  useEffect(() => {
    // Флаг для отслеживания, было ли уже выполнено центрирование
    let hasInitiallyCentered = false;
    
    // Добавляем небольшую задержку, чтобы компоненты успели инициализироваться
    const timer = setTimeout(() => {
      if (location && location.coords && mapRef.current && !hasInitiallyCentered) {
        centerOnUserLocation(mapRef);
        console.log('Карта центрирована на местоположении пользователя при запуске');
        hasInitiallyCentered = true;
      }
    }, 1000); // Задержка 1 секунда
    
    return () => clearTimeout(timer);
  }, []); // Пустой массив зависимостей, чтобы эффект выполнился только один раз при монтировании

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
              {/* Маркер выбранного места (не в режиме маршрута) */}
              {selectedLocation && (
                <SelectedPlaceMarker 
                  location={selectedLocation} 
                  placeInfo={selectedPlaceInfo} 
                  isRouting={isRouting}
                />
              )}
              
              {/* Маркеры маршрута (начало и конец) */}
              <RouteMarkers 
                {...getRouteEndpoints()}
                isRouting={isRouting && !isCurrentRouteLoading()}
              />
              
              {/* Индикатор загрузки маршрута */}
              {isRouting && isCurrentRouteLoading() && (
                <View style={styles.routeLoadingContainer}>
                  <ActivityIndicator size="large" color={theme.colors.primary} />
                  <Text style={styles.routeLoadingText}>
                    Строится маршрут {getTransportTypeFromMode(routeMode) === 'car' ? 'на автомобиле' : 
                      getTransportTypeFromMode(routeMode) === 'walk' ? 'пешком' : 
                      getTransportTypeFromMode(routeMode) === 'bicycle' ? 'на велосипеде' : 
                      'на общественном транспорте'}...
                  </Text>
                </View>
              )}
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
  routeLoadingContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -100 }, { translateY: -40 }],
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 12,
    padding: 16,
    width: 200,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  routeLoadingText: {
    marginTop: 8,
    color: theme.colors.textPrimary,
    fontSize: 14,
    textAlign: 'center',
  },
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
