import { useState, useRef } from 'react';
import { Alert } from 'react-native';
import { searchPlaces, reverseGeocode } from '../services/api';

/**
 * Хук для управления поиском мест и их выбором
 * @param {Object} dependencies - Зависимости хука
 * @param {Object} dependencies.location - Текущее местоположение пользователя
 * @param {Function} dependencies.calculateDistance - Функция для расчета расстояния
 * @return {Object} Объект с методами и состоянием поиска
 */
export const useSearch = ({ location, calculateDistance }) => {
  // Состояния для поиска
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  
  // Состояние для выбранной локации
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [selectedPlaceInfo, setSelectedPlaceInfo] = useState(null);
  
  // Ссылки
  const searchTimerRef = useRef(null);
  
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
  const handleSelectSearchResult = (result, mapRef, onRouteCancel) => {
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
      
      // Сбрасываем поле поиска и результаты
      setSearchText('');
      setSearchResults([]);
      setIsSearchFocused(false);
      
      // Сброс маршрута если он был активен
      if (onRouteCancel) {
        onRouteCancel();
      }
      
      // Создаем информацию о выбранном месте
      const placeInfo = {
        name: result.name || 'Выбранное место',
        address: result.address || `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
        distance: result.distance
      };
      
      // Устанавливаем выбранное место и информацию о нем
      setSelectedLocation(coordinate);
      setSelectedPlaceInfo(placeInfo);
      
      // Определяем новый регион
      const newRegion = {
        latitude: lat,
        longitude: lng,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01
      };
      
      // Анимируем карту к выбранной точке с небольшой задержкой
      setTimeout(() => {
        if (mapRef?.current) {
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
  
  // Обработчик нажатия на карту
  const handleMapPress = async (event, isRouting, mapRef, onRouteCancel) => {
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
      
      // Сбрасываем результаты поиска
      setSearchResults([]);
      
      // Если есть функция отмены маршрута, вызываем её
      if (onRouteCancel) {
        onRouteCancel();
      }
      
      // Перемещаем карту к выбранной точке
      mapRef?.current?.animateToRegion({
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
  };

  // Очистка при размонтировании компонента
  const cleanupSearch = () => {
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }
  };

  return {
    // Состояния
    searchText,
    searchResults,
    isSearchFocused,
    isSearchLoading,
    selectedLocation,
    selectedPlaceInfo,
    
    // Сеттеры
    setSearchText,
    setIsSearchFocused,
    setSelectedLocation,
    setSelectedPlaceInfo,
    
    // Методы
    handleSearchTextChange,
    handleSearch,
    handleSelectSearchResult,
    handleMapPress,
    cleanupSearch
  };
};

export default useSearch; 