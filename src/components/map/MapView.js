import React, { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps';
import RouteDirections from './RouteDirections';

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
  
  // Безопасное получение текущего региона
  const safeRegion = React.useMemo(() => {
    if (region) {
      return region;
    } else if (internalRegion) {
      return internalRegion;
    } else if (userLocation && userLocation.coords) {
      return {
        latitude: userLocation.coords.latitude,
        longitude: userLocation.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01
      };
    }
    // В крайнем случае вернем дефолтный регион (Москва), 
    // но это произойдет только если ничего не передано
    return {
      latitude: 55.751244,
      longitude: 37.618423,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01
    };
  }, [region, internalRegion, userLocation]);
  
  // Обработка начала взаимодействия пользователя с картой
  const handlePanDrag = useCallback(() => {
    isUserInteractingRef.current = true;
  }, []);
  
  // Обработка готовности карты
  const handleMapReady = useCallback(() => {
    console.log('MapView готова к отображению');
    
    // При первой загрузке сразу центрируем на местоположении пользователя
    if (userLocation && !initialLoadDoneRef.current && ref?.current) {
      console.log('MapView: перемещаемся к местоположению пользователя при загрузке');
      const newRegion = {
        latitude: userLocation.coords.latitude,
        longitude: userLocation.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      
      // Небольшая задержка для гарантии что карта готова
      setTimeout(() => {
        ref.current.animateToRegion(newRegion, 500);
      }, 300);
      
      initialLoadDoneRef.current = true;
    }
  }, [userLocation]);
  
  // Безопасный обработчик нажатия на карту
  const handlePress = useCallback((event) => {
    if (onPress && event && event.nativeEvent) {
      console.log('Обрабатываем нажатие на карту');
      onPress(event);
    }
  }, [onPress]);
  
  // Безопасный обработчик изменения региона
  const handleRegionChange = useCallback((newRegion, details) => {
    // Очищаем предыдущий таймер
    if (regionChangeTimeoutRef.current) {
      clearTimeout(regionChangeTimeoutRef.current);
    }
    
    // Сохраняем внутренний регион всегда
    setInternalRegion(newRegion);
    
    // Если пользователь двигает карту, обновляем флаг движения
    if (details && details.isGesture) {
      isMovingRef.current = true;
      isUserInteractingRef.current = true;
    }
    
    // Откладываем вызов, чтобы уменьшить количество обновлений
    regionChangeTimeoutRef.current = setTimeout(() => {
      if (onRegionChange && !routeData) {
        onRegionChange(newRegion);
      }
      
      // Сбрасываем флаг движения через небольшую задержку
      isMovingRef.current = false;
      
      // Не сбрасываем флаг взаимодействия при изменении региона
      // в результате жеста пользователя, а только через 5 секунд
      if (details && details.isGesture) {
        setTimeout(() => {
          isUserInteractingRef.current = false;
        }, 5000);
      } else {
        isUserInteractingRef.current = false;
      }
    }, 100);
  }, [onRegionChange, routeData]);
  
  // Специальный эффект только для первой загрузки с местоположением
  useEffect(() => {
    if (userLocation && !initialLoadDoneRef.current) {
      console.log('MapView: обнаружено первое местоположение пользователя');
      // Отметим что центрирование произойдет через onMapReady
      initialLoadDoneRef.current = true;
      
      // Также обновим внутренний регион
      setInternalRegion({
        latitude: userLocation.coords.latitude,
        longitude: userLocation.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    }
  }, [userLocation]);
  
  // Обновление региона при изменении местоположения пользователя
  useEffect(() => {
    // Сохраняем последнее местоположение для проверки изменений
    if (userLocation && 
        (!lastUserLocationRef.current || 
         userLocation.coords.latitude !== lastUserLocationRef.current.latitude ||
         userLocation.coords.longitude !== lastUserLocationRef.current.longitude)) {
      
      lastUserLocationRef.current = {
        latitude: userLocation.coords.latitude,
        longitude: userLocation.coords.longitude
      };
      
      // Обновляем регион только если не строится маршрут и пользователь не взаимодействует с картой
      if (!routeData && !isUserInteractingRef.current && ref?.current) {
        const newRegion = {
          latitude: userLocation.coords.latitude,
          longitude: userLocation.coords.longitude,
          latitudeDelta: safeRegion.latitudeDelta,
          longitudeDelta: safeRegion.longitudeDelta,
        };
        
        // Используем ref для обновления региона напрямую
        ref.current.animateToRegion(newRegion, 1000);
      }
    }
  }, [userLocation, routeData, safeRegion, ref]);
  
  // Очистка таймера при размонтировании
  useEffect(() => {
    return () => {
      if (regionChangeTimeoutRef.current) {
        clearTimeout(regionChangeTimeoutRef.current);
      }
    };
  }, []);

  // Если нет валидного региона или координат, не рендерим карту
  if (!hasValidRegion) {
    return <View style={styles.container} />;
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={ref}
        style={styles.map}
        provider={Platform.OS === 'ios' ? undefined : PROVIDER_GOOGLE}
        initialRegion={initialRegion}
        region={safeRegion}
        onRegionChange={handleRegionChange}
        onPress={handlePress}
        onPanDrag={handlePanDrag}
        onMapReady={handleMapReady}
        showsUserLocation={!!userLocation}
        showsMyLocationButton={false}
        showsCompass={false}
        showsScale={true}
        loadingEnabled={true}
        mapType={mapType}
        rotateEnabled={rotateEnabled}
        zoomEnabled={true}
        scrollEnabled={true}
        pitchEnabled={true}
        toolbarEnabled={false}
        moveOnMarkerPress={false}
        minZoomLevel={3}
        maxZoomLevel={20}
      >
        {/* Отображение маршрута если данные предоставлены и маршрут не загружается */}
        {routeData && routeData.origin && routeData.destination && !isRouteLoading && (
          <RouteDirections
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
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  map: {
    width: '100%',
    height: '100%',
  },
});

export default React.memo(MapViewComponent);

