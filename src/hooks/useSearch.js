import { useState, useRef } from 'react';
import { Alert, Keyboard } from 'react-native';
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
        
        // Сортируем результаты поиска
        const sortedResults = sortSearchResults(results, userCoords);
        
        // Устанавливаем результаты (они уже отсортированы по расстоянию в API)
        setSearchResults(sortedResults);
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
    
    // Закрываем клавиатуру немедленно
    Keyboard.dismiss();
    
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
      
      // Очищаем все старые метки перед добавлением новой
      if (mapRef?.current?.clearMarkers) {
        console.log('🗑 Очистка старых меток перед добавлением новой');
        mapRef.current.clearMarkers();
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
    
    // Закрываем клавиатуру немедленно
    Keyboard.dismiss();
    
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
      
      // Очищаем все старые метки перед добавлением новой
      if (mapRef?.current?.clearMarkers) {
        console.log('🗑 Очистка старых меток при тапе по карте');
        mapRef.current.clearMarkers();
      }
      
      // Устанавливаем выбранную локацию
      setSelectedLocation(newLocation);
      
      // Сбрасываем результаты поиска
      setSearchResults([]);
      
      // Если есть функция отмены маршрута, вызываем её
      if (onRouteCancel) {
        onRouteCancel();
      }
      
      // Перемещаем карту к выбранной точке с большим приближением
      mapRef?.current?.animateToRegion({
        latitude: newLocation.latitude,
        longitude: newLocation.longitude,
        latitudeDelta: 0.001, // Уменьшаем значение для большего приближения
        longitudeDelta: 0.001
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

  // Функция для сортировки результатов поиска
  const sortSearchResults = (results, userCoords) => {
    if (!results || !results.length) return [];
    
    // Копируем массив, чтобы не изменять исходный
    const resultsCopy = [...results];
    
    // Если есть местоположение пользователя, сортируем по расстоянию
    if (userCoords) {
      // Добавляем расстояние и флаг локальности для каждого результата
      resultsCopy.forEach(result => {
        // Рассчитываем расстояние
        const distance = calculateDistance(
          userCoords.latitude, 
          userCoords.longitude,
          result.latitude,
          result.longitude
        );
        
        result.distance = distance;
        // Флаг локальности (в радиусе 50 км)
        result.isLocal = distance <= 50;
      });
      
      // Сортируем: сначала локальные, затем по расстоянию
      resultsCopy.sort((a, b) => {
        // Локальные результаты первыми
        if (a.isLocal && !b.isLocal) return -1;
        if (!a.isLocal && b.isLocal) return 1;
        
        // Затем по расстоянию
        return a.distance - b.distance;
      });
    }
    
    return resultsCopy;
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