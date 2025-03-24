import { makeAutoObservable } from 'mobx';
import MapStore from './MapStore';
import UserStore from './UserStore';
import SettingsStore from './SettingsStore';
import FavoritesStore from './FavoritesStore';

/**
 * Корневое хранилище, которое содержит все другие хранилища
 */
class RootStore {
  constructor() {
    // Создаем все необходимые хранилища
    this.mapStore = new MapStore(this);
    this.userStore = new UserStore(this);
    this.settingsStore = new SettingsStore(this);
    this.favoritesStore = new FavoritesStore(this);
    
    // Автоматическая подписка на изменения
    makeAutoObservable(this);
  }
  
  /**
   * Инициализация всех сторов
   */
  async initialize() {
    // Здесь мы можем загрузить необходимые данные при запуске приложения
    await this.settingsStore.loadSettings();
    await this.userStore.loadUser();
    await this.favoritesStore.loadFavorites();
    // Инициализируем карту после загрузки настроек
    this.mapStore.initialize();
  }
  
  /**
   * Сброс всех данных приложения
   */
  async resetAllData() {
    // Сбрасываем все данные в каждом хранилище
    await this.settingsStore.resetSettings();
    await this.userStore.resetUser();
    await this.favoritesStore.resetFavorites();
    this.mapStore.reset();
  }
}

export default RootStore;
