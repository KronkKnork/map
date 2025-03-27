import { useState, useEffect, useRef } from 'react';
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
  const [locationPermission, setLocationPermission] = useState(false);
  
  // Эффект для получения разрешения на доступ к местоположению
  useEffect(() => {
    (async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        
        if (status !== 'granted') {
          setErrorMsg('Для работы приложения необходимо разрешение на доступ к геолокации');
          setLocationPermission(false);
          return;
        }
        
        setLocationPermission(true);
        
        // Получаем текущее местоположение
        let location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced
        });
        
        setLocation(location);
        
        // Устанавливаем начальный регион для карты всегда при получении первого местоположения
        if (location && location.coords) {
          const newRegion = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            latitudeDelta: 0.02,
            longitudeDelta: 0.02
          };
          setRegion(newRegion);
          
          // Добавляем небольшую задержку для обновления региона
          // Это помогает решить проблему с начальным отображением
          setTimeout(() => {
            setRegion({
              ...newRegion,
              latitudeDelta: 0.019, // Немного изменяем значение для гарантированного обновления
              longitudeDelta: 0.019
            });
          }, 500);
        }
        
        // Подписка на обновления местоположения
        const watchId = Location.watchPositionAsync(
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
          watchId.then(subscription => subscription.remove());
        };
      } catch (error) {
        setErrorMsg('Ошибка получения местоположения: ' + error.message);
        console.error('Ошибка геолокации:', error);
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
    centerOnUserLocation,
    calculateDistance
  };
};

export default useLocation; 