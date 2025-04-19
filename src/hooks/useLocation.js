import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Location from 'expo-location';

/**
 * Хук для работы с геолокацией пользователя
 * @return {Object} Объект с данными о местоположении и методами
 */
export const useLocation = () => {
  // Состояние для текущего местоположения
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  // Устанавливаем начальный регион на Москву, чтобы избежать показа Бразилии
  const [region, setRegion] = useState({
    latitude: 55.7558,
    longitude: 37.6173,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1
  });
  
  // Добавляем состояния для улучшенного UX
  // Флаг разрешения на геолокацию
  const [locationPermission, setLocationPermission] = useState(null);
  // Флаг загрузки местоположения (для отображения уведомления)
  const [isLocationLoading, setIsLocationLoading] = useState(true);
  // Флаг готовности карты к отображению
  const [isMapReady, setIsMapReady] = useState(false);
  
  // Функция запроса разрешения на геолокацию
  const requestLocationPermission = async () => {
    setIsLocationLoading(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        setErrorMsg('Для работы приложения необходимо разрешение на доступ к геолокации');
        setLocationPermission(false);
        setIsLocationLoading(false);
        return false;
      }
      
      setLocationPermission(true);
      return true;
    } catch (error) {
      console.error('Ошибка при запросе разрешения:', error);
      setLocationPermission(false);
      setIsLocationLoading(false);
      return false;
    }
  };
  
  // Функция получения местоположения
  const fetchLocation = async () => {
    try {
      console.log('Получение геолокации...');
      
      // Получаем текущее местоположение с высокой точностью
      const location = await Location.getCurrentPositionAsync({
        accuracy: Platform.OS === 'android' ? Location.Accuracy.High : Location.Accuracy.Balanced,
        timeout: 15000 // Увеличиваем таймаут для Android
      });
      
      setLocation(location);
      
      // Если получили координаты, устанавливаем их в регион
      if (location && location.coords) {
        console.log('Получены координаты:', location.coords.latitude, location.coords.longitude);
        
        const newRegion = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02
        };
        
        setRegion(newRegion);
        
        // Объявляем карту готовой к отображению
        setIsMapReady(true);
        
        // Завершаем загрузку
        setIsLocationLoading(false);
        
        return true;
      }
    } catch (error) {
      console.error('Ошибка получения местоположения:', error);
      setErrorMsg('Ошибка получения местоположения: ' + error.message);
      setIsLocationLoading(false);
    }
    
    return false;
  };
  
  // Эффект для инициализации геолокации
  useEffect(() => {
    (async () => {
      // Запрашиваем разрешение
      const hasPermission = await requestLocationPermission();
      
      if (hasPermission) {
        // Если разрешение получено, получаем местоположение
        await fetchLocation();
        
        // Подписка на обновления местоположения
        const watchId = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 5000,
            distanceInterval: 10
          },
          newLocation => {
            setLocation(newLocation);
          }
        );
        
        // Отписка при размонтировании компонента
        return () => {
          watchId.remove();
        };
      }
    })();
  }, []);

  // Функция для центрирования на текущем местоположении
  const centerOnUserLocation = (mapRef) => {
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

  return {
    location,
    errorMsg,
    region,
    setRegion,
    locationPermission,
    isLocationLoading,
    isMapReady,
    centerOnUserLocation,
    calculateDistance,
    requestLocationPermission,
    fetchLocation
  };
};

export default useLocation;