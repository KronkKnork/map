import React from 'react';
import { isOSMMapEnabled } from '../../config';
import SelectedPlaceMarker from './SelectedPlaceMarker';
import LeafletSelectedPlaceMarker from './LeafletSelectedPlaceMarker';
import RouteMarkers from './RouteMarkers';
import LeafletRouteMarkers from './LeafletRouteMarkers';

/**
 * u0410u0434u0430u043fu0442u0435u0440 u0434u043bu044f u043cu0430u0440u043au0435u0440u043eu0432, u043au043eu0442u043eu0440u044bu0439 u0432u044bu0431u0438u0440u0430u0435u0442 u043du0443u0436u043du044bu0439 u043au043eu043cu043fu043eu043du0435u043du0442 u0432 u0437u0430u0432u0438u0441u0438u043cu043eu0441u0442u0438 u043eu0442 u0442u0438u043fu0430 u043au0430u0440u0442u044b
 */
export const MarkerAdapter = {
  /**
   * u0421u0435u043bu0435u043au0442u043eu0440 u043du0443u0436u043du043eu0433u043e u043au043eu043cu043fu043eu043du0435u043du0442u0430 u0434u043bu044f u043cu0430u0440u043au0435u0440u0430 u0432u044bu0431u0440u0430u043du043du043eu0433u043e u043cu0435u0441u0442u0430
   * 
   * @param {Object} props - u041fu0440u043eu043fu0441u044b u043au043eu043cu043fu043eu043du0435u043du0442u0430
   * @returns {React.Component} - u041au043eu043cu043fu043eu043du0435u043du0442 u043cu0430u0440u043au0435u0440u0430
   */
  SelectedPlaceMarker: (props) => {
    // u041du0435u043eu0431u0445u043eu0434u0438u043c u043fu0435u0440u0435u0434u0430u0442u044c mapRef u0434u043bu044f u043cu0430u0440u043au0435u0440u043eu0432 u0432 Leaflet
    const isOSM = isOSMMapEnabled();
    return isOSM 
      ? <LeafletSelectedPlaceMarker {...props} /> 
      : <SelectedPlaceMarker {...props} />;
  },
  
  /**
   * u0421u0435u043bu0435u043au0442u043eu0440 u043du0443u0436u043du043eu0433u043e u043au043eu043cu043fu043eu043du0435u043du0442u0430 u0434u043bu044f u043cu0430u0440u043au0435u0440u043eu0432 u043cu0430u0440u0448u0440u0443u0442u0430
   * 
   * @param {Object} props - u041fu0440u043eu043fu0441u044b u043au043eu043cu043fu043eu043du0435u043du0442u0430
   * @returns {React.Component} - u041au043eu043cu043fu043eu043du0435u043du0442 u043cu0430u0440u043au0435u0440u043eu0432 u043cu0430u0440u0448u0440u0443u0442u0430
   */
  RouteMarkers: (props) => {
    const isOSM = isOSMMapEnabled();
    return isOSM 
      ? <LeafletRouteMarkers {...props} /> 
      : <RouteMarkers {...props} />;
  }
};

export default MarkerAdapter;
