// u0412u0441u043fu043eu043cu043eu0433u0430u0442u0435u043bu044cu043du044bu0435 u0444u0443u043du043au0446u0438u0438 u0434u043bu044f API u0441u0435u0440u0432u0438u0441u043eu0432

/**
 * u0424u0443u043du043au0446u0438u044f u0440u0430u0441u0447u0435u0442u0430 u0440u0430u0441u0441u0442u043eu044fu043du0438u044f u043fu043e u0444u043eu0440u043cu0443u043bu0435 u0413u0430u0432u0435u0440u0441u0438u043du0443u0441u0430
 * @param {Number} lat1 - u0428u0438u0440u043eu0442u0430 u043fu0435u0440u0432u043eu0439 u0442u043eu0447u043au0438
 * @param {Number} lon1 - u0414u043eu043bu0433u043eu0442u0430 u043fu0435u0440u0432u043eu0439 u0442u043eu0447u043au0438
 * @param {Number} lat2 - u0428u0438u0440u043eu0442u0430 u0432u0442u043eu0440u043eu0439 u0442u043eu0447u043au0438
 * @param {Number} lon2 - u0414u043eu043bu0433u043eu0442u0430 u0432u0442u043eu0440u043eu0439 u0442u043eu0447u043au0438
 * @returns {Number} - u0420u0430u0441u0441u0442u043eu044fu043du0438u0435 u0432 u043au0438u043bu043eu043cu0435u0442u0440u0430u0445
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // u0420u0430u0434u0438u0443u0441 u0417u0435u043cu043bu0438 u0432 u043au043c
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
  const distance = R * c; // u0420u0430u0441u0441u0442u043eu044fu043du0438u0435 u0432 u043au043c
  return distance;
};

/**
 * u041fu0435u0440u0435u0432u043eu0434 u0433u0440u0430u0434u0443u0441u043eu0432 u0432 u0440u0430u0434u0438u0430u043du044b
 * @param {Number} deg - u0423u0433u043eu043b u0432 u0433u0440u0430u0434u0443u0441u0430u0445
 * @returns {Number} - u0423u0433u043eu043b u0432 u0440u0430u0434u0438u0430u043du0430u0445
 */
export const deg2rad = (deg) => {
  return deg * (Math.PI / 180);
};

/**
 * u041eu043fu0440u0435u0434u0435u043bu0435u043du0438u0435 u0442u0438u043fu0430 u043eu0431u044au0435u043au0442u0430 u043fu043e u043au0430u0442u0435u0433u043eu0440u0438u0438
 * @param {String} category - u041au0430u0442u0435u0433u043eu0440u0438u044f u043eu0431u044au0435u043au0442u0430
 * @returns {String} - u0422u0438u043f u043eu0431u044au0435u043au0442u0430 (u0430u0434u0440u0435u0441, u0431u0438u0437u043du0435u0441 u0438u043bu0438 u043cu0435u0441u0442u043e)
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
