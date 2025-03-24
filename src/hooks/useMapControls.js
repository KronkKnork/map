import { useState } from 'react';
import { Alert } from 'react-native';

/**
 * Хук для управления контролями карты (тип карты, слои и т.д.)
 * @return {Object} Объект с методами и состоянием для контролей карты
 */
export const useMapControls = () => {
  // Состояние для типа карты и слоев
  const [currentMapType, setCurrentMapType] = useState('standard');
  const [showLayersMenu, setShowLayersMenu] = useState(false);
  
  // Функция для смены типа карты
  const handleMapTypeChange = (type) => {
    setCurrentMapType(type);
    setShowLayersMenu(false);
  };
  
  // Функция для переключения меню слоев
  const toggleLayersMenu = () => {
    setShowLayersMenu(!showLayersMenu);
  };
  
  // Обработчик голосового поиска
  const handleVoiceSearch = () => {
    Alert.alert(
      "Голосовой поиск",
      "Функция голосового поиска будет доступна в следующей версии приложения"
    );
  };

  return {
    // Состояния
    currentMapType,
    showLayersMenu,
    
    // Методы
    handleMapTypeChange,
    toggleLayersMenu,
    handleVoiceSearch
  };
};

export default useMapControls; 