import React, { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import MapView, { PROVIDER_DEFAULT, UrlTile } from 'react-native-maps';
import FixedRouteDirections from './FixedRouteDirections';

/**
 * Компонент карты с возможностью отображения маршрутов
 */
const MapViewComponent = forwardRef(({
  region,
  onRegionChange,
  onPress,
  mapType = 'standard',
  rotateEnabled = true,
  userLocation,
  routeData,
  onRouteReady,
  isRouteLoading = false,
  children
}, ref) => {
  // Сохраняем последний валидный регион для случаев сбоев
  const [internalRegion, setInternalRegion] = useState(null);
  const lastUserLocationRef = useRef(null);
  const isMovingRef = useRef(false);
  const isUserInteractingRef = useRef(false);
  const regionChangeTimeoutRef = useRef(null);
  const initialLoadDoneRef = useRef(false);
  
  // Определяем, есть ли у нас валидный регион для отображения
  const hasValidRegion = React.useMemo(() => {
    return region || 
           (userLocation && userLocation.coords) || 
           internalRegion;
  }, [region, userLocation, internalRegion]);
  
  // Мемоизируем начальный регион только из переданного региона или местоположения,
  // избегая дефолтных координат Москвы, чтобы карта не показывала их вначале
  const initialRegion = React.useMemo(() => {
    if (region) {
      return region;
    } else if (userLocation && userLocation.coords) {
      return {
        latitude: userLocation.coords.latitude,
        longitude: userLocation.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01
      };
    }
    return null;
  }, []);
  
  // Ссылка на компонент карты
  const mapRef = useRef(null);
  
  // Обработчик изменения региона карты
  const handleRegionChange = useCallback((newRegion) => {
    // Сохраняем текущий регион во внутреннем состоянии
    if (newRegion && newRegion.latitude && !isNaN(newRegion.latitude)) {
      setInternalRegion(newRegion);
      
      // Устанавливаем таймаут для уведомления родителя об изменении региона
      // чтобы не вызывать слишком часто при активном перемещении
      if (regionChangeTimeoutRef.current) {
        clearTimeout(regionChangeTimeoutRef.current);
      }
      
      regionChangeTimeoutRef.current = setTimeout(() => {
        if (onRegionChange && isUserInteractingRef.current) {
          onRegionChange(newRegion);
          isUserInteractingRef.current = false;
        }
      }, 300);
    }
  }, [onRegionChange]);
  
  // Обработчик нажатия на карту
  const handlePress = useCallback((event) => {
    // Обработка нажатия на карту только если предоставлен обработчик
    if (onPress) {
      onPress(event);
    }
  }, [onPress]);
  
  // Обработчик начала перемещения карты
  const handlePanDrag = useCallback(() => {
    isUserInteractingRef.current = true;
  }, []);
  
  // Обработчик загрузки карты
  const handleMapReady = useCallback(() => {
    initialLoadDoneRef.current = true;
    
    // Если есть начальный регион - используем его
    if (initialRegion && mapRef.current) {
      mapRef.current.animateToRegion(initialRegion, 500);
    }
  }, [initialRegion]);
  
  // Предоставляем методы для внешнего доступа через ref
  useImperativeHandle(ref, () => ({
    animateToRegion: (targetRegion, duration = 1000) => {
      if (mapRef.current && targetRegion) {
        mapRef.current.animateToRegion(targetRegion, duration);
      }
    },
    fitToCoordinates: (coordinates, options = {}) => {
      if (mapRef.current && coordinates && coordinates.length > 0) {
        const defaultOptions = { 
          edgePadding: { top: 50, right: 50, bottom: 50, left: 50 }, 
          animated: true 
        };
        mapRef.current.fitToCoordinates(coordinates, { ...defaultOptions, ...options });
      }
    },
    getMapRef: () => mapRef.current
  }));
  
  // Обработка внешних обновлений региона
  useEffect(() => {
    if (region && mapRef.current && initialLoadDoneRef.current) {
      // Анимируем к новому региону только если он существенно отличается
      // и пользователь не взаимодействует с картой в данный момент
      if (!isUserInteractingRef.current && !isMovingRef.current) {
        isMovingRef.current = true;
        mapRef.current.animateToRegion(region, 500);
        
        // Сбрасываем флаг перемещения через короткий промежуток
        setTimeout(() => {
          isMovingRef.current = false;
        }, 600);
      }
    }
  }, [region]);

  // Определяем, нужно ли показывать маркер местоположения пользователя
  // Скрываем его, если активен режим маршрутизации (есть данные маршрута)
  const showUserLocation = !!userLocation && !routeData;

  return (
    <View style={styles.container}>
      {hasValidRegion && (
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={PROVIDER_DEFAULT}
          initialRegion={initialRegion}
          region={internalRegion}
          mapType={mapType}
          rotateEnabled={rotateEnabled}
          zoomEnabled={true}
          scrollEnabled={true}
          pitchEnabled={true}
          toolbarEnabled={false}
          moveOnMarkerPress={false}
          onPress={handlePress}
          onRegionChangeComplete={handleRegionChange}
          onPanDrag={handlePanDrag}
          onMapReady={handleMapReady}
          showsUserLocation={showUserLocation}
          followsUserLocation={false}
          showsMyLocationButton={false}
          showsCompass={true}
          loadingEnabled={true}
          showsScale={true}
          minZoomLevel={3}
          maxZoomLevel={19}
        >
          {/* URL-тайлы OpenStreetMap */}
          <UrlTile 
            urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            maximumZ={19}
            flipY={false}
            zIndex={-1}
          />
          
          {/* Отображение маршрута если данные предоставлены и маршрут не загружается */}
          {routeData && routeData.origin && routeData.destination && !isRouteLoading && (
            <FixedRouteDirections
              origin={routeData.origin}
              destination={routeData.destination}
              mode={routeData.mode || 'DRIVING'}
              onRouteReady={onRouteReady}
              strokeColor="#1a73e8"
              strokeWidth={5}
            />
          )}
          
          {/* Отображаем дочерние элементы (маркеры и т.д.) */}
          {children}
        </MapView>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  }
});

export default MapViewComponent;
