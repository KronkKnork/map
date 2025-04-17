import { makeAutoObservable, runInAction } from 'mobx';

/**
 * Хранилище данных для работы с картой
 */
class MapStore {
  // Текущая позиция пользователя
  userLocation = null;
  
  // Регион карты для отображения
  region = {
    latitude: 55.7558, // Москва по умолчанию
    longitude: 37.6176,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };
  
  // Текущий маршрут
  currentRoute = null;
  
  // Точки интереса поблизости
  nearbyPOI = [];
  
  // Загруженность дорог
  trafficInfo = [];
  
  // Состояние загрузки
  isLoading = false;
  
  // Ошибка при загрузке
  error = null;
  
  constructor(rootStore) {
    this.rootStore = rootStore;
    makeAutoObservable(this);
  }
  
  /**
   * Инициализация карты
   */
  initialize() {
    // Здесь будет код для инициализации карты
    this.getUserLocation();
  }
  
  /**
   * Получение текущей геолокации пользователя
   */
  async getUserLocation() {
    this.isLoading = true;
    this.error = null;
    
    try {
      // Здесь будет реальный код для получения геолокации
      // Пока используем заглушку
      setTimeout(() => {
        runInAction(() => {
          this.userLocation = {
            latitude: 55.7558,
            longitude: 37.6176,
            heading: 0,
            accuracy: 5,
          };
          
          // Обновляем регион карты, чтобы показать местоположение пользователя
          this.updateRegion({
            latitude: this.userLocation.latitude,
            longitude: this.userLocation.longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          });
          
          this.isLoading = false;
        });
      }, 1000);
    } catch (error) {
      runInAction(() => {
        this.error = error.message;
        this.isLoading = false;
      });
    }
  }
  
  /**
   * Обновление региона карты
   */
  updateRegion(region) {
    this.region = region;
  }
  
  // Переменные для работы с маршрутами
  lastRouteRequestTime = 0;
  routeRequestsCache = {};
  currentRouteRequests = new Set();
  apiBlocked = false;
  apiErrorCount = 0;
  
  /**
   * Проверка возможности выполнения запроса маршрута
   */
  canMakeRouteRequest() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRouteRequestTime;
    return timeSinceLastRequest > 1000; // Минимальный интервал между запросами - 1 секунда
  }
  
  /**
   * Обновление времени последнего запроса
   */
  updateLastRequestTime() {
    this.lastRouteRequestTime = Date.now();
  }
  
  /**
   * Добавление запроса в список активных
   */
  addRouteRequest(requestParams) {
    this.currentRouteRequests.add(requestParams);
  }
  
  /**
   * Удаление запроса из списка активных
   */
  removeRouteRequest(requestParams) {
    this.currentRouteRequests.delete(requestParams);
  }
  
  /**
   * Проверка наличия активного запроса
   */
  hasActiveRouteRequest(requestParams) {
    return this.currentRouteRequests.has(requestParams);
  }
  
  /**
   * Установка флага блокировки API
   */
  setApiBlocked(blocked) {
    this.apiBlocked = blocked;
  }
  
  /**
   * Получение состояния блокировки API
   */
  get isApiBlocked() {
    return this.apiBlocked;
  }
  
  /**
   * Кэширование маршрута
   */
  cacheRoute(requestParams, routeData) {
    this.routeRequestsCache[requestParams] = {
      ...routeData,
      timestamp: Date.now()
    };
    
    // Очистка старых записей в кэше
    const MAX_CACHE_SIZE = 40;
    const cacheKeys = Object.keys(this.routeRequestsCache);
    if (cacheKeys.length > MAX_CACHE_SIZE) {
      const sortedKeys = cacheKeys.sort((a, b) => {
        return (this.routeRequestsCache[a].timestamp || 0) - (this.routeRequestsCache[b].timestamp || 0);
      });
      
      // Удаляем самые старые записи
      const keysToDelete = sortedKeys.slice(0, cacheKeys.length - MAX_CACHE_SIZE);
      keysToDelete.forEach(key => {
        delete this.routeRequestsCache[key];
      });
    }
  }
  
  /**
   * Получение маршрута из кэша
   */
  getCachedRoute(requestParams) {
    if (!this.routeRequestsCache[requestParams]) {
      return null;
    }
    
    const cachedData = this.routeRequestsCache[requestParams];
    const cachedTimestamp = cachedData.timestamp || 0;
    const currentTime = Date.now();
    
    // Используем кэшированные данные, если они не старше 5 минут
    if (currentTime - cachedTimestamp < 5 * 60 * 1000) {
      return cachedData;
    }
    
    return null;
  }
  
  /**
   * Поиск маршрута между двумя точками
   */
  async searchRoute(startPoint, endPoint, mode = 'DRIVING') {
    this.isLoading = true;
    this.error = null;
    
    try {
      // Проверяем, можно ли выполнить запрос
      if (!this.canMakeRouteRequest()) {
        this.error = 'Слишком частые запросы';
        this.isLoading = false;
        return null;
      }
      
      // Обновляем время последнего запроса
      this.updateLastRequestTime();
      
      // Здесь будет API запрос к Open Street Map для получения маршрута
      // Пока используем заглушку
      setTimeout(() => {
        runInAction(() => {
          this.currentRoute = {
            distance: 5.7, // км
            duration: 15, // минут
            mode: mode,
            points: [
              { latitude: startPoint.latitude, longitude: startPoint.longitude },
              // Здесь будут промежуточные точки маршрута
              { latitude: endPoint.latitude, longitude: endPoint.longitude },
            ],
          };
          
          this.isLoading = false;
        });
      }, 1500);
      
      return this.currentRoute;
    } catch (error) {
      runInAction(() => {
        this.error = error.message;
        this.isLoading = false;
      });
      return null;
    }
  }
  
  /**
   * Поиск точек интереса (POI) поблизости
   */
  async searchNearbyPOI(category = 'all', radius = 1000) {
    this.isLoading = true;
    this.error = null;
    
    try {
      // Здесь будет API запрос к Open Street Map для поиска POI
      // Пока используем заглушку
      setTimeout(() => {
        runInAction(() => {
          this.nearbyPOI = [
            {
              id: '1',
              name: 'Ресторан "Москва"',
              category: 'restaurant',
              location: {
                latitude: this.userLocation.latitude + 0.002,
                longitude: this.userLocation.longitude + 0.003,
              },
              rating: 4.5,
              distance: 300, // метры
            },
            {
              id: '2',
              name: 'Торговый центр',
              category: 'shopping',
              location: {
                latitude: this.userLocation.latitude - 0.001,
                longitude: this.userLocation.longitude + 0.002,
              },
              rating: 4.2,
              distance: 450, // метры
            },
            {
              id: '3',
              name: 'Музей истории',
              category: 'museum',
              location: {
                latitude: this.userLocation.latitude + 0.003,
                longitude: this.userLocation.longitude - 0.001,
              },
              rating: 4.8,
              distance: 650, // метры
            },
          ];
          
          this.isLoading = false;
        });
      }, 1000);
    } catch (error) {
      runInAction(() => {
        this.error = error.message;
        this.isLoading = false;
      });
    }
  }
  
  /**
   * Получение информации о загруженности дорог
   */
  async getTrafficInfo() {
    this.isLoading = true;
    this.error = null;
    
    try {
      // Здесь будет API запрос для получения информации о трафике
      // Пока используем заглушку
      setTimeout(() => {
        runInAction(() => {
          this.trafficInfo = [
            {
              id: 't1',
              severity: 'moderate',
              location: {
                latitude: this.userLocation.latitude + 0.01,
                longitude: this.userLocation.longitude,
              },
              description: 'Умеренная загруженность',
            },
            {
              id: 't2',
              severity: 'heavy',
              location: {
                latitude: this.userLocation.latitude,
                longitude: this.userLocation.longitude + 0.015,
              },
              description: 'Сильная загруженность',
            },
          ];
          
          this.isLoading = false;
        });
      }, 1000);
    } catch (error) {
      runInAction(() => {
        this.error = error.message;
        this.isLoading = false;
      });
    }
  }
  
  /**
   * Сброс данных карты
   */
  reset() {
    this.userLocation = null;
    this.region = {
      latitude: 55.7558,
      longitude: 37.6176,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    };
    this.currentRoute = null;
    this.nearbyPOI = [];
    this.trafficInfo = [];
    this.isLoading = false;
    this.error = null;
  }
}

export default MapStore;
