/**
 * Конфигурационный файл для MapEase
 */

/**
 * Проверяет, нужно ли использовать OpenStreetMap вместо Google Maps
 * @returns {boolean} true если нужно использовать OSM
 */
export const isOSMMapEnabled = () => {
  // Всегда используем OSM в новой версии приложения
  return true;
};

/**
 * Другие глобальные настройки можно добавлять здесь
 */
export const config = {
  // API Key для OpenRouteService (для маршрутизации)
  openRouteServiceApiKey: '5b3ce3597851110001cf6248a56c6e247fb44a0ca3fa25a54e3ada1a',
  
  // Тайлы по умолчанию
  defaultTileUrl: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  
  // Запасной источник тайлов
  fallbackTileUrl: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
  
  // Максимальный зум
  maxZoom: 19,
  
  // Центр карты по умолчанию
  defaultCenter: {
    latitude: 55.751244,
    longitude: 37.618423,
    latitudeDelta: 0.5,
    longitudeDelta: 0.5
  }
};
