import { makeAutoObservable, runInAction } from 'mobx';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Хранилище данных пользователя
 */
class UserStore {
  // Данные пользователя
  user = null;
  
  // Статус премиум-подписки
  isPremium = false;
  
  // Состояние загрузки
  isLoading = false;
  
  // Ошибка при загрузке
  error = null;
  
  constructor(rootStore) {
    this.rootStore = rootStore;
    makeAutoObservable(this);
  }
  
  /**
   * Загрузка данных пользователя из локального хранилища
   */
  async loadUser() {
    this.isLoading = true;
    this.error = null;
    
    try {
      // Проверка наличия сохраненных данных пользователя
      const userData = await AsyncStorage.getItem('user_data');
      const premiumStatus = await AsyncStorage.getItem('premium_status');
      
      runInAction(() => {
        // Если есть сохраненные данные, загружаем их
        if (userData) {
          this.user = JSON.parse(userData);
        } else {
          // Иначе создаем нового анонимного пользователя
          this.user = {
            id: `user_${Date.now()}`,
            name: 'Гость',
            avatar: null,
            createdAt: new Date().toISOString(),
          };
          
          // Сохраняем нового пользователя
          this.saveUser();
        }
        
        // Устанавливаем статус премиум-подписки
        this.isPremium = premiumStatus === 'true';
        
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
   * Сохранение данных пользователя в локальное хранилище
   */
  async saveUser() {
    try {
      await AsyncStorage.setItem('user_data', JSON.stringify(this.user));
      await AsyncStorage.setItem('premium_status', String(this.isPremium));
    } catch (error) {
      runInAction(() => {
        this.error = error.message;
      });
    }
  }
  
  /**
   * Обновление профиля пользователя
   */
  async updateProfile(data) {
    this.isLoading = true;
    this.error = null;
    
    try {
      runInAction(() => {
        this.user = {
          ...this.user,
          ...data,
          updatedAt: new Date().toISOString(),
        };
        
        this.isLoading = false;
        
        // Сохраняем обновленные данные
        this.saveUser();
      });
    } catch (error) {
      runInAction(() => {
        this.error = error.message;
        this.isLoading = false;
      });
    }
  }
  
  /**
   * Активация премиум-подписки
   */
  async activatePremium() {
    this.isLoading = true;
    this.error = null;
    
    try {
      // Здесь будет код для интеграции с платежными системами
      
      // Пока просто устанавливаем флаг премиум
      runInAction(() => {
        this.isPremium = true;
        this.isLoading = false;
        
        // Сохраняем статус премиум
        this.saveUser();
      });
    } catch (error) {
      runInAction(() => {
        this.error = error.message;
        this.isLoading = false;
      });
    }
  }
  
  /**
   * Деактивация премиум-подписки
   */
  async deactivatePremium() {
    this.isLoading = true;
    this.error = null;
    
    try {
      runInAction(() => {
        this.isPremium = false;
        this.isLoading = false;
        
        // Сохраняем статус премиум
        this.saveUser();
      });
    } catch (error) {
      runInAction(() => {
        this.error = error.message;
        this.isLoading = false;
      });
    }
  }
  
  /**
   * Сброс данных пользователя
   */
  async resetUser() {
    try {
      await AsyncStorage.removeItem('user_data');
      await AsyncStorage.removeItem('premium_status');
      
      runInAction(() => {
        this.user = null;
        this.isPremium = false;
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

export default UserStore;
