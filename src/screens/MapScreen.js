import React, { useRef, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Keyboard, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import MapViewComponent from '../components/map/MapView';
import RouteBottomPanel from '../components/route/RouteBottomPanel';
import SearchBar from '../components/search/SearchBar';
import SearchResults from '../components/search/SearchResults';
import SelectedPlaceMarker from '../components/map/SelectedPlaceMarker';
import RouteMarkers from '../components/map/RouteMarkers';
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
    calculateDistance 
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
    handleSearch,
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

  // Рендер компонента
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.searchContainer}>
        <SearchBar
          value={searchText}
          onChangeText={handleSearchTextChange}
          onSubmit={() => handleSearch()}
          onFocus={() => setIsSearchFocused(true)}
          onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
          onClear={() => handleSearchTextChange('')}
          isLoading={isSearchLoading}
        />
      </View>
      
      {/* Результаты поиска */}
      <SearchResults
        results={searchResults}
        onSelectResult={handleSelectSearchResultWrapper}
        isVisible={isSearchFocused && searchResults.length > 0}
      />
      
      <View style={styles.mapContainer}>
        <MapViewComponent
          ref={mapRef}
          region={region}
          onRegionChange={handleRegionChange}
          onPress={handleMapPressWrapper}
          mapType={currentMapType}
          rotateEnabled={!isRouting} // Отключаем вращение при маршруте
          userLocation={location}
          routeData={getRouteDataForMap()}
          onRouteReady={handleRouteReady}
          isRouteLoading={isCurrentRouteLoading()}
        >
          {/* Маркер выбранного места (не в режиме маршрута) */}
          <SelectedPlaceMarker 
            location={selectedLocation} 
            placeInfo={selectedPlaceInfo} 
          />
          
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
      </View>

      {/* Панель маршрута внизу */}
      {isRouting && !isCurrentRouteLoading() && (
        <RouteBottomPanel
          routeDetails={routeDetails}
          allRoutes={allRoutes}
          routeMode={routeMode}
          isReverseRoute={isReverseRoute}
          onCancelRoute={handleCancelRouting}
          onReverseRoute={() => setIsReverseRoute(!isReverseRoute)}
          onRouteTypeChange={handleRouteTypeChange}
          isLoading={routesLoading}
        />
      )}
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
    backgroundColor: theme.colors.background,
    zIndex: 10,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
    marginTop: 10,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
  },
  mapControl: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: theme.colors.shadowDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  locationButton: {
    position: 'absolute',
    right: 16,
    bottom: 100,
  },
  mapControlsContainer: {
    position: 'absolute',
    right: 16,
    top: 16,
  },
  layersButton: {
    marginBottom: 0,
  },
  layersMenu: {
    position: 'absolute',
    top: 50,
    right: 0,
    backgroundColor: theme.colors.background,
    borderRadius: 8,
    shadowColor: theme.colors.shadowDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    padding: 8,
    width: 120,
  },
  layerOption: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  activeLayerOption: {
    backgroundColor: theme.colors.primaryLight,
  },
  layerOptionText: {
    color: theme.colors.textPrimary,
    fontSize: 14,
  },
  routeLoadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
  },
  routeLoadingText: {
    marginTop: 10,
    color: theme.colors.textPrimary,
    fontSize: 16,
    textAlign: 'center',
  },
});

export default MapScreen;
