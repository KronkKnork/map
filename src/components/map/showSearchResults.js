/**
 * u0424u0443u043du043au0446u0438u044f u0434u043bu044f u043eu0442u043eu0431u0440u0430u0436u0435u043du0438u044f u0440u0435u0437u0443u043bu044cu0442u0430u0442u043eu0432 u043fu043eu0438u0441u043au0430 u0432 Leaflet.
 * @param {Array} results - u043cu0430u0441u0441u0438u0432 u0440u0435u0437u0443u043bu044cu0442u0430u0442u043eu0432 u043fu043eu0438u0441u043au0430
 */
function showSearchResults(results) {
  // u0421u043du0430u0447u0430u043bu0430 u0443u0434u0430u043bu0438u043c u0432u0441u0435 u043fu0440u0435u0434u044bu0434u0443u0449u0438u0435 u0440u0435u0437u0443u043bu044cu0442u0430u0442u044b
  for (let id in placeMarkers) {
    if (id.startsWith('search_result_')) {
      removePlaceMarker(id);
    }
  }
  
  if (!results || !Array.isArray(results) || results.length === 0) {
    return;
  }
  
  // u0421u043eu0437u0434u0430u0435u043c u0433u0440u0430u043du0438u0446u044b u0434u043bu044f u043fu043eu0434u0433u043eu043du043au0438 u043au0430u0440u0442u044b
  const bounds = L.latLngBounds();
  
  // u0414u043eu0431u0430u0432u043bu044fu0435u043c u043cu0430u0440u043au0435u0440u044b u0434u043bu044f u0440u0435u0437u0443u043bu044cu0442u0430u0442u043eu0432
  results.forEach((result, index) => {
    if (result.latitude && result.longitude) {
      const lat = result.latitude;
      const lng = result.longitude;
      const markerId = `search_result_${index}`;
      
      // u0414u043eu0431u0430u0432u043bu044fu0435u043c u043cu0430u0440u043au0435u0440 u0441 u043fu043eu043fu0430u043fu043eu043c
      const marker = addPlaceMarker(
        markerId, 
        lat, 
        lng, 
        result.name || 'Result', 
        'search_result'
      );
      
      // u0414u043eu0431u0430u0432u043bu044fu0435u043c u043eu0431u0440u0430u0431u043eu0442u0447u0438u043a u043au043bu0438u043au0430
      marker.on('click', function() {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'searchResultClick',
          index: index,
          position: { lat, lng }
        }));
      });
      
      // u0414u043eu0431u0430u0432u043bu044fu0435u043c u0432 u0433u0440u0430u043du0438u0446u044b
      bounds.extend([lat, lng]);
    }
  });
  
  // u041fu043eu0434u0433u043eu043du044fu0435u043c u043au0430u0440u0442u0443 u043fu043eu0434 u0432u0441u0435 u0440u0435u0437u0443u043bu044cu0442u0430u0442u044b, u0435u0441u043bu0438 u043eu043du0438 u0435u0441u0442u044c
  if (!bounds.isEmpty()) {
    map.fitBounds(bounds, {
      padding: [30, 30], // u043eu0442u0441u0442u0443u043fu044b u043fu043e u043au0440u0430u044fu043c
      maxZoom: 16, // u043du0435 u043fu0440u0438u0431u043bu0438u0436u0430u0435u043c u0441u043bu0438u0448u043au043eu043c u0441u0438u043bu044cu043du043e
      animate: true
    });
  }
}
