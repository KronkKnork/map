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
  
  /**
   * Поиск маршрута между двумя точками
   */
  async searchRoute(startPoint, endPoint) {
    this.isLoading = true;
    this.error = null;
    
    try {
      // Здесь будет API запрос к Open Street Map для получения маршрута
      // Пока используем заглушку
      setTimeout(() => {
        runInAction(() => {
          this.currentRoute = {
            distance: 5.7, // км
            duration: 15, // минут
            points: [
              { latitude: startPoint.latitude, longitude: startPoint.longitude },
              // Здесь будут промежуточные точки маршрута
              { latitude: endPoint.latitude, longitude: endPoint.longitude },
            ],
          };
          
          this.isLoading = false;
        });
      }, 1500);
    } catch (error) {
      runInAction(() => {
        this.error = error.message;
        this.isLoading = false;
      });
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
