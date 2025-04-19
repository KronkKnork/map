import React, { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { StyleSheet, View, Dimensions, Platform } from 'react-native';
import WebView from 'react-native-webview';
import { logMapInfo } from '../../utils/DebugHelper';

/**
 * Компонент карты OpenStreetMap с использованием WebView для гарантированной работы
 */
const OSMMapView = forwardRef(({ 
  region,
  onRegionChange,
  onPress,
  children,
  userLocation,
  routeData,
  onRouteReady,
  isRouteLoading,
  mapType,
  rotateEnabled
}, ref) => {
  const webViewRef = useRef(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [mapCenter, setMapCenter] = useState(region || {
    latitude: 55.751244,
    longitude: 37.618423,
    latitudeDelta: 0.5,
    longitudeDelta: 0.5
  });
  
  // Инициализация карты
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.7.1/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.7.1/dist/leaflet.js"></script>
      <style>
        body, html { margin: 0; padding: 0; height: 100%; width: 100%; }
        #map { height: 100%; width: 100%; background-color: #f5f5f5; }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        // Инициализируем карту
        var map = L.map('map', {
          zoomControl: true,
          attributionControl: false
        });
        
        // Добавляем слой OpenStreetMap
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);
        
        // Маркер для пользователя
        var userMarker = null;
        
        // Функция обновления позиции карты
        function updateMapPosition(lat, lng, zoom) {
          map.setView([lat, lng], zoom || 13);
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'mapMoved',
            center: map.getCenter(),
            zoom: map.getZoom()
          }));
        }
        
        // Функция добавления маркера
        function addMarker(lat, lng, title) {
          var marker = L.marker([lat, lng]).addTo(map);
          if (title) marker.bindPopup(title);
          return marker;
        }
        
        // Обработчик клика по карте
        map.on('click', function(e) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'mapClick',
            latlng: e.latlng
          }));
        });
        
        // Обработчик движения карты
        map.on('moveend', function() {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'mapMoved',
            center: map.getCenter(),
            zoom: map.getZoom()
          }));
        });
        
        // Сообщаем, что карта готова
        map.whenReady(function() {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'mapReady'
          }));
        });
      </script>
    </body>
    </html>
  `;
  
  // Обработчик сообщений от WebView
  const handleWebViewMessage = useCallback((event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      logMapInfo(`WebView message: ${data.type}`);
      
      switch (data.type) {
        case 'mapReady':
          setIsMapReady(true);
          if (mapCenter) {
            sendMessageToWebView({
              action: 'updateMapPosition',
              lat: mapCenter.latitude,
              lng: mapCenter.longitude,
              zoom: 12
            });
          }
          break;
          
        case 'mapClick':
          if (onPress) {
            onPress({
              nativeEvent: {
                coordinate: {
                  latitude: data.latlng.lat,
                  longitude: data.latlng.lng
                }
              }
            });
          }
          break;
          
        case 'mapMoved':
          if (onRegionChange) {
            const newRegion = {
              latitude: data.center.lat,
              longitude: data.center.lng,
              latitudeDelta: 0.02 * Math.pow(2, (15 - data.zoom)),
              longitudeDelta: 0.02 * Math.pow(2, (15 - data.zoom))
            };
            setMapCenter(newRegion);
            onRegionChange(newRegion);
          }
          break;
      }
    } catch (error) {
      logMapInfo(`Error parsing WebView message: ${error.message}`);
    }
  }, [onPress, onRegionChange, mapCenter]);
  
  // Отправка сообщения в WebView
  const sendMessageToWebView = useCallback((message) => {
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(`
        (function() {
          const message = ${JSON.stringify(message)};
          
          switch (message.action) {
            case 'updateMapPosition':
              updateMapPosition(message.lat, message.lng, message.zoom);
              break;
              
            case 'addMarker':
              addMarker(message.lat, message.lng, message.title);
              break;
              
            case 'updateUserLocation':
              if (userMarker) map.removeLayer(userMarker);
              userMarker = addMarker(message.lat, message.lng, 'Вы здесь');
              break;
          }
          
          true;
        })();
      `);
    }
  }, []);
  
  // Обновление позиции карты при изменении region
  useEffect(() => {
    if (isMapReady && region) {
      logMapInfo(`Updating map position to: ${JSON.stringify(region)}`);
      sendMessageToWebView({
        action: 'updateMapPosition',
        lat: region.latitude,
        lng: region.longitude,
        zoom: Math.log2(360 / region.longitudeDelta) - 8
      });
    }
  }, [isMapReady, region, sendMessageToWebView]);
  
  // Обновление пользовательского местоположения
  useEffect(() => {
    if (isMapReady && userLocation?.coords) {
      logMapInfo(`Updating user location to: ${JSON.stringify(userLocation.coords)}`);
      sendMessageToWebView({
        action: 'updateUserLocation',
        lat: userLocation.coords.latitude,
        lng: userLocation.coords.longitude
      });
    }
  }, [isMapReady, userLocation, sendMessageToWebView]);
  
  // Предоставляем методы для внешнего доступа через ref
  useImperativeHandle(ref, () => ({
    animateToRegion: (targetRegion, duration) => {
      if (isMapReady && targetRegion) {
        sendMessageToWebView({
          action: 'updateMapPosition',
          lat: targetRegion.latitude,
          lng: targetRegion.longitude,
          zoom: Math.log2(360 / targetRegion.longitudeDelta) - 8
        });
      }
    },
    fitToCoordinates: (coordinates, options) => {
      if (isMapReady && coordinates && coordinates.length > 0) {
        // Простая имплементация - просто центрируем на первой координате
        sendMessageToWebView({
          action: 'updateMapPosition',
          lat: coordinates[0].latitude,
          lng: coordinates[0].longitude,
          zoom: 15
        });
      }
    },
    getMapRef: () => webViewRef.current
  }));
  
  useEffect(() => {
    logMapInfo('OSMMapView: компонент инициализирован');
    return () => {
      logMapInfo('OSMMapView: компонент уничтожен');
    };
  }, []);
  
  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html: htmlContent }}
        onMessage={handleWebViewMessage}
        style={styles.map}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        scalesPageToFit={false}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#e0e0e0',
  },
  map: {
    flex: 1,
  }
});

export default OSMMapView;
