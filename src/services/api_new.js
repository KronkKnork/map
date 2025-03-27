// API u0441u0435u0440u0432u0438u0441u044b u0434u043bu044f MapEase - u043eu0441u043du043eu0432u043du043eu0439 u0444u0430u0439u043b

// u0418u043cu043fu043eu0440u0442u0438u0440u0443u0435u043c u0444u0443u043du043au0446u0438u0438 u0438u0437 u043cu043eu0434u0443u043bu044cu043du044bu0445 u0444u0430u0439u043bu043eu0432
import { 
  searchPlaces, 
  searchLocalPlaces,
  searchByNameWithFallback,
  reverseGeocode 
} from './searchApi';

import { 
  fetchRouteDirections,
  getTrafficData 
} from './routeApi';

import { 
  getTypeFromCategory 
} from './apiUtils';

// u042du043au0441u043fu043eu0440u0442u0438u0440u0443u0435u043c u0432u0441u0435 API u0444u0443u043du043au0446u0438u0438 u043du0430u043fu0440u044fu043cu0443u044e
export {
  searchPlaces,
  searchLocalPlaces,
  searchByNameWithFallback,
  reverseGeocode,
  getTrafficData,
  fetchRouteDirections,
  getTypeFromCategory
};

// u042du043au0441u043fu043eu0440u0442u0438u0440u0443u0435u043c u0432u0441u0435 API u0444u0443u043du043au0446u0438u0438 u043fu043e u0443u043cu043eu043bu0447u0430u043du0438u044e
export default {
  searchPlaces,
  searchLocalPlaces,
  searchByNameWithFallback,
  getTypeFromCategory,
  reverseGeocode,
  getTrafficData,
  fetchRouteDirections,
};
