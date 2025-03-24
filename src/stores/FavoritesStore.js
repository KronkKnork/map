import { makeAutoObservable, runInAction } from 'mobx';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Хранилище избранных мест пользователя
 */
class FavoritesStore {
  // Список избранных мест
  favorites = [];
  
  // Состояние загрузки
  isLoading = false;
  
  // Ошибка при загрузке
  error = null;
  
  constructor(rootStore) {
    this.rootStore = rootStore;
    makeAutoObservable(this);
  }
  
  /**
   * Загрузка избранных мест из локального хранилища
   */
  async loadFavorites() {
    this.isLoading = true;
    this.error = null;
    
    try {
      // Загружаем избранные места из AsyncStorage
      const favoritesData = await AsyncStorage.getItem('favorites');
      
      runInAction(() => {
        if (favoritesData) {
          this.favorites = JSON.parse(favoritesData);
        }
        
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
   * Сохранение избранных мест в локальное хранилище
   */
  async saveFavorites() {
    try {
      await AsyncStorage.setItem('favorites', JSON.stringify(this.favorites));
    } catch (error) {
      runInAction(() => {
        this.error = error.message;
      });
    }
  }
  
  /**
   * Добавление места в избранное
   */
  addFavorite(place) {
    // Проверяем, есть ли уже такое место в избранном
    const exists = this.favorites.some(item => item.id === place.id);
    
    if (!exists) {
      // Новое место с добавлением даты добавления
      const newPlace = {
        ...place,
        addedAt: new Date().toISOString(),
      };
      
      runInAction(() => {
        this.favorites.push(newPlace);
        this.saveFavorites();
      });
      
      return true;
    }
    
    return false;
  }
  
  /**
   * Удаление места из избранного
   */
  removeFavorite(placeId) {
    const initialLength = this.favorites.length;
    
    runInAction(() => {
      this.favorites = this.favorites.filter(item => item.id !== placeId);
      
      if (initialLength !== this.favorites.length) {
        this.saveFavorites();
        return true;
      }
    });
    
    return false;
  }
  
  /**
   * Проверка, является ли место избранным
   */
  isFavorite(placeId) {
    return this.favorites.some(item => item.id === placeId);
  }
  
  /**
   * Поиск по избранным местам
   */
  searchFavorites(query) {
    if (!query) {
      return this.favorites;
    }
    
    const lowerQuery = query.toLowerCase();
    return this.favorites.filter(item => 
      item.name.toLowerCase().includes(lowerQuery) || 
      (item.address && item.address.toLowerCase().includes(lowerQuery)) ||
      (item.category && item.category.toLowerCase().includes(lowerQuery))
    );
  }
  
  /**
   * Получение избранных мест по категории
   */
  getFavoritesByCategory(category) {
    if (!category || category === 'all') {
      return this.favorites;
    }
    
    return this.favorites.filter(item => item.category === category);
  }
  
  /**
   * Сортировка избранных мест
   */
  sortFavorites(sortBy = 'date', order = 'desc') {
    const sortedFavorites = [...this.favorites];
    
    switch (sortBy) {
      case 'name':
        sortedFavorites.sort((a, b) => {
          const nameA = a.name.toLowerCase();
          const nameB = b.name.toLowerCase();
          return order === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
        });
        break;
      case 'date':
        sortedFavorites.sort((a, b) => {
          const dateA = new Date(a.addedAt).getTime();
          const dateB = new Date(b.addedAt).getTime();
          return order === 'asc' ? dateA - dateB : dateB - dateA;
        });
        break;
      case 'distance':
        // Если есть данные о расстоянии
        sortedFavorites.sort((a, b) => {
          const distanceA = a.distance || Infinity;
          const distanceB = b.distance || Infinity;
          return order === 'asc' ? distanceA - distanceB : distanceB - distanceA;
        });
        break;
      default:
        break;
    }
    
    return sortedFavorites;
  }
  
  /**
   * Обновление информации о месте в избранном
   */
  updateFavorite(placeId, data) {
    const index = this.favorites.findIndex(item => item.id === placeId);
    
    if (index !== -1) {
      runInAction(() => {
        this.favorites[index] = {
          ...this.favorites[index],
          ...data,
          updatedAt: new Date().toISOString(),
        };
        
        this.saveFavorites();
      });
      
      return true;
    }
    
    return false;
  }
  
  /**
   * Сброс всех данных об избранных местах
   */
  async resetFavorites() {
    try {
      await AsyncStorage.removeItem('favorites');
      
      runInAction(() => {
        this.favorites = [];
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

export default FavoritesStore;
