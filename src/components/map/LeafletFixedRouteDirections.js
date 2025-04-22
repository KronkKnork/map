import React, { useState, useEffect, useRef } from 'react';
import { observer } from 'mobx-react-lite';
import { useStore } from '../../stores/StoreContext';
import { theme } from '../../theme';
import api from '../../services/api';

/**
 * u041au043eu043cu043fu043eu043du0435u043du0442 u0434u043bu044f u043eu0442u043eu0431u0440u0430u0436u0435u043du0438u044f u043cu0430u0440u0448u0440u0443u0442u043eu0432 u0447u0435u0440u0435u0437 Leaflet WebView
 * u0410u0434u0430u043fu0442u0438u0440u043eu0432u0430u043du043du0430u044f u0432u0435u0440u0441u0438u044f FixedRouteDirections
 */
const LeafletFixedRouteDirections = ({
  origin,
  destination,
  mode = 'DRIVING',
  onRouteReady,
  strokeColor,
  strokeWidth = 5,
  mapRef
}) => {
  // u0421u043eu0441u0442u043eu044fu043du0438u044f
  const [isRouteLoading, setIsRouteLoading] = useState(false);
  const [routeInfo, setRouteInfo] = useState(null);
  const [lastRequestKey, setLastRequestKey] = useState('');
  
  // u0421u0441u044bu043bu043au0438
  const mountedRef = useRef(true);
  const initializedRef = useRef(false);
  const requestTimeoutRef = useRef(null);
  
  // u0414u043eu0441u0442u0443u043f u043a u0433u043bu043eu0431u0430u043bu044cu043du043eu043cu0443 u0441u043eu0441u0442u043eu044fu043du0438u044e
  const rootStore = useStore();
  const mapStore = rootStore?.mapStore;
  
  // u041fu043eu043bu0443u0447u0435u043du0438u0435 u0446u0432u0435u0442u0430 u043cu0430u0440u0448u0440u0443u0442u0430 u0432 u0437u0430u0432u0438u0441u0438u043cu043eu0441u0442u0438 u043eu0442 u0440u0435u0436u0438u043cu0430
  const getRouteColor = () => {
    if (strokeColor) return strokeColor;
    
    switch(mode) {
      case 'WALKING':
        return theme.colors.routeWalk || '#4285F4';
      case 'BICYCLING':
        return theme.colors.routeBike || '#0F9D58';
      case 'TRANSIT':
        return theme.colors.routeTransit || '#9C27B0';
      default:
        return theme.colors.routeDrive || '#DB4437';
    }
  };
  
  // u041fu0440u0435u043eu0431u0440u0430u0437u043eu0432u0430u043du0438u0435 u0440u0435u0436u0438u043cu0430 u043cu0430u0440u0448u0440u0443u0442u0430 u0434u043bu044f Leaflet
  const getLeafletRouteType = (mode) => {
    switch (mode.toUpperCase()) {
      case 'WALKING':
        return 'walking';
      case 'BICYCLING':
        return 'cycling';
      case 'TRANSIT':
        return 'transit';
      case 'DRIVING':
      default:
        return 'driving';
    }
  };

  // u041fu0440u043eu0432u0435u0440u043au0430 u0432u0430u043bu0438u0434u043du043eu0441u0442u0438 u043au043eu043eu0440u0434u0438u043du0430u0442
  const areValidCoordinates = () => {
    return origin && 
           destination && 
           origin.latitude && 
           origin.longitude &&
           destination.latitude && 
           destination.longitude &&
           !isNaN(origin.latitude) && 
           !isNaN(origin.longitude) &&
           !isNaN(destination.latitude) && 
           !isNaN(destination.longitude);
  };

  // u041eu0442u043fu0440u0430u0432u043au0430 u0437u0430u043fu0440u043eu0441u0430 u043du0430 u043fu043eu0441u0442u0440u043eu0435u043du0438u0435 u043cu0430u0440u0448u0440u0443u0442u0430
  const fetchRoute = async () => {
    if (!areValidCoordinates() || !mapRef?.current) {
      console.log('LeafletFixedRouteDirections: u041du0435u0432u0430u043bu0438u0434u043du044bu0435 u043au043eu043eu0440u0434u0438u043du0430u0442u044b u0438u043bu0438 u043eu0442u0441u0443u0442u0441u0442u0432u0443u0435u0442 u0441u0441u044bu043bu043au0430 u043du0430 u043au0430u0440u0442u0443');
      return;
    }

    // u0424u043eu0440u043cu0438u0440u0443u0435u043c u0443u043du0438u043au0430u043bu044cu043du044bu0439 u043au043bu044eu0447 u0434u043bu044f u0437u0430u043fu0440u043eu0441u0430
    const requestKey = `${origin.latitude.toFixed(6)},${origin.longitude.toFixed(6)}-${destination.latitude.toFixed(6)},${destination.longitude.toFixed(6)}-${mode}`;
    
    // u041du0435 u0434u0435u043bu0430u0435u043c u043fu043eu0432u0442u043eu0440u043du044bu0439 u0437u0430u043fu0440u043eu0441, u0435u0441u043bu0438 u043au043eu043eu0440u0434u0438u043du0430u0442u044b u0442u0435 u0436u0435
    if (requestKey === lastRequestKey && routeInfo) {
      console.log('LeafletFixedRouteDirections: u0438u0441u043fu043eu043bu044cu0437u0443u0435u043c u043au044du0448u0438u0440u043eu0432u0430u043du043du044bu0439 u043cu0430u0440u0448u0440u0443u0442');
      return;
    }

    // u041eu0447u0438u0449u0430u0435u043c u0442u0430u0439u043cu0430u0443u0442 u0435u0441u043bu0438 u043eu043d u0435u0441u0442u044c
    if (requestTimeoutRef.current) {
      clearTimeout(requestTimeoutRef.current);
      requestTimeoutRef.current = null;
    }

    // u0417u0430u043fu0443u0441u043au0430u0435u043c u0437u0430u043fu0440u043eu0441 u0441 u043du0435u0431u043eu043bu044cu0448u043eu0439 u0437u0430u0434u0435u0440u0436u043au043eu0439 (u0447u0442u043eu0431u044b u043du0435 u0431u044bu043bu043e u0441u043bu0438u0448u043au043eu043c u0447u0430u0441u0442u044bu0445 u0437u0430u043fu0440u043eu0441u043eu0432)
    requestTimeoutRef.current = setTimeout(async () => {
      if (!mountedRef.current) return;
      
      setIsRouteLoading(true);
      setLastRequestKey(requestKey);
      
      try {
        // u041cu044b u043du0435 u0434u0435u043bu0430u0435u043c u0437u0430u043fu0440u043eu0441 u043a API, u0430 u043eu0442u043fu0440u0430u0432u043bu044fu0435u043c u043au043eu043cu0430u043du0434u0443 u0432 WebView
        const originPoint = { lat: origin.latitude, lng: origin.longitude };
        const destinationPoint = { lat: destination.latitude, lng: destination.longitude };

        // u041eu0442u043fu0440u0430u0432u043bu044fu0435u043c u0437u0430u043fu0440u043eu0441 u0432 WebView u0447u0435u0440u0435u0437 sendMessageToWebView
        mapRef.current.sendMessageToWebView({
          action: 'calculateRoute',
          origin: originPoint,
          destination: destinationPoint,
          waypoints: [], // u041fu043eu043au0430 u0431u0435u0437 u043fu0440u043eu043cu0435u0436u0443u0442u043eu0447u043du044bu0445 u0442u043eu0447u0435u043a
          routeType: getLeafletRouteType(mode)
        });

        // u0420u0435u0430u043bu044cu043du044bu0435 u0434u0430u043du043du044bu0435 u043cu0430u0440u0448u0440u0443u0442u0430 u043fu0440u0438u0434u0443u0442 u0432 u043au043eu043cu043fu043eu043du0435u043du0442 OSMMapView u0447u0435u0440u0435u0437 u043eu0431u0440u0430u0431u043eu0442u0447u0438u043a u0441u043eu043eu0431u0449u0435u043du0438u0439
        // u0418 u0431u0443u0434u0443u0442 u043fu0435u0440u0435u0434u0430u043du044b u0432 onRouteReady

        // u0412 u044du0442u043eu043c u043cu0435u0441u0442u0435 u043cu044b u043du0435 u0438u043cu0435u0435u043c u0434u0430u043du043du044bu0445 u043cu0430u0440u0448u0440u0443u0442u0430, u0442u0430u043a u043au0430u043a u043eu043du0438 u043fu0440u0438u0434u0443u0442 u0447u0435u0440u0435u0437 u0441u043eu043eu0431u0449u0435u043du0438u044f

      } catch (error) {
        console.error('LeafletFixedRouteDirections: u041eu0448u0438u0431u043au0430 u0437u0430u043fu0440u043eu0441u0430 u043cu0430u0440u0448u0440u0443u0442u0430', error);
        if (mountedRef.current) {
          setIsRouteLoading(false);
          // u0412u044bu0437u044bu0432u0430u0435u043c onRouteReady u0441 u043eu0448u0438u0431u043au043eu0439
          if (onRouteReady) {
            onRouteReady(null, error.message);
          }
        }
      }
    }, 200);
  };

  // u0417u0430u043fu0443u0441u043a u0437u0430u043fu0440u043eu0441u0430 u043fu0440u0438 u0438u0437u043cu0435u043du0435u043du0438u0438 u043au043eu043eu0440u0434u0438u043du0430u0442 u0438u043bu0438 u0440u0435u0436u0438u043cu0430
  useEffect(() => {
    // u0422u043eu043bu044cu043au043e u0435u0441u043bu0438 u043au043eu043cu043fu043eu043du0435u043du0442 u0441u043cu043eu043du0442u0438u0440u043eu0432u0430u043d u0438 u0435u0441u0442u044c u043au043eu043eu0440u0434u0438u043du0430u0442u044b
    if (mountedRef.current && areValidCoordinates()) {
      fetchRoute();
    }
  }, [origin, destination, mode, mapRef]);

  // u041eu0431u0440u0430u0431u043eu0442u043au0430 u043cu043eu043du0442u0438u0440u043eu0432u0430u043du0438u044f/u0434u0435u043cu043eu043du0442u0438u0440u043eu0432u0430u043du0438u044f
  useEffect(() => {
    mountedRef.current = true;
    
    return () => {
      // u041eu0447u0438u0449u0430u0435u043c u0442u0430u0439u043cu0430u0443u0442u044b u0438 u0444u043bu0430u0433u0438 u043fu0440u0438 u0440u0430u0437u043cu043eu043du0442u0438u0440u043eu0432u0430u043du0438u0438
      mountedRef.current = false;
      if (requestTimeoutRef.current) {
        clearTimeout(requestTimeoutRef.current);
        requestTimeoutRef.current = null;
      }
      
      // u0423u0434u0430u043bu044fu0435u043c u043cu0430u0440u043au0435u0440u044b u0438 u043cu0430u0440u0448u0440u0443u0442 u0441 u043au0430u0440u0442u044b u043fu0440u0438 u0443u0434u0430u043bu0435u043du0438u0438 u043au043eu043cu043fu043eu043du0435u043du0442u0430
      if (mapRef?.current) {
        mapRef.current.sendMessageToWebView({
          action: 'removePlaceMarker',
          id: 'route-origin'
        });
        
        mapRef.current.sendMessageToWebView({
          action: 'removePlaceMarker',
          id: 'route-destination'
        });
      }
    };
  }, []);

  // u041au043eu043cu043fu043eu043du0435u043du0442 u043du0435 u0440u0435u043du0434u0435u0440u0438u0442 u0432u0438u0434u0438u043cu044bu0439 UI, u0442u0430u043a u043au0430u043a u0432u0441u0451 u043eu0442u043eu0431u0440u0430u0436u0430u0435u0442u0441u044f u0432 WebView
  return null;
};

export default observer(LeafletFixedRouteDirections);
