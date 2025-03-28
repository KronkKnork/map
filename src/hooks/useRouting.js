import { useState, useRef, useEffect } from 'react';
import { Alert } from 'react-native';
import { fetchRouteDirections } from '../services/api';

/**
 * Хук для управления маршрутами и навигацией
 * @param {Object} dependencies - Зависимости хука
 * @param {Object} dependencies.location - Текущее местоположение пользователя
 * @param {Object} dependencies.selectedLocation - Выбранное местоположение
 * @param {Object} dependencies.selectedPlaceInfo - Информация о выбранном месте
 * @param {Object} dependencies.mapRef - Ссылка на компонент карты
 * @return {Object} Объект с методами и состоянием для работы с маршрутами
 */
export const useRouting = ({ location, selectedLocation, selectedPlaceInfo, mapRef }) => {
  // Состояние маршрута
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
  
  // Добавляем отдельный стейт для разворачивания карты
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  
  // Ссылки
  const routesRequestedRef = useRef(false);
  const apiErrorAlertShownRef = useRef(false);
  const mounted = useRef(true);
  const lastRequestTimeRef = useRef(0);
  const requestTimeoutRef = useRef(null);
  
  // Отслеживаем, был ли отображен маршрут определенного типа
  const routeDisplayedRef = useRef({
    DRIVING: false,
    WALKING: false, 
    BICYCLING: false,
    TRANSIT: false
  });
  
  // Следим за изменением isMapExpanded
  useEffect(() => {
    if (isMapExpanded && mounted.current) {
      // Ждем 1 секунду после разворачивания карты
      const timer = setTimeout(() => {
        if (mounted.current) {
          setIsRouting(true);
        }
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [isMapExpanded]);
  
  // Типы транспорта
  const transportModes = {
    DRIVING: 'car',
    WALKING: 'walk',
    BICYCLING: 'bicycle',
    TRANSIT: 'public_transport'
  };

  // Преобразование типа вкладки в режим API
  const getTransportTypeFromMode = (mode) => {
    return transportModes[mode] || 'car';
  };

  // Функция для проверки возможности нового запроса
  const canMakeNewRequest = () => {
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTimeRef.current;
    return timeSinceLastRequest > 1000; // Минимальный интервал между запросами - 1 секунда
  };

  // Функция для безопасного запроса маршрута с задержкой
  const safeRequestRoute = (callback) => {
    if (requestTimeoutRef.current) {
      clearTimeout(requestTimeoutRef.current);
    }

    requestTimeoutRef.current = setTimeout(() => {
      if (canMakeNewRequest() && mounted.current) {
        lastRequestTimeRef.current = Date.now();
        callback();
      } else {
        console.log('RouteDirections: слишком частые запросы, пропускаем');
      }
    }, 1000);
  };

  // Начало построения маршрута
  const handleStartRouting = (reverse = false) => {
    if (!selectedLocation || !location) return;
    
    // Устанавливаем направление маршрута
    setIsReverseRoute(reverse);
    
    // Сначала только разворачиваем карту
    setIsMapExpanded(true);
  };

  // Отмена построения маршрута
  const handleCancelRouting = () => {
    // Сначала сворачиваем карту
    setIsMapExpanded(false);
    
    // Сбрасываем все остальные состояния
    setIsRouting(false);
    setRouteDetails(null);
    routesRequestedRef.current = false;
    
    // Сбрасываем флаги отображения маршрутов
    routeDisplayedRef.current = {
      DRIVING: false,
      WALKING: false, 
      BICYCLING: false,
      TRANSIT: false
    };
    
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

  // Обработчик готовности маршрута
  const handleRouteReady = (routeData) => {
    // Проверяем валидность маршрута и смонтированность компонента
    if (!routeData || !mounted.current) return;
    
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
    
    // Подстраиваем карту под маршрут только если это первое получение маршрута этого типа
    if (mapRef?.current && routeData.coordinates && routeData.coordinates.length > 0 && !routeDisplayedRef.current[routeMode]) {
      console.log(`Подстраиваем карту под маршрут: ${routeData.coordinates.length} точек`);
      const padding = { top: 100, right: 50, bottom: 250, left: 50 };
      mapRef.current.fitToCoordinates(routeData.coordinates, {
        edgePadding: padding, 
        animated: true 
      });
      
      // Отмечаем, что маршрут данного типа уже был отображен
      routeDisplayedRef.current[routeMode] = true;
    }
    
    // Запрашиваем другие типы маршрутов только один раз и только если они еще не загружены
    if (!routesRequestedRef.current) {
      // Отмечаем, что запрос остальных маршрутов уже сделан
      routesRequestedRef.current = true;
      
      // Запускаем запрос остальных типов маршрутов с небольшой задержкой,
      // чтобы дать завершиться текущим операциям
      setTimeout(requestAllRouteTypes, 500);
    }
  };

  // Функция для запроса всех типов маршрутов
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
    if (!origin || !destination || !origin.latitude || !destination.latitude) {
      console.log(`Невозможно запросить маршрут типа ${type}: отсутствуют координаты`);
      setRoutesLoading(prev => ({ ...prev, [type]: false }));
      return;
    }

    safeRequestRoute(() => {
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
          if (result && result.error) {
            console.log(`Ошибка API при запросе маршрута типа ${type}: ${result.errorMessage || result.error}`);
            
            // Если это ошибка доступа к API, блокируем запросы
            if (result.error === "API_KEY_MISSING" || result.error === "API_ACCESS_DENIED") {
              window.mapEaseApiBlocked = true;
              
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
            } else {
              // Для других типов ошибок просто логируем и продолжаем
              console.log(`Не удалось получить маршрут типа ${type}: ${result.errorMessage}`);
            }
            
            // Сбрасываем индикатор загрузки
            setRoutesLoading(prev => ({ ...prev, [type]: false }));
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
              if (mapRef?.current && result.coordinates.length > 1) {
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
    });
  };

  // Обработчик изменения типа маршрута
  const handleRouteTypeChange = (mode) => {
    try {
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
      
      // Проверяем наличие данных маршрута для этого типа
      const routeExists = allRoutes[mode] && 
                         !allRoutes[mode].error && 
                         allRoutes[mode].coordinates && 
                         Array.isArray(allRoutes[mode].coordinates) && 
                         allRoutes[mode].coordinates.length > 0;
      
      // Если для этого типа уже есть данные маршрута, просто показываем их
      if (routeExists) {
        console.log(`Используем существующий маршрут типа ${mode}`);
        
        try {
          // Обновляем детали маршрута с проверкой на null/undefined
          setRouteDetails({
            distance: allRoutes[mode].distance || 0,
            duration: allRoutes[mode].duration || 0,
            isApproximate: allRoutes[mode].isApproximate || false
          });
          
          // Сбрасываем индикатор загрузки
          setRoutesLoading(prev => ({ ...prev, [mode]: false }));
          
          // Подстраиваем карту под маршрут только если это первое отображение данного типа маршрута
          if (mapRef?.current && allRoutes[mode].coordinates.length > 0 && !routeDisplayedRef.current[mode]) {
            try {
              const padding = { top: 100, right: 50, bottom: 250, left: 50 };
              mapRef.current.fitToCoordinates(allRoutes[mode].coordinates, { 
                edgePadding: padding, 
                animated: true 
              });
              
              // Отмечаем, что маршрут данного типа уже был отображен
              routeDisplayedRef.current[mode] = true;
            } catch (mapFitError) {
              console.error(`Ошибка при подстройке карты под маршрут типа ${mode}:`, mapFitError);
              // Продолжаем выполнение даже при ошибке подстройки карты
            }
          }
          
          return;
        } catch (routeDetailsError) {
          console.error(`Ошибка при обновлении деталей маршрута типа ${mode}:`, routeDetailsError);
          // Продолжаем выполнение и запрашиваем маршрут заново
        }
      } else if (allRoutes[mode] && allRoutes[mode].error) {
        // Если для этого типа уже есть ошибка, показываем ее
        console.log(`Невозможно показать маршрут типа ${mode}: ${allRoutes[mode].errorMessage || allRoutes[mode].error}`);
        
        // Сбрасываем индикатор загрузки
        setRoutesLoading(prev => ({ ...prev, [mode]: false }));
        
        // Запрашиваем маршрут заново
        requestRouteForType(mode);
        return;
      }
      
      // Устанавливаем флаг загрузки для этого типа
      setRoutesLoading(prev => ({ ...prev, [mode]: true }));
      
      // Проверяем наличие координат
      if (!location || !location.coords || !selectedLocation) {
        console.error(`Отсутствуют необходимые координаты для построения маршрута типа ${mode}`);
        setRoutesLoading(prev => ({ ...prev, [mode]: false }));
        return;
      }
      
      // Запрашиваем маршрут
      const origin = isReverseRoute ? selectedLocation : {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
      
      const destination = isReverseRoute ? {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      } : selectedLocation;
      
      // Проверяем валидность координат
      if (!origin.latitude || !origin.longitude || !destination.latitude || !destination.longitude) {
        console.error(`Невалидные координаты для маршрута типа ${mode}`);
        setRoutesLoading(prev => ({ ...prev, [mode]: false }));
        return;
      }
      
      // Используем общую функцию для запроса маршрута
      requestRouteForType(mode, origin, destination);
    } catch (error) {
      console.error(`Критическая ошибка при переключении на тип маршрута ${mode}:`, error);
      // Сбрасываем индикатор загрузки в случае ошибки
      setRoutesLoading(prev => ({ ...prev, [mode]: false }));
    }
  };
  
  // Проверка, загружается ли текущий маршрут
  const isCurrentRouteLoading = () => {
    return routesLoading[routeMode] === true;
  };
  
  // Получение данных для маршрута в формате для MapView
  const getRouteDataForMap = () => {
    if (!isRouting || !selectedLocation || !location || isCurrentRouteLoading()) {
      return null;
    }
    
    return {
      origin: isReverseRoute ? selectedLocation : {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      },
      destination: isReverseRoute ? {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      } : selectedLocation,
      mode: routeMode,
    };
  };
  
  // Получение данных для начальной и конечной точек маршрута
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
      originInfo: isReverseRoute ? selectedPlaceInfo : { name: "Моё местоположение" },
      destinationInfo: isReverseRoute ? { name: "Моё местоположение" } : selectedPlaceInfo,
    };
  };

  // Очистка при размонтировании
  useEffect(() => {
    return () => {
      if (requestTimeoutRef.current) {
        clearTimeout(requestTimeoutRef.current);
      }
      mounted.current = false;
    };
  }, []);

  return {
    // Состояния
    isRouting,
    isReverseRoute,
    routeMode,
    routeDetails,
    allRoutes,
    routesLoading,
    isMapExpanded,
    
    // Сеттеры
    setIsReverseRoute,
    
    // Методы для работы с маршрутами
    handleStartRouting,
    handleCancelRouting,
    handleRouteReady,
    handleRouteTypeChange,
    isCurrentRouteLoading,
    getTransportTypeFromMode,
    
    // Вспомогательные методы для UI
    getRouteDataForMap,
    getRouteEndpoints
  };
};

export default useRouting; 