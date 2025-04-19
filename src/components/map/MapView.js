import React, { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import { StyleSheet, View, Platform, Text } from 'react-native';
import MapView, { PROVIDER_GOOGLE, PROVIDER_DEFAULT, UrlTile, Marker, Callout } from 'react-native-maps';
import FixedRouteDirections from './FixedRouteDirections';
import { logMapInfo } from '../../utils/DebugHelper';

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
  
  // Мемоизируем начальный регион только из переданного региона или местоположения
  const initialRegion = React.useMemo(() => {
    // Для Android релизной сборки используем более надежную инициализацию
    if (Platform.OS === 'android' && !__DEV__) {
      logMapInfo('Используем фиксированный начальный регион для Android релиза');
      return {
        latitude: 55.751244,
        longitude: 37.618423,
        latitudeDelta: 0.1, // Увеличенное значение для более надежной загрузки
        longitudeDelta: 0.1
      };
    }

    if (region) {
      logMapInfo('Используем переданный регион: ' + JSON.stringify(region));
      return region;
    } else if (userLocation && userLocation.coords) {
      logMapInfo('Используем местоположение пользователя для начального региона');
      return {
        latitude: userLocation.coords.latitude,
        longitude: userLocation.coords.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02
      };
    }
    
    logMapInfo('Используем дефолтный регион');
    return {
      latitude: 55.751244,
      longitude: 37.618423,
      latitudeDelta: 0.1,
      longitudeDelta: 0.1
    };
  }, [region, userLocation]);
  
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
  const handleMapPress = useCallback((event) => {
    try {
      if (onPress) {
        onPress(event);
      }
    } catch (error) {
      console.error('Error in MapView handleMapPress:', error);
    }
  }, [onPress]);

  // Глобальный обработчик ошибок для действий с картой
  const safelyExecute = useCallback((fn, ...args) => {
    try {
      return fn(...args);
    } catch (error) {
      console.error('Error in MapView operation:', error);
      return null;
    }
  }, []);
  
  // Обработчик начала перемещения карты
  const handlePanDrag = useCallback(() => {
    isUserInteractingRef.current = true;
  }, []);
  
  // Обработчик загрузки карты
  const handleMapReady = useCallback(() => {
    logMapInfo('onMapReady вызван');
    console.log('MapView: onMapReady вызван');
    initialLoadDoneRef.current = true;
    
    // Фиксированный регион для инициализации
    const defaultRegion = {
      latitude: 55.751244,
      longitude: 37.618423,
      latitudeDelta: 0.1,
      longitudeDelta: 0.1
    };
    
    if (mapRef.current && (!region && !userLocation)) {
      // Если нет других регионов, используем фиксированный
      setTimeout(() => {
        try {
          mapRef.current.animateToRegion(defaultRegion, 100);
        } catch (e) {
          console.error('Error animating to region:', e);
        }
      }, 300);
    }
    
    // Если есть начальный регион - используем его
    if (initialRegion && mapRef.current) {
      logMapInfo('Анимируем к начальному региону: ' + 
        JSON.stringify({
          lat: initialRegion.latitude,
          lng: initialRegion.longitude,
          delta: initialRegion.latitudeDelta
        }));
      console.log('MapView: Анимируем к начальному региону', initialRegion);
      mapRef.current.animateToRegion(initialRegion, 500);
    } else {
      logMapInfo('Нет начального региона или mapRef');
      console.log('MapView: Нет начального региона или mapRef');
    }
    
    // Проверка API ключа для Android в релизной сборке
    if (Platform.OS === 'android' && !__DEV__) {
      logMapInfo('Проверяем API ключ для Google Maps');
      try {
        // Проверка наличия объекта карты
        if (mapRef.current && mapRef.current._rendererComponent) {
          logMapInfo('Renderer компонент карты существует');
        }
      } catch (error) {
        logMapInfo('Ошибка при проверке Google Maps API: ' + error.message);
      }
    }
  }, [initialRegion]);
  
  // Таймаут для гарантированной инициализации карты
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!initialLoadDoneRef.current) {
        logMapInfo('Карта не была инициализирована в течение 5 секунд, выполняем принудительную инициализацию');
        initialLoadDoneRef.current = true;
        
        if (mapRef.current && initialRegion) {
          logMapInfo('Принудительная анимация к начальному региону');
          mapRef.current.animateToRegion(initialRegion, 500);
        }
      }
    }, 5000);
    
    return () => clearTimeout(timer);
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

  // Добавляем отладочную информацию о загрузке карты
  useEffect(() => {
    // Логируем начальные параметры карты
    logMapInfo(`Параметры карты: platform=${Platform.OS}, dev=${__DEV__}, provider=${Platform.OS === 'android' ? 'GOOGLE' : 'DEFAULT'}, hasValidRegion=${hasValidRegion}`);
    
    // Проверяем стили
    logMapInfo(`Стили карты: ${JSON.stringify(styles.map)}`);
  }, [hasValidRegion]);

  // Рендер компонента карты
  return (
    <View style={styles.container}>
      {!hasValidRegion && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1a73e8" />
          <Text style={styles.loadingText}>Загрузка карты...</Text>
        </View>
      )}

      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={initialRegion}
        region={(hasValidRegion && !isUserInteractingRef.current) ? region : undefined}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
        mapType="standard"
        rotateEnabled={rotateEnabled}
        zoomEnabled={true}
        scrollEnabled={true}
        pitchEnabled={true}
        toolbarEnabled={false}
        moveOnMarkerPress={false}
        onPress={handleMapPress}
        onRegionChangeComplete={handleRegionChange}
        onPanDrag={handlePanDrag}
        onMapReady={handleMapReady}
        showsUserLocation={!!userLocation}
        followsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={true}
        loadingEnabled={true}
        showsScale={true}
        showsBuildings={Platform.OS === 'android'}
        showsTraffic={false}
        showsIndoors={false}
        showsIndoorLevelPicker={false}
        minZoomLevel={3}
        maxZoomLevel={19}
      >
        {/* Тайлы OpenStreetMap только для iOS, т.к. на Android используем Google Maps */}
        {Platform.OS === 'ios' && (
          <UrlTile 
            urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            maximumZ={19}
            flipY={false}
          />
        )}
        
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
        
        {children}
      </MapView>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    position: 'relative', // Добавляем для корректного позиционирования
  },
  map: {
    width: '100%',
    height: '100%',
    backgroundColor: '#e0e0e0', // Добавляем цвет фона для визуальной отладки
    position: 'absolute', // Расположение карты
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
  }
});

export default MapViewComponent;
