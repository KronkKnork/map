/**
 * Простейшая функция для рисования маршрута прямо на карте через WebView
 */

export function drawRouteOnMap(webViewRef, coordinates, type = 'DRIVING') {
  if (!webViewRef?.current || !coordinates || coordinates.length < 2) {
    console.error('[DirectRouting] Невозможно отрисовать маршрут, нет WebView или координат');
    return false;
  }

  console.log(`[DirectRouting] Отрисовка маршрута с ${coordinates.length} точками, тип: ${type}`);
  console.log(`[DirectRouting] Первая точка: ${JSON.stringify(coordinates[0])}`);
  
  // Определяем цвет маршрута по типу
  let color = '#4285F4';
  let dashArray = null;
  
  switch (type) {
    case 'WALKING':
      color = '#43A047';
      dashArray = '5, 10';
      break;
    case 'BICYCLING':
      color = '#FB8C00';
      dashArray = '10, 5';
      break;
    case 'TRANSIT':
      color = '#757575';
      dashArray = '15, 10, 5, 10';
      break;
  }

  // Создаем прямое представление маршрута для JavaScript
  const routePoints = coordinates.map(point => {
    if (!point) return null;
    return {
      lat: point.latitude || point.lat || 0,
      lng: point.longitude || point.lng || 0
    };
  }).filter(point => point !== null);

  if (routePoints.length < 2) {
    console.error('[DirectRouting] Недостаточно точек после фильтрации');
    return false;
  }
  
  console.log(`[DirectRouting] Подготовлено ${routePoints.length} точек для JavaScript`);
  
  // Создаем упрощенный JavaScript код для WebView
  const js = `
  (function() {
    try {
      console.log('[Leaflet] Начинаем рисовать маршрут...');

      // Удаляем старый маршрут если есть
      if (window.currentRoute) {
        map.removeLayer(window.currentRoute);
      }

      // Создаем точки маршрута
      var points = ${JSON.stringify(routePoints)};
      console.log('[Leaflet] Точки маршрута:', points.length);

      // Создаем стиль маршрута
      var routeStyle = {
        color: '${color}',
        weight: 5,
        opacity: 0.7
      };

      ${dashArray ? `routeStyle.dashArray = '${dashArray}';` : ''}

      // Создаем линию маршрута
      window.currentRoute = L.polyline(points, routeStyle).addTo(map);

      // Подгоняем карту под маршрут
      map.fitBounds(window.currentRoute.getBounds(), { padding: [50, 50] });

      console.log('[Leaflet] Маршрут успешно нарисован');

      // Сообщаем React Native об успехе
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'routeDrawn',
          success: true
        }));
      }

      return true;
    } catch (error) {
      console.error('[Leaflet] Ошибка при рисовании маршрута:', error);
      return false;
    }
  })();
  `;
  
  try {
    // Прямая инъекция JavaScript в WebView
    console.log('[DirectRouting] Отправка JavaScript в WebView...');
    webViewRef.current.injectJavaScript(js);
    console.log('[DirectRouting] JavaScript отправлен в WebView');
    return true;
  } catch (error) {
    console.error('[DirectRouting] Ошибка при инъекции JavaScript:', error);
    return false;
  }
}
