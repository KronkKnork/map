/**
 * Функции для отрисовки маршрутов с улучшенными стилями и маркерами
 */

// Маркер начала маршрута (синий круг)
export const originMarkerSVG = `<svg width="24" height="23" viewBox="0 0 24 23" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M21.7449 11.7449C21.7449 17.1269 17.382 21.4898 12 21.4898C6.61804 21.4898 2.2551 17.1269 2.2551 11.7449C2.2551 6.36294 6.61804 2 12 2C17.382 2 21.7449 6.36294 21.7449 11.7449Z" fill="white" stroke="#5853FC" stroke-width="3"/></svg>`;

// Маркер конца маршрута (указатель локации)
export const destinationMarkerSVG = `<svg width="77" height="82" viewBox="0 0 77 82" fill="none" xmlns="http://www.w3.org/2000/svg"><g filter="url(#filter0_d_1067_920)"><path d="M50.3017 33.835L38.5405 59L26.7793 33.835L37.1047 34.9033C38.0264 35.2718 39.0546 35.2718 39.9764 34.9033L50.3017 33.835Z" fill="#5853FC" stroke="white" stroke-width="4.83699" stroke-linecap="round" stroke-linejoin="round"/><path d="M18.5387 34.5401C18.5387 23.4935 27.4937 14.5385 38.5403 14.5385C49.5869 14.5385 58.542 23.4935 58.542 34.5401C58.542 45.5867 49.5869 54.5418 38.5403 54.5418C27.4937 54.5418 18.5387 45.5867 18.5387 34.5401Z" fill="white" stroke="white" stroke-width="3.07718"/><path d="M38.5 53C36.9238 53 35.3475 52.7511 33.9372 52.4193L32.0291 44.5381C33.2735 44.6211 34.5179 44.4552 35.5964 44.2063C37.7534 43.7085 39.5785 42.63 41.3206 41.5516C43.9753 39.9753 46.5471 38.4821 50.5291 38.8969C50.778 38.8969 51.1099 38.8139 51.2758 38.565C51.4417 38.3161 51.5247 38.0673 51.4417 37.7354L48.0404 24.0471C47.9574 23.7152 47.6256 23.3834 47.2937 23.3834C42.7309 22.8857 39.7444 24.6278 37.0067 26.287C34.435 27.7803 32.0291 29.2735 28.213 28.9417L27.8812 27.4484C27.7982 27.1996 27.7152 27.0336 27.4664 26.8677C27.3004 26.7848 27.0516 26.7018 26.8027 26.7848C26.5538 26.8677 26.3879 26.9507 26.222 27.1996C26.0561 27.4484 26.0561 27.6973 26.0561 27.9462L31.9462 51.8386C24.9776 49.1839 20 42.4641 20 34.5C20 24.296 28.296 16 38.5 16C48.704 16 57 24.296 57 34.5C57 44.704 48.704 53 38.5 53Z" fill="#5853FC"/></g><defs><filter id="filter0_d_1067_920" x="0.588385" y="0.691166" width="75.9038" height="81.2418" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/><feOffset dy="4.1029"/><feGaussianBlur stdDeviation="8.20581"/><feComposite in2="hardAlpha" operator="out"/><feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.2 0"/><feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_1067_920"/><feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_1067_920" result="shape"/></filter></defs></svg>`;

// Стили маршрутов для разных типов транспорта
export const routeStyles = {
  // Стиль для машины: градиент от зеленого к красному с белой обводкой
  DRIVING: {
    color: '#3bbc47', // Зеленый по умолчанию
    congestionColors: {
      low: '#3bbc47', // Зеленый для свободной дороги
      medium: '#FFC107', // Желтый для средней загруженности
      high: '#FF5722', // Оранжевый для высокой загруженности
      severe: '#D32F2F' // Красный для пробок
    },
    weight: 6, // Толщина линии
    opacity: 0.8,
    outlineColor: '#FFFFFF', // Белая обводка
    outlineWidth: 2
  },
  
  // Стиль для пешехода: синий с белой обводкой, тоньше и тусклее
  WALKING: {
    color: '#5853FC', // Синий
    weight: 4, // Тоньше линия
    opacity: 0.6, // Более тусклый
    outlineColor: '#FFFFFF', // Белая обводка
    outlineWidth: 1,
    dashArray: '5, 10' // Пунктирная линия
  },
  
  // Стиль для велосипеда: синий с белой обводкой
  BICYCLING: {
    color: '#5853FC', // Синий
    weight: 5, // Средняя толщина
    opacity: 0.8,
    outlineColor: '#FFFFFF', // Белая обводка
    outlineWidth: 1.5,
    dashArray: '1, 5' // Короткий пунктир
  },
  
  // Стиль для общественного транспорта
  TRANSIT: {
    color: '#673AB7', // Фиолетовый
    weight: 5,
    opacity: 0.7,
    outlineColor: '#FFFFFF', // Белая обводка
    outlineWidth: 1
  },
  
  // Стили для альтернативных маршрутов (полупрозрачные версии основных)
  alternative: {
    opacity: 0.4, // Альтернативные маршруты более прозрачные
    weight: 4 // И немного тоньше
  }
};

/**
 * Создает объект Leaflet маркера для начала маршрута (origin)
 * @returns {Object} Объект иконки Leaflet
 */
export const createOriginMarkerIcon = () => {
  return {
    html: originMarkerSVG,
    className: 'start-marker-icon',
    iconSize: [40, 40],  // Размер иконки
    iconAnchor: [20, 20]  // Якорь (центр) иконки
  };
};

/**
 * Создает объект Leaflet маркера для конца маршрута (destination)
 * @returns {Object} Объект иконки Leaflet
 */
export const createDestinationMarkerIcon = () => {
  return {
    html: destinationMarkerSVG,
    className: 'end-marker-icon',
    iconSize: [60, 60],  // Размер иконки
    iconAnchor: [30, 58]  // Якорь (указывает на нижнюю центральную точку)
  };
};

/**
 * Получает стиль маршрута в зависимости от типа транспорта
 * @param {string} travelMode - Тип транспорта (DRIVING, WALKING, BICYCLING, TRANSIT)
 * @param {boolean} isAlternative - Является ли маршрут альтернативным
 * @returns {Object} Объект стиля для маршрута
 */
export const getRouteStyle = (travelMode, isAlternative = false) => {
  // Получаем базовый стиль для типа транспорта
  const baseStyle = routeStyles[travelMode] || routeStyles.DRIVING;
  
  // Если это альтернативный маршрут, применяем модификации
  if (isAlternative) {
    return {
      ...baseStyle,
      opacity: routeStyles.alternative.opacity,
      weight: routeStyles.alternative.weight
    };
  }
  
  return baseStyle;
};

/**
 * Обновляет стиль маршрута на основе данных о пробках (только для DRIVING)
 * @param {Object} routeLayer - Слой маршрута Leaflet
 * @param {Object} trafficInfo - Информация о пробках
 * @param {string} travelMode - Тип транспорта
 */
export const updateRouteStyleBasedOnTraffic = (routeLayer, trafficInfo, travelMode) => {
  // Только для автомобилей меняем цвет в зависимости от пробок
  if (travelMode !== 'DRIVING' || !trafficInfo) {
    return;
  }
  
  const congestionLevel = trafficInfo.congestionLevel || 'low';
  const colors = routeStyles.DRIVING.congestionColors;
  
  // Обновляем цвет маршрута на основе уровня пробок
  routeLayer.setStyle({
    color: colors[congestionLevel] || colors.low
  });
};
