/**
 * Утилиты для работы с картами
 */

// Глобальный флаг, указывающий, используется ли OSM вместо Google Maps
let useOSMMap = true;

/**
 * Проверка, включена ли карта OpenStreetMap (Leaflet)
 * @return {boolean} true, если используется OpenStreetMap
 */
export const isOSMMapEnabled = () => {
  return useOSMMap;
};

/**
 * Установка типа используемой карты
 * @param {boolean} value - true для OSM, false для Google Maps
 */
export const setOSMMapEnabled = (value) => {
  useOSMMap = !!value;
};
