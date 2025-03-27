// Вспомогательные функции для API сервисов

/**
 * Функция расчета расстояния по формуле Гаверсинуса
 * @param {Number} lat1 - Широта первой точки
 * @param {Number} lon1 - Долгота первой точки
 * @param {Number} lat2 - Широта второй точки
 * @param {Number} lon2 - Долгота второй точки
 * @returns {Number} - Расстояние в километрах
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
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

/**
 * Перевод градусов в радианы
 * @param {Number} deg - Угол в градусах
 * @returns {Number} - Угол в радианах
 */
export const deg2rad = (deg) => {
  return deg * (Math.PI / 180);
};

/**
 * Определение типа объекта по категории
 * @param {String} category - Категория объекта
 * @returns {String} - Тип объекта (адрес, бизнес или место)
 */
export const getTypeFromCategory = (category) => {
  if (!category) return 'place';
  
  switch (category.toLowerCase()) {
    case 'highway':
    case 'building':
    case 'place':
    case 'railway':
    case 'aeroway':
    case 'natural':
      return 'address';
    case 'amenity':
    case 'shop':
    case 'leisure':
    case 'tourism':
      return 'business';
    default:
      return 'place';
  }
};
