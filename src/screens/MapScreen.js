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
  const [isSearchLoading, setIsSearchLoading] = useState(false); // Индикатор загрузки поиска
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
  const mounted = useRef(true); // Добавляю ref для отслеживания монтирования компонента

  // Добавляем ref для отслеживания показа алерта об ошибке API
  const apiErrorAlertShownRef = useRef(false);

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

  // Эффект для отслеживания монтирования/размонтирования компонента
  useEffect(() => {
    // Компонент смонтирован
    mounted.current = true;
    
    // Очистка при размонтировании
    return () => {
      mounted.current = false;
      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current);
      }
    };
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

  // Обработчик изменения текста в поле поиска
  const handleSearchTextChange = (text) => {
    setSearchText(text);
    
    // Очищаем предыдущий таймаут
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }
    
    // Если текст пустой, сразу очищаем результаты
    if (!text.trim()) {
      setSearchResults([]);
      return;
    }
    
    // Устанавливаем таймаут для выполнения поиска (дебаунсинг)
    searchTimerRef.current = setTimeout(() => {
      if (text.trim().length >= 3) {
        handleSearch(text);
      }
    }, 300); // Задержка 300 мс между вводом и запросом
  };

  // Обработчик запроса поиска
  const handleSearch = (searchQuery = searchText) => {
    // Используем либо переданный параметр, либо текущий searchText
    const query = searchQuery.trim();
    
    if (!query) {
      setSearchResults([]);
      return;
    }
    
    // Минимальная длина запроса
    if (query.length < 3) {
      return;
    }
    
    console.log(`Выполняю поиск для запроса: "${query}"`);
    
    // Показываем индикатор загрузки
    setIsSearchLoading(true);
    
    // Запрашиваем места по запросу, передавая координаты пользователя если они доступны
    const userCoords = location?.coords ? {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude
    } : null;
    
    searchPlaces(query, 20, userCoords)
      .then(results => {
        // Скрываем индикатор загрузки
        setIsSearchLoading(false);
        
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
        // Скрываем индикатор загрузки
        setIsSearchLoading(false);
        
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
    console.log('🔍 ВЫЗВАН handleSelectSearchResult с результатом:', JSON.stringify(result));
    
    // Проверка на валидность результата
    if (!result) {
      console.warn('🚫 Пустой результат поиска');
      return;
    }
    
    try {
      // Получаем координаты из результата
      const lat = typeof result.latitude === 'string' ? parseFloat(result.latitude) : result.latitude;
      const lng = typeof result.longitude === 'string' ? parseFloat(result.longitude) : result.longitude;
      
      // Проверяем валидность координат
      if (isNaN(lat) || isNaN(lng)) {
        console.error('🚫 Некорректные координаты в результате:', JSON.stringify(result));
        return;
      }
      
      // Создаем объект с координатами
      const coordinate = {
        latitude: lat,
        longitude: lng
      };
      
      console.log('📍 Установка маркера по координатам:', coordinate);
      
      // Скрываем клавиатуру и сбрасываем результаты поиска немедленно
      Keyboard.dismiss();
      setSearchText('');
      setSearchResults([]);
      setIsSearchFocused(false);
      
      // Сброс маршрута если он был активен
      if (isRouting) {
        setIsRouting(false);
        setRouteDetails(null);
        setAllRoutes({
          DRIVING: null,
          WALKING: null,
          BICYCLING: null,
          TRANSIT: null
        });
      }
      
      // Создаем информацию о выбранном месте
      const placeInfo = {
        name: result.name || 'Выбранное место',
        address: result.address || `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
        distance: result.distance
      };
      
      // 1. Устанавливаем выбранное место и информацию о нем
      setSelectedLocation(coordinate);
      setSelectedPlaceInfo(placeInfo);
      
      // 2. Определяем новый регион и устанавливаем его сразу
      const newRegion = {
        latitude: lat,
        longitude: lng,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01
      };
      
      // Устанавливаем регион напрямую
      setRegion(newRegion);
      
      // 3. ВАЖНО: используем setTimeout с mapRef для перемещения карты
      setTimeout(() => {
        if (mapRef.current) {
          console.log('🗺️ Анимация карты к координатам:', coordinate);
          mapRef.current.animateToRegion(newRegion, 300);
        } else {
          console.warn('⚠️ mapRef недоступен для анимации');
        }
      }, 300);
      
      console.log('✅ Выбор результата поиска завершен успешно');
    } catch (error) {
      console.error('🔴 Ошибка в handleSelectSearchResult:', error);
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
    
    // Сбрасываем флаг запроса всех типов маршрутов
    window.allRoutesRequested = false;
    
    setIsRouting(true);
    setIsReverseRoute(reverse);
  };

  // Отмена построения маршрута
  const handleCancelRouting = () => {
    setIsRouting(false);
    setRouteDetails(null);
    routesRequestedRef.current = false;
    
    // Сбрасываем флаг запроса всех типов маршрутов
    window.allRoutesRequested = false;
    
    // Сбрасываем глобальный флаг блокировки API
    window.mapEaseApiBlocked = false;
    
    // Сбрасываем флаг показа алерта об ошибке API
    if (apiErrorAlertShownRef) {
      apiErrorAlertShownRef.current = false;
    }
    
    // Сбрасываем состояние маршрутов
    setAllRoutes({
      DRIVING: null,
      WALKING: null,
      BICYCLING: null,
      TRANSIT: null
    });
    
    // Сбрасываем состояние загрузки
    setRoutesLoading({
      DRIVING: false,
      WALKING: false,
      BICYCLING: false,
      TRANSIT: false
    });
  };

  // Функция для получения фактического режима API в зависимости от типа
  const getEffectiveMode = (mode) => {
    switch (mode) {
      case 'WALKING':
        return 'WALKING';
      case 'BICYCLING':
        return 'BICYCLING';
      case 'TRANSIT':
        return 'TRANSIT';
      case 'DRIVING':
      default:
        return 'DRIVING';
    }
  };

  // Функция для получения типа транспорта из режима API
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

  // Обработчик готовности маршрута
  const handleRouteReady = (routeData) => {
    // Проверяем валидность маршрута и смонтированность компонента
    if (!routeData) return;
    
    // Проверяем наличие ошибки API
    if (routeData.error) {
      console.error(`Ошибка получения маршрута: ${routeData.error}`);
      
      // Сбрасываем индикаторы загрузки
      setRoutesLoading({
        DRIVING: false,
        WALKING: false,
        BICYCLING: false,
        TRANSIT: false
      });
      
      // Показываем сообщение об ошибке только один раз
      if (routeData.error === "API_ACCESS_DENIED" && !apiErrorAlertShownRef.current) {
        // Отмечаем, что алерт уже показан
        apiErrorAlertShownRef.current = true;
        
        // Блокируем повторные запросы маршрутов
        routesRequestedRef.current = true;
        
        Alert.alert(
          "Ошибка доступа к сервису маршрутов",
          "Сервис маршрутизации недоступен: отказано в доступе. Пожалуйста, повторите попытку позже.",
          [{ 
            text: "OK", 
            onPress: () => {
              // После закрытия алерта сбрасываем маршрут
              handleCancelRouting();
            }
          }]
        );
      }
      
      // Не продолжаем запрашивать другие типы маршрутов
      return;
    }
    
    // Сбрасываем флаг показа алерта при успешном запросе
    apiErrorAlertShownRef.current = false;
    
    console.log(`Получен маршрут: ${routeData.distance.toFixed(1)} км, ${Math.round(routeData.duration)} мин, тип: ${routeData.mode}`);
    
    // Сохраняем полученные данные маршрута
    setRouteDetails({
      distance: routeData.distance,
      duration: routeData.duration,
      isApproximate: routeData.isApproximate || false
    });
    
    // Сбрасываем индикатор загрузки для текущего типа маршрута
    setRoutesLoading(prev => ({
      ...prev,
      [routeMode]: false
    }));
    
    // Сохраняем маршрут текущего типа
    setAllRoutes(prev => ({
      ...prev,
      [routeMode]: routeData
    }));
    
    // Подстраиваем карту под маршрут только если есть координаты
    if (mapRef.current && routeData.coordinates && routeData.coordinates.length > 0) {
      console.log(`Подстраиваем карту под маршрут: ${routeData.coordinates.length} точек`);
      const padding = { top: 100, right: 50, bottom: 250, left: 50 };
      mapRef.current.fitToCoordinates(routeData.coordinates, {
        edgePadding: padding, 
        animated: true 
      });
    }
    
    // Запрашиваем другие типы маршрутов только один раз и только если они еще не загружены
    if (!routesRequestedRef.current) {
      // Отмечаем, что запрос остальных маршрутов уже сделан
      routesRequestedRef.current = true;
      
      // Запускаем запрос остальных типов маршрутов с небольшой задержкой,
      // чтобы дать завершиться текущим операциям
      setTimeout(requestAllRouteTypes, 300);
    }
  };

  // Функция для запроса всех типов маршрутов (только раз)
  const requestAllRouteTypes = () => {
    // Проверяем, что мы еще не запрашивали все типы маршрутов
    if (window.allRoutesRequested) {
      console.log('Все маршруты уже были запрошены ранее, пропускаем');
      return;
    }
    
    // Устанавливаем флаг, что мы запросили все типы
    window.allRoutesRequested = true;
    
    // Проверяем глобальный флаг блокировки API
    if (window.mapEaseApiBlocked) {
      console.log('requestAllRouteTypes: API заблокирован, пропускаем запросы других типов маршрутов');
      return;
    }

    // Получаем параметры маршрута
    const origin = isReverseRoute ? selectedLocation : {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };
    
    const destination = isReverseRoute ? {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    } : selectedLocation;
    
    // Проверяем, что координаты валидны
    if (!origin || !destination || !origin.latitude || !destination.latitude) {
      console.log('Невозможно запросить все типы маршрутов: невалидные координаты');
      return;
    }
    
    // Формируем ключ запроса для проверки на дублирование
    const requestKey = JSON.stringify({
      originLat: origin.latitude.toFixed(6),
      originLng: origin.longitude.toFixed(6),
      destLat: destination.latitude.toFixed(6),
      destLng: destination.longitude.toFixed(6)
    });
    
    // Сохраняем ключ для проверки в будущем
    window.lastRouteRequestKey = requestKey;
    
    // Массив типов, которые нужно запросить
    const typesToRequest = ['DRIVING', 'WALKING', 'BICYCLING', 'TRANSIT'].filter(
      type => type !== routeMode && !allRoutes[type]?.coordinates?.length
    );
    
    // Если нет типов для запроса, выходим
    if (typesToRequest.length === 0) {
      console.log('Нет дополнительных типов маршрутов для запроса');
      return;
    }
    
    console.log(`Запрашиваю следующие типы маршрутов: ${typesToRequest.join(', ')}`);
    
    // Устанавливаем индикаторы загрузки только для типов, которые будем запрашивать
    const newLoadingState = {...routesLoading};
    typesToRequest.forEach(type => {
      newLoadingState[type] = true;
    });
    setRoutesLoading(newLoadingState);
    
    // Запрашиваем все типы с задержкой между запросами
    // Увеличиваем интервал до 1200мс для большего разнесения запросов
    typesToRequest.forEach((type, index) => {
      setTimeout(() => {
        // Проверяем, что компонент все еще смонтирован
        if (!mounted.current) {
          console.log(`Компонент размонтирован, отменяем запрос маршрута типа ${type}`);
          return;
        }
        
        // Проверяем, что API не заблокирован
        if (window.mapEaseApiBlocked) {
          console.log(`API заблокирован, отменяем запрос маршрута типа ${type}`);
          setRoutesLoading(prev => ({
            ...prev,
            [type]: false
          }));
          return;
        }
        
        // Проверяем, что параметры маршрута не изменились
        if (window.lastRouteRequestKey !== requestKey) {
          console.log(`Параметры маршрута изменились, отменяем запрос типа ${type}`);
          setRoutesLoading(prev => ({
            ...prev,
            [type]: false
          }));
          return;
        }
        
        // Проверяем, не запрашивается ли уже этот тип маршрута
        const typeRequestKey = JSON.stringify({
          originLat: origin.latitude.toFixed(6),
          originLng: origin.longitude.toFixed(6),
          destLat: destination.latitude.toFixed(6),
          destLng: destination.longitude.toFixed(6),
          mode: type
        });
        
        if (window.currentRouteRequests && window.currentRouteRequests.has(typeRequestKey)) {
          console.log(`Запрос для типа ${type} уже выполняется, пропускаем`);
          return;
        }
        
        // Запрашиваем маршрут
        requestRouteForType(type, origin, destination);
      }, index * 1200); // Увеличиваем интервал между запросами до 1.2 секунды
    });
  };

  // Функция для запроса маршрута определенного типа
  const requestRouteForType = (type, origin, destination) => {
    // Если аргументы не переданы, используем текущее состояние
    if (!origin || !destination) {
      origin = isReverseRoute ? selectedLocation : {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
      
      destination = isReverseRoute ? {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      } : selectedLocation;
    }
    
    // Проверяем, что данные для запроса есть
    if (!origin || !destination || !origin.latitude || !destination.latitude) {
      console.log(`Невозможно запросить маршрут типа ${type}: отсутствуют координаты`);
      setRoutesLoading(prev => ({ ...prev, [type]: false }));
      return;
    }
    
    // Проверяем, не заблокирован ли API
    if (window.mapEaseApiBlocked) {
      console.log(`Запрос маршрута типа ${type} отменен: API заблокирован`);
      setRoutesLoading(prev => ({ ...prev, [type]: false }));
      return;
    }
    
    // Проверяем, что начальная и конечная точки не совпадают
    const isSameLocation = 
      Math.abs(origin.latitude - destination.latitude) < 0.0000001 && 
      Math.abs(origin.longitude - destination.longitude) < 0.0000001;
    
    if (isSameLocation) {
      console.log(`Запрос маршрута типа ${type} отменен: начальная и конечная точки совпадают`);
      setRoutesLoading(prev => ({ ...prev, [type]: false }));
      return;
    }
    
    console.log(`Запрашиваем маршрут типа ${type}`);
    
    // Отмечаем, что маршрут загружается
    setRoutesLoading(prev => ({ ...prev, [type]: true }));
    
    // Формируем ключ запроса для кэширования и проверки на дублирование
    const requestParams = JSON.stringify({
      originLat: origin.latitude.toFixed(6),
      originLng: origin.longitude.toFixed(6),
      destLat: destination.latitude.toFixed(6),
      destLng: destination.longitude.toFixed(6),
      mode: type
    });
    
    // Проверяем кэш маршрутов
    if (window.routeRequestsCache && window.routeRequestsCache[requestParams]) {
      const cachedData = window.routeRequestsCache[requestParams];
      const cachedTimestamp = cachedData.timestamp || 0;
      const currentTime = Date.now();
      
      // Используем кэшированные данные, если они не старше 5 минут
      if (currentTime - cachedTimestamp < 5 * 60 * 1000) {
        console.log(`Используем кэшированный маршрут для типа ${type}`);
        
        // Обновляем состояние маршрута из кэша
        setAllRoutes(prev => ({ 
          ...prev, 
          [type]: {
            coordinates: cachedData.coordinates || [],
            distance: cachedData.distance || 0,
            duration: cachedData.duration || 0,
            isApproximate: cachedData.isApproximate || false,
            mode: type,
            trafficData: cachedData.trafficData || []
          }
        }));
        
        // Если это текущий выбранный тип, обновляем детали маршрута
        if (type === routeMode) {
          setRouteDetails({
            distance: cachedData.distance || 0,
            duration: cachedData.duration || 0,
            isApproximate: cachedData.isApproximate || false
          });
        }
        
        // Сбрасываем индикатор загрузки
        setRoutesLoading(prev => ({ ...prev, [type]: false }));
        
        return;
      }
    }
    
    // Выполняем запрос маршрута
    fetchRouteDirections(origin, destination, [], type)
      .then(result => {
        // Проверяем, активен ли еще компонент
        if (!mounted.current) return;
        
        // Проверяем наличие ошибки API
        if (result && result.error === "API_ACCESS_DENIED") {
          console.log(`Ошибка API при запросе маршрута типа ${type}`);
          window.mapEaseApiBlocked = true;
          
          // Сбрасываем индикатор загрузки
          setRoutesLoading(prev => ({ ...prev, [type]: false }));
          
          // Показываем сообщение только если еще не показывали
          if (!apiErrorAlertShownRef.current) {
            apiErrorAlertShownRef.current = true;
            Alert.alert(
              "API маршрутов недоступен",
              "Сервис построения маршрутов в данный момент недоступен. Пожалуйста, попробуйте позже.",
              [{ 
                text: "OK", 
                onPress: () => apiErrorAlertShownRef.current = false 
              }]
            );
          }
          
          return;
        }
        
        // Проверяем успешность запроса
        if (result && result.coordinates && result.coordinates.length > 0) {
          console.log(`Получен маршрут типа ${type}: ${result.distance.toFixed(1)} км, ${Math.round(result.duration)} мин`);
          
          // Сохраняем маршрут
          setAllRoutes(prev => ({ ...prev, [type]: result }));
          
          // Если это текущий выбранный тип, обновляем детали маршрута
          if (type === routeMode) {
            setRouteDetails({
              distance: result.distance || 0,
              duration: result.duration || 0,
              isApproximate: result.isApproximate || false
            });
            
            // Подстраиваем карту под маршрут только для активного типа
            if (mapRef.current && result.coordinates.length > 1) {
              mapRef.current.fitToCoordinates(result.coordinates, {
                edgePadding: { top: 100, right: 50, bottom: 250, left: 50 },
                animated: true
              });
            }
          }
        } else {
          console.log(`Не удалось получить маршрут типа ${type}`);
        }
        
        // Сбрасываем индикатор загрузки
        setRoutesLoading(prev => ({ ...prev, [type]: false }));
      })
      .catch(error => {
        console.error(`Ошибка при запросе маршрута типа ${type}:`, error);
        setRoutesLoading(prev => ({ ...prev, [type]: false }));
      });
  };

  // Обработчик изменения типа маршрута
  const handleRouteTypeChange = (mode) => {
    console.log(`Переключение на тип маршрута: ${mode}`);
    
    // Не делаем ничего, если это тот же самый тип
    if (mode === routeMode) return;
    
    // Проверяем блокировку API
    if (window.mapEaseApiBlocked) {
      console.log('Переключение типа маршрута отменено: API заблокирован');
      
      // Показываем сообщение только один раз
      if (!apiErrorAlertShownRef.current) {
        apiErrorAlertShownRef.current = true;
        
        Alert.alert(
          "Сервис маршрутов недоступен",
          "Невозможно построить маршрут, так как сервис API недоступен. Попробуйте позже или отмените маршрут.",
          [
            { text: "Отменить маршрут", onPress: handleCancelRouting },
            { text: "OK", onPress: () => { apiErrorAlertShownRef.current = false; } }
          ]
        );
      }
      
      return;
    }
    
    // Обновляем текущий режим маршрута
    setRouteMode(mode);
    
    // Если для этого типа уже есть данные маршрута, просто показываем их
    if (allRoutes[mode] && allRoutes[mode].coordinates && allRoutes[mode].coordinates.length > 0) {
      console.log(`Используем существующий маршрут типа ${mode}`);
      
      // Обновляем детали маршрута
      setRouteDetails({
        distance: allRoutes[mode].distance || 0,
        duration: allRoutes[mode].duration || 0,
        isApproximate: allRoutes[mode].isApproximate || false
      });
      
      // Сбрасываем индикатор загрузки
      setRoutesLoading(prev => ({ ...prev, [mode]: false }));
      
      // Подстраиваем карту под маршрут
      if (mapRef.current && allRoutes[mode].coordinates.length > 0) {
        const padding = { top: 100, right: 50, bottom: 250, left: 50 };
        mapRef.current.fitToCoordinates(allRoutes[mode].coordinates, { 
          edgePadding: padding, 
          animated: true 
        });
      }
      
      return;
    }
    
    // Устанавливаем флаг загрузки для этого типа
    setRoutesLoading(prev => ({ ...prev, [mode]: true }));
    
    // Запрашиваем маршрут
    const origin = isReverseRoute ? selectedLocation : {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };
    
    const destination = isReverseRoute ? {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    } : selectedLocation;
    
    // Используем общую функцию для запроса маршрута
    requestRouteForType(mode, origin, destination);
  };

  // Обработчик голосового поиска
  const handleVoiceSearch = () => {
    Alert.alert(
      "Голосовой поиск",
      "Функция голосового поиска будет доступна в следующей версии приложения"
    );
  };

  // Проверка, загружается ли текущий маршрут
  const isCurrentRouteLoading = () => {
    return routesLoading[routeMode] === true;
  };

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
          routeData={isRouting && selectedLocation && location && !isCurrentRouteLoading() ? {
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
          isRouteLoading={isCurrentRouteLoading()}
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

        {/* Строка поиска */}
        <SearchBar
          value={searchText}
          onChangeText={handleSearchTextChange}
          onSubmit={() => handleSearch()}
          onFocus={() => setIsSearchFocused(true)}
          onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
          onClear={() => {
            setSearchText('');
            setSearchResults([]);
          }}
          isLoading={isSearchLoading}
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
            originName={isReverseRoute ? (selectedPlaceInfo?.name || "Выбранное место") : "Моё местоположение"}
            destinationName={isReverseRoute ? "Моё местоположение" : (selectedPlaceInfo?.name || "Выбранное место")}
            activeRouteType={getTransportTypeFromMode(routeMode)}
            allRoutes={allRoutes}
            routesLoading={routesLoading}
            onSwapDirection={() => setIsReverseRoute(!isReverseRoute)}
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
});

export default MapScreen;
