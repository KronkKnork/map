import React, { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { getLeafletMapHtml, sendRoutePointsToMap } from '../../utils/LeafletMapHelper';

/**
 * Упрощенная и надежная карта на основе OpenStreetMap + Leaflet с использованием WebView.
 * Специально разработана для устранения проблем с маркерами в WebView.
 */
const SimpleOSMMapView = forwardRef(({ 
  initialRegion,
  onRegionChange,
  onPress,
  onLongPress,
  children,
  showsUserLocation,
  userLocation,
  style,
  onMapReady,
  onRouteReady, // Добавляем пропс для обработки события готовности маршрута
  zoomEnabled = true,
  rotateEnabled = true,
  scrollEnabled = true,
  zoomControlEnabled = false
}, ref) => {
  const webViewRef = useRef(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Обработчик сообщений от WebView
  // Переменная для отслеживания состояния маршрута - используем только routeDrawn
  // Полностью удаляем isRoutingActive для предотвращения ошибок

  // Создаем состояния для отслеживания маршрута, чтобы избежать ошибок с isRoutingActive
  const [routeDrawn, setRouteDrawn] = useState(false);
  
  // Упрощенный обработчик сообщений от WebView без каких-либо сложных зависимостей
  const handleWebViewMessage = useCallback((event) => {
    // Базовая обработка сообщений
    let data;
    try {
      data = JSON.parse(event.nativeEvent.data);
      console.log('[SimpleOSMMapView] WebView сообщение:', data.type);
    } catch (parseError) {
      console.error('[SimpleOSMMapView] Ошибка разбора сообщения WebView:', parseError);
      return; // Прекращаем выполнение при ошибке разбора JSON
    }
    
    // Предельно простая и безопасная обработка событий
    switch (data.type) {
      case 'mapReady':
        try {
          setIsMapReady(true);
          setIsLoading(false);
          if (typeof onMapReady === 'function') onMapReady();
          
          // Автоматически переходим к местоположению пользователя, если оно доступно
          if (userLocation && userLocation.coords) {
            setTimeout(() => {
              sendMessageToWebView({
                action: 'centerMap',
                params: [
                  userLocation.coords.latitude,
                  userLocation.coords.longitude,
                  15  // Оптимальный зум для пользователя
                ]
              });
              console.log('Центрирование на пользователе в WebView:', userLocation.coords.latitude, userLocation.coords.longitude);
            }, 500);  // Даем немного времени для инициализации карты
          }
        } catch (readyError) {
          console.error('[SimpleOSMMapView] Ошибка при обработке mapReady:', readyError);
        }
        break;
        
      case 'mapClick':
        try {
          if (typeof onPress === 'function' && data.latlng) {
            onPress({
              nativeEvent: {
                coordinate: {
                  latitude: data.latlng.lat,
                  longitude: data.latlng.lng
                },
                position: { x: 0, y: 0 }
              }
            });
          }
        } catch (clickError) {
          console.error('[SimpleOSMMapView] Ошибка при обработке клика:', clickError);
        }
        break;
        
      case 'mapLongClick':
        try {
          if (typeof onLongPress === 'function' && data.latlng) {
            onLongPress({
              nativeEvent: {
                coordinate: {
                  latitude: data.latlng.lat,
                  longitude: data.latlng.lng
                },
                position: { x: 0, y: 0 }
              }
            });
          }
        } catch (longClickError) {
          console.error('[SimpleOSMMapView] Ошибка при обработке долгого нажатия:', longClickError);
        }
        break;
      
      case 'routeDrawn':
        try {
          // Обновляем внутреннее состояние - маршрут нарисован
          setRouteDrawn(true);
          // Устанавливаем только routeDrawn, полностью отказываемся от использования isRoutingActive
          // console.log('[SimpleOSMMapView] Маршрут успешно нарисован');
          
          // Уведомляем родительский компонент о готовности маршрута, если есть такой обработчик
          if (onRouteReady && typeof onRouteReady === 'function') {
            onRouteReady();
          }
        } catch (routeError) {
          console.error('[SimpleOSMMapView] Ошибка при обработке события маршрута:', routeError);
        }
        break;
        
      case 'mapMoved':
        // Максимально упрощенная обработка события перемещения карты
        // без каких-либо зависимостей от переменных вне этой функции
        if (data.center && data.center.lat && data.center.lng && onRegionChange) {
          const zoomLevel = data.zoom || 15;
          const delta = 0.02 * Math.pow(2, (15 - zoomLevel));
          
          const newRegion = {
            latitude: data.center.lat,
            longitude: data.center.lng,
            latitudeDelta: delta,
            longitudeDelta: delta
          };
          
          // Вызываем колбэк без дополнительных проверок
          onRegionChange(newRegion);
        }
        break;
        
      case 'error':
        console.error('[SimpleOSMMapView] WebView сообщила об ошибке:', data.message);
        break;
        
      default:
        console.log('[SimpleOSMMapView] Неизвестный тип сообщения:', data.type);
    }
  // Обрабатываем только зависимости, которые фактически используются внутри этой функции
  }, [onMapReady, onPress, onLongPress, onRegionChange, userLocation, sendMessageToWebView]);
  
  // Передает команду внутрь WebView
  const sendMessageToWebView = useCallback((message) => {
    if (webViewRef.current) {
      const jsCode = `
        (function() {
          try {
            const message = ${JSON.stringify(message)};
            if (window.mapAPI && window.mapAPI[message.action]) {
              window.mapAPI[message.action].apply(null, message.params || []);
            } else {
              console.error('WebView: Unknown action', message.action);
            }
          } catch (e) {
            console.error('WebView: Error executing action', e);
          }
          true;
        })();
      `;
      webViewRef.current.injectJavaScript(jsCode);
    }
  }, []);
  
  // Предоставляем методы для внешнего доступа через ref
  useImperativeHandle(ref, () => ({
    // Анимация перемещения к указанному региону
    animateToRegion: (region, duration = 500) => {
      sendMessageToWebView({
        action: 'centerMap',
        params: [
          region.latitude,
          region.longitude,
          Math.round(Math.log2(360 / region.longitudeDelta)) - 1
        ]
      });
    },
    
    // Подгонка карты под координаты
    fitToCoordinates: (coordinates, options = {}) => {
      // Вычисляем границы
      if (coordinates && coordinates.length > 0) {
        const latitudes = coordinates.map(coord => coord.latitude || coord.lat);
        const longitudes = coordinates.map(coord => coord.longitude || coord.lng);
        
        const minLat = Math.min(...latitudes);
        const maxLat = Math.max(...latitudes);
        const minLng = Math.min(...longitudes);
        const maxLng = Math.max(...longitudes);
        
        sendMessageToWebView({
          action: 'fitBounds',
          params: [
            [minLat, minLng],
            [maxLat, maxLng],
            options.animated !== false
          ]
        });
      }
    },
    
    // Построение маршрута
    calculateRoute: (startPoint, endPoint, mode, routePoints) => {
      // Если есть уже готовые точки маршрута, отправляем их
      if (routePoints && routePoints.length > 1) {
        sendRoutePointsToMap(webViewRef, routePoints, mode);
      } else {
        // Иначе отправляем запрос на построение маршрута
        sendMessageToWebView({
          action: 'calculateRoute',
          params: [
            startPoint.latitude || startPoint.lat,
            startPoint.longitude || startPoint.lng,
            endPoint.latitude || endPoint.lat,
            endPoint.longitude || endPoint.lng,
            mode.toLowerCase()
          ]
        });
      }
    },
    
    // Очистка маршрута
    clearRoute: () => {
      sendMessageToWebView({
        action: 'clearRoute',
        params: []
      });
    },
    
    // Добавление маркера
    addMarker: (coordinate, title) => {
      // Проверяем, есть ли активный маршрут
      // Если есть активный маршрут и это не маркер начала/конца, не добавляем синие маркеры
      if (routeDrawn && !title.includes('маршрут')) {
        console.log('[SimpleOSMMapView] Игнорируем добавление маркера при активном маршруте:', title);
        return;
      }
      
      sendMessageToWebView({
        action: 'addMarker',
        params: [
          coordinate.latitude || coordinate.lat,
          coordinate.longitude || coordinate.lng,
          title || ''
        ]
      });
    },
    
    // Очистка всех маркеров
    clearMarkers: () => {
      console.log('[SimpleOSMMapView] Очищаем все маркеры');
      sendMessageToWebView({
        action: 'clearMarkers',
      });
    },
    
    // Метод для переключения типа карты
    setMapType: (mapType) => {
      console.log('[SimpleOSMMapView] Переключение типа карты на:', mapType);
      sendMessageToWebView({
        command: 'setMapType',
        params: [mapType]
      });
    },
    
    // Прямой доступ к WebView для отправки сообщений
    sendMessageToWebView,
    
    // Доступ к WebView ref
    getWebViewRef: () => webViewRef.current
  }), [sendMessageToWebView]);
  
  // Инициализация карты с указанным регионом при загрузке
  useEffect(() => {
    if (isMapReady && initialRegion) {
      sendMessageToWebView({
        action: 'centerMap',
        params: [
          initialRegion.latitude,
          initialRegion.longitude,
          Math.round(Math.log2(360 / initialRegion.longitudeDelta)) - 1
        ]
      });
    }
  }, [isMapReady, initialRegion, sendMessageToWebView]);
  
  // Обновляем позицию пользователя - только синий кружок, без метки
  useEffect(() => {
    if (isMapReady && userLocation?.coords) {
      console.log('Обновляем маркер пользователя:', userLocation.coords.latitude, userLocation.coords.longitude);
      
      // Делаем небольшую задержку для уверенности, что карта готова
      setTimeout(() => {
        // Только синий кружок для позиции пользователя, без метки
        sendMessageToWebView({
          action: 'showUserLocation',
          params: [
            userLocation.coords.latitude,
            userLocation.coords.longitude,
            false // не центрировать карту на пользователе
          ]
        });
      }, 300);
    }
  }, [isMapReady, userLocation, sendMessageToWebView]);
  
  return (
    <View style={[styles.container, style]}>
      <WebView
        ref={webViewRef}
        source={{ html: getLeafletMapHtml() }}
        style={styles.webView}
        onMessage={handleWebViewMessage}
        originWhitelist={['*']}
        javaScriptEnabled={true}
        allowFileAccess={true}
        domStorageEnabled={true}
        mixedContentMode="always"
        onLoadStart={() => setIsLoading(true)}
        onLoadEnd={() => setTimeout(() => setIsLoading(false), 500)}
      />
      
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4285F4" />
        </View>
      )}
      
      {children}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative'
  },
  webView: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.7)'
  }
});

export default SimpleOSMMapView;