/**
 * Утилиты для работы с кастомными маркерами и маршрутами в Leaflet
 */

import { originMarkerSVG, destinationMarkerSVG, getRouteColor, getRouteDashArray, getRouteWeight, alternativeRouteStyle } from './MapMarkers';
import { Platform } from 'react-native';

/**
 * Отправляет точки маршрута в WebView с кастомными маркерами
 * 
 * @param {object} webViewRef - Ссылка на WebView компонент
 * @param {Array} points - Массив точек маршрута с координатами lat/lng или latitude/longitude
 * @param {string} transportType - Тип транспорта (WALKING, BICYCLING, DRIVING)
 * @param {boolean} isAlternative - Является ли маршрут альтернативным
 */
export function sendCustomRouteToMap(webViewRef, points, transportType = 'DRIVING', isAlternative = false) {
  if (!webViewRef?.current || !points || !points.length) {
    console.error('Невозможно отправить точки маршрута в карту: недопустимые параметры');
    return false;
  }
  
  console.log(`Отправка ${points.length} точек ${isAlternative ? 'альтернативного ' : ''}маршрута на карту (тип: ${transportType})`);
  
  try {
    // Приводим transportType к верхнему регистру для совместимости
    transportType = transportType?.toUpperCase() || 'DRIVING';
    
    // Получаем стили маршрута в зависимости от типа транспорта
    let color = getRouteColor(transportType);
    const dashArray = getRouteDashArray(transportType);
    let weight = getRouteWeight(transportType);
    let opacity = 0.8;
    
    // Если это альтернативный маршрут, применяем соответствующие стили
    if (isAlternative) {
      color = alternativeRouteStyle.color;
      weight = alternativeRouteStyle.weight;
      opacity = alternativeRouteStyle.opacity;
    }
    
    // Преобразуем точки в строку JavaScript-массива
    const pointsJS = points.map(point => {
      if (point.lat !== undefined && point.lng !== undefined) {
        return `[${point.lat}, ${point.lng}]`;
      } else if (point.latitude !== undefined && point.longitude !== undefined) {
        return `[${point.latitude}, ${point.longitude}]`;
      } else if (Array.isArray(point) && point.length >= 2) {
        return `[${point[0]}, ${point[1]}]`;
      }
      return null;
    }).filter(p => p !== null).join(',');
    
    // Создаем скрипт с кастомными маркерами и стилями маршрута
    const script = `
      (function() {
        try {
          const isAlternative = ${isAlternative}; // Явно передаем переменную в JavaScript
          console.log('[Карта] Принято ${points.length} точек маршрута типа ${transportType}, альтернативный: ' + isAlternative);
          
          // Если это не альтернативный маршрут, очищаем все предыдущие маршруты
          if (!isAlternative) {
            // Очищаем все ранее добавленные маршруты
            if (window.routeControl) {
              map.removeLayer(window.routeControl);
              window.routeControl = null;
            }
            
            // Очищаем все альтернативные маршруты
            if (window.alternativeRoutes && window.alternativeRoutes.length) {
              window.alternativeRoutes.forEach(function(route) {
                if (route) map.removeLayer(route);
              });
              window.alternativeRoutes = [];
            } else {
              window.alternativeRoutes = [];
            }
            
            // Очищаем маркеры кроме маркера пользователя
            if (window.markers && window.markers.length) {
              window.markers.forEach(function(marker) {
                if (marker) map.removeLayer(marker);
              });
              window.markers = [];
            } else {
              window.markers = [];
            }
          }
          
          // Создаем массив точек Leaflet
          const routePoints = [${pointsJS}].map(point => L.latLng(point[0], point[1]));
          
          // Проверка на достаточное количество точек
          if (routePoints.length < 2) {
            console.error('[Карта] Недостаточно валидных точек для маршрута');
            return;
          }
          
          // Создаем кастомные SVG иконки для маркеров
          // Иконка для начала маршрута (синий круг)
          const originIcon = L.divIcon({
            html: '${originMarkerSVG}',
            className: 'start-marker-icon',
            iconSize: [40, 40],
            iconAnchor: [20, 20]
          });
          
          // Иконка для конца маршрута (синий указатель)
          const destinationIcon = L.divIcon({
            html: '${destinationMarkerSVG}',
            className: 'end-marker-icon',
            iconSize: [60, 60],
            iconAnchor: [30, 58]
          });
          
          // Добавляем маркеры начала и конца с кастомными иконками
          const startMarker = L.marker(routePoints[0], {icon: originIcon}).addTo(map);
          startMarker.bindPopup('Начало маршрута');
          
          const endMarker = L.marker(routePoints[routePoints.length - 1], {icon: destinationIcon}).addTo(map);
          endMarker.bindPopup('Конец маршрута');
          
          window.markers.push(startMarker, endMarker);
          
          // Создаем линию маршрута с кастомным стилем
          const polylineOptions = {
            color: '${color}',
            weight: ${weight},
            opacity: ${opacity},
            lineJoin: 'round'
          };
          
          ${dashArray ? `polylineOptions.dashArray = '${dashArray}';` : ''}
          
          // Создаем полилинию маршрута и добавляем на карту
          if (isAlternative) {
            // Инициализируем массив альтернативных маршрутов, если его еще нет
            if (!window.alternativeRoutes) {
              window.alternativeRoutes = [];
            }
            
            // Создаем альтернативный маршрут
            const altRoute = L.polyline(routePoints, polylineOptions).addTo(map);
            
            // Сохраняем в массив
            window.alternativeRoutes.push(altRoute);
            
            // Добавляем идентификатор для событий
            altRoute.routeId = window.alternativeRoutes.length;

            // Добавляем обработчик клика на альтернативный маршрут
            altRoute.on('click', function() {
              // Отправляем сообщение в React Native
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'alternativeRouteSelected',
                routeId: this.routeId,
                transportType: '${transportType}'
              }));
              
              console.log('[Карта] Выбран альтернативный маршрут:', this.routeId);
            });
            
            // Изменяем курсор при наведении на альтернативный маршрут
            altRoute.on('mouseover', function() {
              this.setStyle({ opacity: 0.8 }); // Увеличиваем прозрачность при наведении
              document.body.style.cursor = 'pointer';
            });
            
            altRoute.on('mouseout', function() {
              this.setStyle({ opacity: ${opacity} }); // Возвращаем прозрачность к исходной
              document.body.style.cursor = '';
            });
          } else {
            // Для основного маршрута оставляем как было
            window.routeControl = L.polyline(routePoints, polylineOptions).addTo(map);
          }
          
          // Создаем белую обводку для маршрута (под основным маршрутом)
          const outlineOptions = {
            color: '#FFFFFF',
            weight: ${weight + 4},
            opacity: ${isAlternative ? 0.3 : 0.6}, // Для альтернативных маршрутов обводка более прозрачная
            lineJoin: 'round'
          };
          
          ${dashArray ? `outlineOptions.dashArray = '${dashArray}';` : ''}
          
          // Добавляем обводку под основным маршрутом
          const outlineRoute = L.polyline(routePoints, outlineOptions).addTo(map);
          outlineRoute.bringToBack();
          
          // Сохраняем ссылку на обводку для последующего удаления
          if (!window.routeOutlines) {
            window.routeOutlines = [];
          }
          window.routeOutlines.push(outlineRoute);
          
          // Подгоняем масштаб карты для отображения всего маршрута
          map.fitBounds(L.latLngBounds(routePoints), { padding: [50, 50] });
          
          // Если это альтернативный маршрут, добавляем обработчик клика для активации
          if (isAlternative && window.routeControl) {
            // Сохраняем идентификатор альтернативного маршрута
            window.routeControl.routeId = 'alt-' + Math.floor(Math.random() * 10000);
            
            // Добавляем обработчик клика
            window.routeControl.on('click', function() {
              // Отправляем сообщение о выборе альтернативного маршрута
              if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'alternativeRouteSelected',
                  data: {
                    routeId: window.routeControl.routeId,
                    transportType: '${transportType}'
                  }
                }));
              }
              
              console.log('[Карта] Выбран альтернативный маршрут:', window.routeControl.routeId);
            });
          }
          
          console.log('[Карта] ${isAlternative ? 'Альтернативный ' : ''}Маршрут успешно отрисован');
          return true;
        } catch (error) {
          console.error('[Карта] Ошибка при отрисовке маршрута:', error);
          return false;
        }
      })();
    `;
    
    console.log('Инъекция скрипта отрисовки маршрута с кастомными маркерами');
    webViewRef.current.injectJavaScript(script);
    return true;
  } catch (error) {
    console.error('Ошибка при отправке точек маршрута на карту:', error);
    return false;
  }
}

/**
 * Отправляет несколько альтернативных маршрутов на карту
 * 
 * @param {object} webViewRef - Ссылка на WebView компонент
 * @param {Array<Array>} routesData - Массив маршрутов, где первый - основной, остальные - альтернативные
 * @param {string} transportType - Тип транспорта (WALKING, BICYCLING, DRIVING)
 * @returns {boolean} - Успешно ли отправлены маршруты
 */
export function sendMultipleRoutesToMap(webViewRef, routesData, transportType = 'DRIVING') {
  if (!webViewRef?.current || !routesData || !routesData.length) {
    console.error('Невозможно отправить альтернативные маршруты на карту: недопустимые параметры');
    return false;
  }
  
  console.log(`Отправка ${routesData.length} маршрутов на карту (тип: ${transportType})`);
  
  try {
    // Сначала удаляем все предыдущие маршруты через отдельный скрипт
    const clearScript = `
      (function() {
        try {
          console.log('[Карта] Очистка всех маршрутов перед отображением новых');
          
          // Очищаем все ранее добавленные маршруты
          if (window.routeControl) {
            map.removeLayer(window.routeControl);
            window.routeControl = null;
          }
          
          // Очищаем все альтернативные маршруты
          if (window.alternativeRoutes && window.alternativeRoutes.length) {
            window.alternativeRoutes.forEach(function(route) {
              if (route) map.removeLayer(route);
            });
            window.alternativeRoutes = [];
          } else {
            window.alternativeRoutes = [];
          }
          
          // Очищаем обводки маршрутов
          if (window.routeOutlines && window.routeOutlines.length) {
            window.routeOutlines.forEach(function(outline) {
              if (outline) map.removeLayer(outline);
            });
            window.routeOutlines = [];
          } else {
            window.routeOutlines = [];
          }

          // Очищаем маркеры кроме маркера пользователя
          if (window.markers && window.markers.length) {
            window.markers.forEach(function(marker) {
              if (marker) map.removeLayer(marker);
            });
            window.markers = [];
          } else {
            window.markers = [];
          }
          
          return true;
        } catch (error) {
          console.error('[Карта] Ошибка при очистке маршрутов:', error);
          return false;
        }
      })();
    `;
    
    // Инициализируем карту с чистого листа
    webViewRef.current.injectJavaScript(clearScript);
    
    // Небольшая задержка перед отправкой маршрутов
    setTimeout(() => {
      if (routesData[0] && routesData[0].length > 1) {
        // Сначала отправляем альтернативные маршруты, чтобы они были ниже основного
        for (let i = 1; i < routesData.length; i++) {
          if (routesData[i] && routesData[i].length > 1) {
            sendCustomRouteToMap(webViewRef, routesData[i], transportType, true);
          }
        }
        
        // Небольшая задержка перед отправкой основного маршрута
        setTimeout(() => {
          // Отправляем основной маршрут последним, чтобы он был поверх всех
          sendCustomRouteToMap(webViewRef, routesData[0], transportType, false);
        }, 300);
      }
    }, 200);
    
    return true;
  } catch (error) {
    console.error('Ошибка при отправке альтернативных маршрутов на карту:', error);
    return false;
  }
}
