import { makeAutoObservable, runInAction } from 'mobx';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Хранилище настроек приложения
 */
class SettingsStore {
  // Текущая тема приложения (светлая/темная)
  theme = 'light';
  
  // Язык приложения
  language = 'ru';
  
  // Настройки карты
  mapSettings = {
    showTraffic: true, // Показывать загруженность дорог
    showPOI: true, // Показывать точки интереса
    mapType: 'standard', // Тип карты (standard, satellite, hybrid)
    navigationVoice: true, // Голосовые подсказки при навигации
    units: 'metric', // Единицы измерения (metric, imperial)
  };
  
  // Настройки уведомлений
  notificationSettings = {
    enabled: true, // Уведомления включены
    trafficAlerts: true, // Уведомления о пробках
    nearbyPOI: true, // Уведомления о близких точках интереса
    appUpdates: true, // Уведомления о обновлениях приложения
  };
  
  // Настройки конфиденциальности
  privacySettings = {
    shareLocation: true, // Предоставлять данные о местоположении
    shareRouteHistory: false, // Предоставлять историю маршрутов
    shareFeedback: true, // Предоставлять отзывы о маршрутах
    dataCollection: true, // Сбор анонимных данных для улучшения сервиса
  };
  
  // Состояние загрузки
  isLoading = false;
  
  // Ошибка при загрузке
  error = null;
  
  constructor(rootStore) {
    this.rootStore = rootStore;
    makeAutoObservable(this);
  }
  
  /**
   * Загрузка настроек из локального хранилища
   */
  async loadSettings() {
    this.isLoading = true;
    this.error = null;
    
    try {
      // Загружаем все настройки из AsyncStorage
      const theme = await AsyncStorage.getItem('theme');
      const language = await AsyncStorage.getItem('language');
      const mapSettings = await AsyncStorage.getItem('mapSettings');
      const notificationSettings = await AsyncStorage.getItem('notificationSettings');
      const privacySettings = await AsyncStorage.getItem('privacySettings');
      
      runInAction(() => {
        // Устанавливаем загруженные настройки, если они есть
        if (theme) this.theme = theme;
        if (language) this.language = language;
        if (mapSettings) this.mapSettings = JSON.parse(mapSettings);
        if (notificationSettings) this.notificationSettings = JSON.parse(notificationSettings);
        if (privacySettings) this.privacySettings = JSON.parse(privacySettings);
        
        this.isLoading = false;
      });
    } catch (error) {
      runInAction(() => {
        this.error = error.message;
        this.isLoading = false;
      });
    }
  }
  
  /**
   * Сохранение настроек в локальное хранилище
   */
  async saveSettings() {
    try {
      // Сохраняем все настройки в AsyncStorage
      await AsyncStorage.setItem('theme', this.theme);
      await AsyncStorage.setItem('language', this.language);
      await AsyncStorage.setItem('mapSettings', JSON.stringify(this.mapSettings));
      await AsyncStorage.setItem('notificationSettings', JSON.stringify(this.notificationSettings));
      await AsyncStorage.setItem('privacySettings', JSON.stringify(this.privacySettings));
    } catch (error) {
      runInAction(() => {
        this.error = error.message;
      });
    }
  }
  
  /**
   * Изменение темы приложения
   */
  setTheme(theme) {
    this.theme = theme;
    this.saveSettings();
  }
  
  /**
   * Изменение языка приложения
   */
  setLanguage(language) {
    this.language = language;
    this.saveSettings();
  }
  
  /**
   * Обновление настроек карты
   */
  updateMapSettings(settings) {
    this.mapSettings = {
      ...this.mapSettings,
      ...settings,
    };
    this.saveSettings();
  }
  
  /**
   * Обновление настроек уведомлений
   */
  updateNotificationSettings(settings) {
    this.notificationSettings = {
      ...this.notificationSettings,
      ...settings,
    };
    this.saveSettings();
  }
  
  /**
   * Обновление настроек конфиденциальности
   */
  updatePrivacySettings(settings) {
    this.privacySettings = {
      ...this.privacySettings,
      ...settings,
    };
    this.saveSettings();
  }
  
  /**
   * Сброс всех настроек на значения по умолчанию
   */
  async resetSettings() {
    try {
      await AsyncStorage.removeItem('theme');
      await AsyncStorage.removeItem('language');
      await AsyncStorage.removeItem('mapSettings');
      await AsyncStorage.removeItem('notificationSettings');
      await AsyncStorage.removeItem('privacySettings');
      
      runInAction(() => {
        // Возвращаем значения по умолчанию
        this.theme = 'light';
        this.language = 'ru';
        this.mapSettings = {
          showTraffic: true,
          showPOI: true,
          mapType: 'standard',
          navigationVoice: true,
          units: 'metric',
        };
        this.notificationSettings = {
          enabled: true,
          trafficAlerts: true,
          nearbyPOI: true,
          appUpdates: true,
        };
        this.privacySettings = {
          shareLocation: true,
          shareRouteHistory: false,
          shareFeedback: true,
          dataCollection: true,
        };
        this.isLoading = false;
        this.error = null;
      });
    } catch (error) {
      runInAction(() => {
        this.error = error.message;
      });
    }
  }
}

export default SettingsStore;
