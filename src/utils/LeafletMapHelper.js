/**
 * Утилиты для работы с Leaflet картой
 */
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';


// Кешированное содержимое HTML и JS
let htmlCache = null;

/**
 * Создает HTML для Leaflet-карты с поддержкой маршрутов
 */
export function getLeafletMapHtml() {
  // Загружаем из файла, если возможно
  if (Platform.OS === 'web') {
    try {
      return require('../leaflet/leaflet-map.simple.html');
    } catch (e) {
      console.log('Не удалось загрузить HTML из файла, используем инлайн');
    }
  }
  
  // Используем кеш, если он есть
  if (htmlCache) {
    return htmlCache;
  }
  
  // Рекомендуется включить эти файлы в билд в продакшене
  // Для демонстрации используем инлайн-код
  
  htmlCache = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>MapEase OpenStreetMap</title>
  
  <!-- Блокировка всех элементов управления до загрузки библиотеки -->
  <style>
    /* Скрываем все контролы, даже которые еще не созданы */
    :root .leaflet-control-container,
    :root .leaflet-bar,
    :root .leaflet-control-zoom,
    :root .leaflet-control-zoom-in,
    :root .leaflet-control-zoom-out,
    :root .leaflet-control-layers,
    :root .leaflet-control-attribution,
    :root .leaflet-top,
    :root .leaflet-bottom {
      display: none !important;
      visibility: hidden !important;
      opacity: 0 !important;
      pointer-events: none !important;
      height: 0 !important;
      width: 0 !important;
      overflow: hidden !important;
      position: absolute !important;
      z-index: -9999 !important;
      margin: 0 !important;
      padding: 0 !important;
      transform: scale(0) !important;
      max-height: 0 !important;
      max-width: 0 !important;
      clip: rect(0,0,0,0) !important;
    }
    
    /* Основные стили */
    html, body, #map {
      height: 100%;
      width: 100%;
      margin: 0;
      padding: 0;
    }
    
    /* Критически важные стили для принудительного отображения маркеров */
    .leaflet-marker-pane .leaflet-marker-icon,
    .leaflet-permanent-marker,
    [class*="marker-"],
    .leaflet-marker-icon {
      visibility: visible !important;
      opacity: 1 !important;
      display: block !important;
      pointer-events: auto !important;
      z-index: 9999 !important;
    }
    
    /* Дополнительные стили для уверенности */
    .leaflet-marker-icon img,
    .leaflet-marker-icon svg {
      visibility: visible !important;
      opacity: 1 !important;
      display: block !important;
    }
    
    /* Стили для маршрутов */
    .driving-route {
      stroke: #4285F4;
      stroke-width: 8px;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-opacity: 1;
      stroke-dasharray: 6, 10;
      filter: drop-shadow(0px 0px 2px white);
    }
    
    .bicycle-route {
      stroke: #4285F4;
      stroke-width: 6px;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-opacity: 1;
      filter: drop-shadow(0px 0px 2px white);
    }
    
    .walking-route {
      stroke: #4285F4;
      stroke-width: 4px;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-opacity: 1;
      stroke-dasharray: 6, 10;
      filter: drop-shadow(0px 0px 2px white);
    }
    
    /* Стили для совместимости с routing-machine */
    .leaflet-routing-container {
      max-width: 320px;
      background-color: white;
      padding: 10px;
      box-shadow: 0 1px 5px rgba(0,0,0,0.4);
      border-radius: 5px;
    }
    .error-message {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(255,0,0,0.7);
      color: white;
      padding: 10px;
      border-radius: 5px;
      z-index: 1000;
    }
  </style>
  
  <!-- Загружаем стили Leaflet после наших стилей -->
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet-routing-machine@3.2.12/dist/leaflet-routing-machine.css" />
</head>
<body>
  <div id="map"></div>

  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script src="https://unpkg.com/leaflet-routing-machine@3.2.12/dist/leaflet-routing-machine.js"></script>
  <script>
    // Сразу удаляем элементы управления при загрузке
    (function() {
      // Удаляем с интервалом для надежности
      const removeControls = function() {
        document.querySelectorAll('.leaflet-control-container, .leaflet-bar, .leaflet-control, .leaflet-top, .leaflet-bottom')
          .forEach(el => el && el.parentNode && el.parentNode.removeChild(el));
      };
      
      // Вызываем сразу и с интервалом
      removeControls();
      const interval = setInterval(removeControls, 100);
      setTimeout(() => clearInterval(interval), 1000);
    })();
    
    // u0413u043bu043eu0431u0430u043bu044cu043du044bu0435 u043fu0435u0440u0435u043cu0435u043du043du044bu0435
    var map;
    var userMarker;
    var markers = [];
    var routeControl = null;
    var isMapReady = false;
    
    // Централизованное хранилище маркеров для предотвращения их исчезновения
    const appMarkers = {
      // Маркеры маршрута
      start: null,
      end: null,
      // Маркер пользователя
      user: null,
      // Маркеры поиска
      search: []
    };
    
    // u0418u043du0438u0446u0438u0430u043bu0438u0437u0430u0446u0438u044f u043au0430u0440u0442u044b
    function initMap() {
      try {
        console.log("[u041au0430u0440u0442u0430] u0418u043du0438u0446u0438u0430u043bu0438u0437u0430u0446u0438u044f Leafletu2026");
        
        // Патч для маркеров, чтобы они не исчезали
        if (L && L.Marker) {
          const origMarker = L.Marker;
          L.Marker = function(latlng, options) {
            if (!options) options = {};
            
            // Увеличиваем z-index для всех маркеров
            if (!options.zIndexOffset) options.zIndexOffset = 1000;
            
            // Добавляем классы видимости всем маркерам
            if (!options.className) {
              options.className = 'leaflet-permanent-marker';
            } else {
              options.className += ' leaflet-permanent-marker';
            }
            
            // Гарантируем, что маркеры будут интерактивными
            options.interactive = true;
            
            // Создаем маркер с защитой от исчезновения
            const marker = new origMarker(latlng, options);
            
            // Перехватываем addTo для гарантии отображения
            const originalAddTo = marker.addTo;
            marker.addTo = function(map) {
              const result = originalAddTo.call(this, map);
              // Принудительно устанавливаем стили видимости на DOM-элемент маркера
              setTimeout(() => {
                if (this._icon) {
                  this._icon.style.visibility = 'visible';
                  this._icon.style.opacity = '1';
                  this._icon.style.zIndex = '9999';
                }
              }, 10);
              return result;
            };
            
            return marker;
          };
          
          // Восстанавливаем статический метод
          L.marker = function(latlng, options) {
            return new L.Marker(latlng, options);
          };
        }

        // Создаем карту с настройками для скрытия кнопок
        map = L.map('map', {
          zoomControl: false,          // Отключаем контролы масштабирования
          attributionControl: false,   // Отключаем информацию об авторстве
          preferCanvas: true          // Улучшает производительность с множеством маркеров
        }).setView([55.751244, 37.618423], 10);
        
        // Сохраняем ссылки на слои
        var baseLayers = {};
        var currentLayer = null;
        
        // Добавляем разные слои карт
        // 1. OpenStreetMap (стандартный)
        baseLayers['osm'] = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: ''  // Убираем атрибуцию
        });
        
        // 2. Черно-белая карта
        baseLayers['bw'] = L.tileLayer('https://tiles.wmflabs.org/bw-mapnik/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '',
        });
        
        // 3. Топографическая карта
        baseLayers['topo'] = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
          maxZoom: 17,
          attribution: ''
        });
        
        // 4. Спутниковые снимки
        baseLayers['satellite'] = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
          maxZoom: 19,
          attribution: ''
        });
        
        // По умолчанию используем OpenStreetMap
        currentLayer = baseLayers['osm'];
        currentLayer.addTo(map);
        
        // Блокируем заново создание контролов
        map.addControl = function() { return map; };
        
        // Еще раз удаляем все контролы
        setTimeout(function() {
          const controls = document.querySelectorAll('.leaflet-control-container, .leaflet-control-zoom, .leaflet-bar, .leaflet-control');
          controls.forEach(function(control) {
            if (control && control.parentNode) {
              control.parentNode.removeChild(control);
            }
          });
        }, 100);
        
        // u0421u043eu043eu0431u0449u0430u0435u043c React Native, u0447u0442u043e u043au0430u0440u0442u0430 u0433u043eu0442u043eu0432u0430
        setTimeout(function() {
          isMapReady = true;
          sendMessageToReactNative({
            type: 'mapReady',
            center: {
              lat: map.getCenter().lat,
              lng: map.getCenter().lng
            },
            zoom: map.getZoom()
          });
        }, 500);
        
        // u041eu0431u0440u0430u0431u043eu0442u0447u0438u043a u043au043bu0438u043au0430 u043fu043e u043au0430u0440u0442u0435
        map.on('click', function(e) {
          sendMessageToReactNative({
            type: 'mapClick',
            latlng: {
              lat: e.latlng.lat,
              lng: e.latlng.lng
            }
          });
        });
        
        // u041eu0440u0430u0431u043eu0442u0447u0438u043a u043fu0435u0440u0435u043cu0435u0449u0435u043du0438u044f u043au0430u0440u0442u044b
        map.on('moveend', function() {
          (function() {
            try {
              var center = map.getCenter();
              var zoom = map.getZoom();
              
              var cleanMessage = {
                type: 'mapMoved',
                center: {
                  lat: center.lat,
                  lng: center.lng
                },
                zoom: zoom
              };
              
              window.ReactNativeWebView.postMessage(JSON.stringify(cleanMessage));
            } catch(err) {
              console.error('Ошибка при отправке сообщения о перемещении:', err);
            }
          })();
        });

        console.log("[u041au0430u0440u0442u0430] Leaflet u0438u043du0438u0446u0438u0430u043lu0438u0437u0438u0440u043eu0430u043du0430");
      } catch (error) {
        console.error("[u041au0430u0440u0442u0430] u041eu0448u0438u0431u043au0430 u0438u043du0438u0446u0438u0430u043lu0438u0437u0430u0446u0438u0438 Leaflet:", error);
        showError('u041eu0448u0438u0431u043au0430 u0438u043du0438u0446u0438u0430u043lu0438u0437u0430u0446u0438u0438 u043au0430u0440u0442u044b: ' + error.message);
        showError('u041eu0448u0438u0431u043au0430 u0438u043du0438u0446u0438u0430u043bu0438u0437u0430u0446u0438u0438 u043au0430u0440u0442u044b: ' + error.message);
      }
    }

    // u041eu0442u043fu0440u0430u0432u043au0430 u0441u043eu043eu0431u0449u0435u043du0438u0439 u0432 React Native
    function sendMessageToReactNative(data) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify(data));
      }
    }
    
    // u041fu043eu043au0430u0437u0430u0442u044c u0441u043eu043eu0431u0449u0435u043du0438u0435 u043eu0431 u043eu0448u0438u0431u043au0435
    function showError(message) {
      var errorDiv = document.createElement('div');
      errorDiv.className = 'error-message';
      errorDiv.innerHTML = message;
      document.body.appendChild(errorDiv);
      
      sendMessageToReactNative({
        type: 'error',
        message: message
      });
    }
    
    // API u0434u043bu044f u0432u0437u0430u0438u043cu043eu0434u0435u0439u0441u0442u0432u0438u044f u0441 u043au0430u0440u0442u043eu0439
    window.mapAPI = {
      // u0426u0435u043du0442u0440u0438u0440u043eu0432u0430u043du0438u0435 u043au0430u0440u0442u044b
      centerMap: function(lat, lng, zoom) {
        if (!map) return false;
        console.log("[u041au0430u0440u0442u0430] u0426u0435u043du0442u0440u0438u0440u043eu0432u0430u043du0438u0435 u043au0430u0440u0442u044b u043du0430", lat, lng, "zoom:", zoom);
        map.setView([lat, lng], zoom || map.getZoom());
        
        // Удаляем все элементы управления после изменения центра карты
        setTimeout(function() {
          document.querySelectorAll('.leaflet-control-container, .leaflet-control-zoom, .leaflet-bar, .leaflet-control')
            .forEach(function(control) {
              if (control && control.parentNode) {
                control.parentNode.removeChild(control);
              }
            });
        }, 50);
        
        return true;
      },
      
      // u0414u043eu0431u0430u0432u043bu0435u043du0438u0435 u043cu0430u0440u043au0435u0440u0430 с защитой от исчезновения
      addMarker: function(lat, lng, title) {
        if (!map) return -1;
        console.log("[u041au0430u0440u0442u0430] u0414u043eu0431u0430u0432u043bu0435u043du0438u0435 u043cu0430u0440u043au0435u0440u0430", lat, lng, title);
        
        // ВАЖНО: Если есть активный маршрут, не добавляем синие маркеры
        // Только если это не начало или конец маршрута
        if (routeControl && (!title || (title.indexOf('маршрута') === -1 && title.indexOf('Начало') === -1 && title.indexOf('Конец') === -1))) {
          console.log("[u041au0430u0440u0442u0430] u041fu0440u043eu043fu0443u0441u043au0430u0435u043c u0434u043eu0431u0430u0432u043bu0435u043du0438u0435 u043cu0430u0440u043au0435u0440u0430 u043fu0440u0438 u0430u043au0442u0438u0432u043du043eu043c u043cu0430u0440u0448u0440u0443u0442u0435", title);
          return -1;
        }
        
        // Используем новый класс для постоянных маркеров
        var marker = L.marker([lat, lng], {
          className: 'leaflet-permanent-marker', // Класс для защиты CSS
          zIndexOffset: 1000,                   // Высокий z-index
          interactive: true,                     // Всегда интерактивный
          opacity: 1,                            // Максимальная непрозрачность
          permanent: true                        // Наш кастомный флаг для защиты от удаления
        }).addTo(map);
        
        // Биндим всплывающее окно, если есть заголовок
        if (title) marker.bindPopup(title);
        
        // Добавляем в массив постоянных маркеров
        appMarkers.search.push(marker);
        
        // Также добавляем в старый массив для обратной совместимости
        markers.push(marker);
        
        // Принудительно делаем маркер видимым после добавления
        setTimeout(function() {
          if (marker && marker._icon) {
            marker._icon.style.visibility = 'visible';
            marker._icon.style.opacity = '1';
            marker._icon.style.zIndex = '9999';
          }
        }, 50);
        
        return markers.length - 1;
      },
      
      // u041eu0447u0438u0441u0442u043au0430 u0432u0441u0435u0445 u043cu0430u0440u043au0435u0440u043eu0432 с сохранением важных
      clearMarkers: function() {
        if (!map) return false;
        
        // Очищаем только маркеры поиска, сохраняя маркеры пользователя и маршрутов
        markers.forEach(function(marker) {
          // Проверяем, не относится ли маркер к постоянным
          if (marker !== appMarkers.user && marker !== appMarkers.start && marker !== appMarkers.end) {
            map.removeLayer(marker);
          }
        });
        
        // Очищаем массивы, сохраняя постоянные маркеры
        markers = markers.filter(function(marker) {
          return marker === appMarkers.user || marker === appMarkers.start || marker === appMarkers.end;
        });
        
        // Очищаем массив поисковых маркеров
        appMarkers.search.forEach(function(marker) {
          if (map.hasLayer(marker)) {
            map.removeLayer(marker);
          }
        });
        appMarkers.search = [];
        
        return true;
      },
      
      // u041fu043eu043au0430u0437u0430u0442u044c u043cu0435u0441u0442u043eu043fu043eu043bu043eu0436u0435u043du0438u0435 u043fu043eu043bu044cu0437u043eu0432u0430u0442u0435u043bu044f
      showUserLocation: function(lat, lng, center) {
        if (!map) return false;
        console.log("[u041au0430u0440u0442u0430] u041fu043eu043au0430u0437 u043cu0435u0441u0442u043eu043fu043eu043bu043eu0436u0435u043du0438u044f u043fu043eu043bu044cu0437u043eu0432u0430u0442u0435u043bu044f", lat, lng, "center:", center);

        // Если у нас уже есть маркер, просто обновляем его позицию
        if (appMarkers.user) {
          appMarkers.user.setLatLng([lat, lng]);
        } else {
          // Создаем новый маркер с защитой от исчезновения
          appMarkers.user = L.circleMarker([lat, lng], {
            radius: 8,
            fillColor: '#4285F4',
            color: '#fff',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.8,
            className: 'leaflet-permanent-marker user-marker', // Класс для защиты CSS
            zIndexOffset: 2000,                              // Очень высокий z-index
            interactive: true                                // Всегда интерактивный
          }).addTo(map);
          
          // Присваиваем для обратной совместимости
          userMarker = appMarkers.user;
          
          // Принудительно делаем маркер видимым
          setTimeout(function() {
            if (appMarkers.user && appMarkers.user._path) {
              appMarkers.user._path.style.visibility = 'visible';
              appMarkers.user._path.style.opacity = '1';
              appMarkers.user._path.style.zIndex = '9999';
            }
          }, 50);
        }

        // u0415u0441u043bu0438 u043du0443u0436u043du043e u0446u0435u043du0442u0440u0438u0440u043eu0432u0430u0442u044c u043au0430u0440u0442u0443 u043fu043e u043cu0435u0441u0442u043eu043fu043eu043bu043eu0436u0435u043du0438u044e
        if (center) {
          map.setView([lat, lng], 15);
        }
        return true;
      },
      
      // u041fu043eu0441u0442u0440u043eu0435u043du0438u0435 u043cu0430u0440u0448u0440u0443u0442u0430 u0441 u0438u0441u043fu043eu043bu044cu0437u043eu0432u0430u043du0438u0435u043c Leaflet Routing Machine
      calculateRoute: function(startLat, startLng, endLat, endLng, transportType) {
        if (!map) return false;

        try {
          console.log("[u041au0430u0440u0442u0430] u041fu043eu0441u0442u0440u043eu0435u043du0438u0435 u043cu0430u0440u0448u0440u0443u0442u0430", startLat, startLng, "->>", endLat, endLng, "type:", transportType);
          
          // Предварительно удаляем все элементы управления
          document.querySelectorAll('.leaflet-control-container, .leaflet-control-zoom, .leaflet-bar, .leaflet-control').forEach(function(control) {
            if (control && control.parentNode) {
              control.parentNode.removeChild(control);
            }
          });
          
          // u041eu0447u0438u0449u0430u0435u043c u043fu0440u0435u0434u044bu0434u0443u0449u0438u0439 u043cu0430u0440u0448u0440u0443u0442 (u0435u0441u043bu0438 u0435u0441u0442u044c)
          this.clearRoute();

          // u041eu043fu0440u0435u0434u0435u043bu044fu0435u043c u0440u0435u0436u0438u043c u043cu0430u0440u0448u0440u0443u0442u0430 u0438 u0446u0432u0435u0442
          let profile = 'car';
          let color = '#4285F4'; // u0421u0438u043du0438u0439 - u0430u0432u0442u043e
          
          switch(transportType) {
            case 'walk':
              profile = 'foot';
              color = '#43A047'; // u0417u0435u043bu0435u043du044bu0439 - u043fu0435u0448u043au043eu043c
              break;
            case 'bicycle':
              profile = 'bike';
              color = '#FB8C00'; // u041eu0440u0430u043du0436u0435u0432u044bu0439 - u0432u0435u043bu043eu0441u0438u043fu0435u0434
              break;
            case 'transit':
              profile = 'car';
              color = '#757575'; // u0421u0435u0440u044bu0439 - u043eu0431u0449u0435u0441u0442u0432u0435u043du043du044bu0439 u0442u0440u0430u043du0441u043fu043eu0440u0442
              break;
          }

          // u0414u043eu0431u0430u0432u043bu044fu0435u043c u043cu0430u0440u043au0435u0440u044b u043du0430u0447u0430u043bu0430 u0438 u043au043eu043du0446u0430 u043cu0430u0440u0448u0440u0443u0442u0430
          var startPoint = L.latLng(startLat, startLng);
          var endPoint = L.latLng(endLat, endLng);
          
          // Создаем кастомные SVG иконки для маркеров
          // Иконка для начала маршрута (зеленый маркер)
          const originIcon = L.divIcon({
            html: '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#4CAF50" stroke="white" stroke-width="1"></path><circle cx="12" cy="9" r="3" fill="white" stroke="#4CAF50" stroke-width="1"></circle></svg>',
            className: 'start-marker-icon',
            iconSize: [32, 32],
            iconAnchor: [16, 32]
          });
          
          // Иконка для конца маршрута (красный маркер)
          const destinationIcon = L.divIcon({
            html: '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#D32F2F" stroke="white" stroke-width="1"></path><circle cx="12" cy="9" r="3" fill="white" stroke="#D32F2F" stroke-width="1"></circle></svg>',
            className: 'end-marker-icon',
            iconSize: [32, 32],
            iconAnchor: [16, 32]
          });

          // Добавляем маркеры с кастомными иконками
          var startMarker = L.marker(startPoint, {icon: originIcon}).addTo(map);
          startMarker.bindPopup("Начало маршрута");
          
          var endMarker = L.marker(endPoint, {icon: destinationIcon}).addTo(map);
          endMarker.bindPopup("Конец маршрута");
          
          // Сохраняем в специальных переменных для управления видимостью
          appMarkers.start = startMarker;
          appMarkers.end = endMarker;
          
          // Добавляем только в массив маркеров для маршрута
          markers.push(startMarker, endMarker);
          
          // u0421u043eu0437u0434u0430u0435u043c u043cu0430u0440u0448u0440u0443u0442 u0441 u043fu043eu043cu043eu0449u044cu044e Leaflet Routing Machine
          if (!L.Routing) {
            console.error("[u041au0430u0440u0442u0430] L.Routing u043du0435 u043du0430u0439u0434u0435u043d. u0411u0438u0431u043bu0438u043eu0442u0435u043au0430 u043du0435 u0437u0430u0433u0440u0443u0436u0435u043du0430");
            // u0418u0441u043fu043eu043bu044cu0437u0443u0435u043c u043fu0440u043eu0441u0442u043eu0439 u043au043eu043du0442u0443u0440 u0434u043bu044f u0440u0435u0437u0435u0440u0432u043du043eu0433u043e u0434u0438u0441u043fu043bu0435u044f
            routeControl = L.polyline([startPoint, endPoint], {
              color: color,
              weight: 5,
              opacity: 0.7
            }).addTo(map);
          } else {
            console.log("[u041au0430u0440u0442u0430] u0421u043eu0437u0434u0430u043du0438u0435 u043cu0430u0440u0448u0440u0443u0442u0430 u0447u0435u0440u0435u0437 L.Routing.control");
            // u0418u0441u043fu043eu043bu044cu0437u0443u0435u043c Leaflet Routing Machine
            // Проверяем наличие методов библиотеки
            console.log("[Карта] Статус L.Routing:", L.Routing ? "Загружен" : "Не загружен");
            
            // Создаем собственный маршрутизатор с публичным OSRM сервером
            var osrmRouter = L.Routing.osrmv1({
              serviceUrl: "https://router.project-osrm.org/route/v1",
              profile: profile
            });
            
            // Создаем контроллер маршрута
            routeControl = L.Routing.control({
              router: osrmRouter,
              waypoints: [startPoint, endPoint],
              show: false,
              showAlternatives: false,
              addWaypoints: false,
              routeWhileDragging: false,
              lineOptions: {
                styles: [{color: color, opacity: 0.8, weight: 6}]
              },
              createMarker: function() { return null; } // Свои маркеры уже созданы
            }).addTo(map);
            
            console.log("[Карта] Маршрутизатор создан и добавлен на карту");

            routeControl.on('routesfound', function(e) {
              try {
                console.log("[u041au0430u0440u0442u0430] u041cu0430u0440u0448u0440u0443u0442u044b u043du0430u0439u0434u0435u043du044b:", e);
                var routes = e.routes;
                if (routes && routes.length > 0) {
                  var route = routes[0];
                  
                  // u041fu0435u0440u0435u0432u043eu0434u0438u043c u0440u0430u0441u0441u0442u043eu044fu043du0438u0435 u0432 u043au0438u043bu043eu043cu0435u0442u0440u044b u0438 u0432u0440u0435u043cu044f u0432 u043cu0438u043du0443u0442u044b
                  var distanceKm = (route.summary.totalDistance / 1000).toFixed(1);
                  var timeMinutes = Math.round(route.summary.totalTime / 60);

                  console.log("[u041au0430u0440u0442u0430] u041cu0430u0440u0448u0440u0443u0442 u043du0430u0439u0434u0435u043d:", distanceKm, "km,", timeMinutes, "min");
                  
                  sendMessageToReactNative({
                    type: 'routeReady',
                    distance: distanceKm,
                    time: timeMinutes,
                    transportType: transportType
                  });
                }
              } catch (error) {
                console.error("[u041au0430u0440u0442u0430] u041eu0448u0438u0431u043au0430 u043fu0440u0438 u043eu0431u0440u0430u0431u043eu0442u043au0435 u043du0430u0439u0434u0435u043du043du043eu0433u043e u043cu0430u0440u0448u0440u0443u0442u0430:", error);
              }
            });

            routeControl.on('routingerror', function(e) {
              console.error("[u041au0430u0440u0442u0430] u041eu0448u0438u0431u043au0430 u043cu0430u0440u0448u0440u0443u0442u0430:", e.error);
              
              // u0412 u0441u043bu0443u0447u0430u0435 u043eu0448u0438u0431u043au0438 u0438u0441u043fu043eu043bu044cu0437u0443u0435u043c u043fu0440u044fu043cu0443u044e u043bu0438u043du0438u044e
              routeControl = L.polyline([startPoint, endPoint], {
                color: color,
                weight: 5,
                opacity: 0.7,
                dashArray: '10, 10'
              }).addTo(map);
              
              // u0420u0430u0441u0441u0447u0438u0442u044bu0432u0430u0435u043c u043fu0440u0438u0431u043bu0438u0437u0438u0442u0435u043bu044cu043du043eu0435 u0440u0430u0441u0441u0442u043eu044fu043du0438u0435 u0438 u0432u0440u0435u043cu044f
              var distance = map.distance(startPoint, endPoint) / 1000;
              var distanceKm = distance.toFixed(1);
              
              var speedKmPerHour = transportType === 'walk' ? 5 : (transportType === 'bicycle' ? 15 : 60);
              var timeMinutes = Math.round((distance / speedKmPerHour) * 60);
              
              sendMessageToReactNative({
                type: 'routeReady',
                distance: distanceKm,
                time: timeMinutes,
                transportType: transportType,
                isEstimate: true // u041fu043eu043cu0435u0442u043au0430, u0447u0442u043e u0437u043du0430u0447u0435u043du0438u044f u043fu0440u0438u0431u043bu0438u0437u0438u0442u0435u043bu044cu043du044bu0435
              });
            });
          }
          
          // u041fu043eu0434u0433u043eu043du044fu0435u043c u043au0430u0440u0442u0443 u043fu043eu0434 u043eu0431u0430 u043cu0430u0440u043au0435u0440u0430
          map.fitBounds([startPoint, endPoint], {
            padding: [50, 50] // u041eu0442u0441u0442u0443u043f u043eu0442 u043au0440u0430u0435u0432
          });
          
          return true;
        } catch (error) {
          console.error("[u041au0430u0440u0442u0430] u041eu0448u0438u0431u043au0430 u043fu0440u0438 u043fu043eu0441u0442u0440u043eu0435u043du0438u0438 u043cu0430u0440u0448u0440u0443u0442u0430:", error);
          sendMessageToReactNative({
            type: 'routeError',
            message: error.message || 'u041eu0448u0438u0431u043au0430 u043fu043eu0441u0442u0440u043eu0435u043du0438u044f u043cu0430u0440u0448u0440u0443u0442u0430'
          });
          return false;
        }
      },
      
      // u041eu0447u0438u0441u0442u043au0430 u043cu0430u0440u0448u0440u0443u0442u0430
      clearRoute: function() {
        try {
          // u0423u0434u0430u043bu044fu0435u043c u043bu0438u043du0438u044e u043cu0430u0440u0448u0440u0443u0442u0430, u0435u0441u043bu0438 u043eu043du0430 u0435u0441u0442u044c
          if (routeControl) {
            map.removeLayer(routeControl);
            routeControl = null;
          }
          
          // u041eu0447u0438u0449u0430u0435u043c u0432u0441u0435 u043cu0430u0440u043au0435u0440u044b
          this.clearMarkers();
          
          return true;
        } catch (error) {
          console.error("[u041au0430u0440u0442u0430] u041eu0448u0438u0431u043au0430 u043fu0440u0438 u043eu0447u0438u0441u0442u043au0435 u043cu0430u0440u0448u0440u0443u0442u0430:", error);
          return false;
        }
      }
    };

    // u0417u0430u043fu0443u0441u043au0430u0435u043c u0438u043du0438u0446u0438u0430u043bu0438u0437u0430u0446u0438u044e u043au0430u0440u0442u044b
    initMap();
  </script>
</body>
</html>`;
}

/**
 * Создает JavaScript команду для инъектирования в WebView
 * 
 * @param {string} command - Название метода в window.mapAPI
 * @param {Array} params - Массив параметров
 */
export function createMapCommand(command, params = []) {
  // Радикально простой способ
  const paramsJSON = JSON.stringify(params);
  return `
console.log('[WebView] Вызов ${command} с параметрами:', ${paramsJSON});
try {
  const params = ${paramsJSON};
  const result = window.mapAPI.${command}(...params);
  console.log('[WebView] Результат ${command}:', result);
} catch(err) {
  console.error('[WebView] Ошибка выполнения ${command}:', err);
}
true;
  `;
}

/**
 * Отправляет маршрут в WebView для отображения, используя прямой вызов функции drawRouteWithPoints
 * 
 * @param {object} webViewRef - Ссылка на WebView
 * @param {Array} points - Массив точек маршрута
 * @param {string} transportType - Тип транспорта (WALKING, BICYCLING, DRIVING, TRANSIT)
 */
export function sendFullRouteToMap(webViewRef, points, transportType = 'DRIVING') {
  if (!webViewRef?.current || !points || !points.length) {
    console.error('Невозможно отправить маршрут: нет WebView или точек');
    return false;
  }
  
  console.log(`[ROUTE] Отправка маршрута из ${points.length} точек с типом ${transportType}`);
  
  // Напрямую инъектируем JavaScript для гарантированной отрисовки маршрута
  try {
    const routePointsJSON = JSON.stringify(points);
    const jsCode = `
      console.log('[WebView] Получено ${points.length} точек маршрута для отрисовки, тип: ${transportType}');
      
      try {
        if (!window.mapAPI || !window.mapAPI.drawRouteWithPoints) {
          console.error('[WebView] Ошибка: Не найдена функция drawRouteWithPoints!');
          console.log('Доступные методы mapAPI:', Object.keys(window.mapAPI));
        } else {
          const points = ${routePointsJSON};
          const result = window.mapAPI.drawRouteWithPoints(points, '${transportType}');
          console.log('[WebView] Результат отрисовки маршрута:', result);
        }
      } catch(err) {
        console.error('[WebView] Ошибка при отрисовке маршрута:', err);
        console.error('Stack:', err.stack);
      }
      true;
    `;
    
    webViewRef.current.injectJavaScript(jsCode);
    return true;
  } catch (error) {
    console.error('Ошибка при инъекции JavaScript для маршрута:', error);
    return false;
  }
}

/**
 * Отправляет точки маршрута в WebView для отрисовки
 * 
 * @param {object} webViewRef - Ссылка на WebView компонент
 * @param {Array} points - Массив точек маршрута с координатами lat/lng или latitude/longitude
 * @param {string} transportType - Тип транспорта (WALKING, BICYCLING, DRIVING)
 */
export function sendRoutePointsToMap(webViewRef, points, transportType) {
  if (!webViewRef?.current || !points || !points.length) {
    console.error('Невозможно отправить точки маршрута в карту: недопустимые параметры');
    return false;
  }
  
  console.log(`Отправка ${points.length} точек маршрута на карту (тип: ${transportType})`);
  
  // Версия 2: Прямая инъекция JavaScript для гарантированной отрисовки маршрута
  try {
    // Создаем цвет и стиль маршрута
    let color = '#4285F4'; // Синий - авто по умолчанию
    let dashArray = null; // Сплошная линия по умолчанию
      
    switch(transportType) {
      case 'WALKING':
        color = '#43A047'; // Зеленый - пешком
        dashArray = '5, 10';
        break;
      case 'BICYCLING':
        color = '#FB8C00'; // Оранжевый - велосипед
        dashArray = '10, 5';
        break;
      case 'TRANSIT':
        color = '#757575'; // Серый - общественный транспорт
        dashArray = '15, 10, 5, 10';
        break;
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
    
    const script = `
      (function() {
        try {
          console.log('[Карта] Принято ${points.length} точек маршрута типа ${transportType}');
          
          // Очищаем предыдущий маршрут и маркеры
          if (window.routeControl) {
            map.removeLayer(window.routeControl);
            window.routeControl = null;
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
          
          // Создаем массив точек Leaflet
          const routePoints = [${pointsJS}].map(point => L.latLng(point[0], point[1]));
          
          // Проверка на достаточное количество точек
          if (routePoints.length < 2) {
            console.error('[Карта] Недостаточно валидных точек для маршрута');
            return;
          }
          
          // Создаем кастомные SVG иконки для маркеров
          // Иконка для начала маршрута (зеленый маркер)
          const originIcon = L.divIcon({
            html: '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#4CAF50" stroke="white" stroke-width="1"></path><circle cx="12" cy="9" r="3" fill="white" stroke="#4CAF50" stroke-width="1"></circle></svg>',
            className: 'start-marker-icon',
            iconSize: [32, 32],
            iconAnchor: [16, 32]
          });
          
          // Иконка для конца маршрута (красный маркер)
          const destinationIcon = L.divIcon({
            html: '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#D32F2F" stroke="white" stroke-width="1"></path><circle cx="12" cy="9" r="3" fill="white" stroke="#D32F2F" stroke-width="1"></circle></svg>',
            className: 'end-marker-icon',
            iconSize: [32, 32],
            iconAnchor: [16, 32]
          });
          
          // Добавляем маркеры начала и конца с кастомными иконками
          const startMarker = L.marker(routePoints[0], {icon: originIcon}).addTo(map);
          startMarker.bindPopup('Начало маршрута');
          
          const endMarker = L.marker(routePoints[routePoints.length - 1], {icon: destinationIcon}).addTo(map);
          endMarker.bindPopup('Конец маршрута');
          
          window.markers.push(startMarker, endMarker);
          
          // Создаем линию маршрута с нужным стилем
          const polylineOptions = {
            color: '${color}',
            weight: 5,
            opacity: 0.8,
            lineJoin: 'round'
          };
          
          ${dashArray ? `polylineOptions.dashArray = '${dashArray}';` : ''}
          
          // Создаем полилинию маршрута и добавляем на карту
          window.routeControl = L.polyline(routePoints, polylineOptions).addTo(map);
          
          // Подгоняем масштаб карты для отображения всего маршрута
          map.fitBounds(L.latLngBounds(routePoints), { padding: [50, 50] });
          
          console.log('[Карта] Маршрут успешно отрисован! ✓');
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'routeDrawn',
              pointCount: routePoints.length,
              success: true
            }));
          }
        } catch (error) {
          console.error('[Карта] Ошибка при отрисовке маршрута:', error);
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'routeError',
              message: error.toString()
            }));
          }
        }
        return true;
      })();
    `;
    
    // Инъектируем JavaScript прямо в WebView
    if (webViewRef.current) {
      console.log(`Инъекция скрипта отрисовки маршрута (${points.length} точек)`);
      webViewRef.current.injectJavaScript(script);
      return true;
    } else {
      console.error('WebView не инициализирован');
      return false;
    }
  } catch (error) {
    console.error('Ошибка при отправке точек маршрута:', error);
    return false;
  }
}
