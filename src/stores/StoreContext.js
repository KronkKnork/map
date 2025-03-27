import React from 'react';
import RootStore from './RootStore';

// Создаем контекст для хранилища данных
const StoreContext = React.createContext(null);

// Хук для использования хранилища данных в компонентах
export const useStore = () => React.useContext(StoreContext);

// Создаем провайдер для хранилища
export const StoreProvider = ({ children }) => {
  // Создаем экземпляр хранилища данных (используем useState для сохранения между рендерами)
  const [rootStore] = React.useState(() => new RootStore());
  
  // Инициализируем хранилище при монтировании компонента
  const [isInitialized, setIsInitialized] = React.useState(false);
  
  React.useEffect(() => {
    const initializeApp = async () => {
      try {
        await rootStore.initialize();
      } catch (error) {
        console.error('Failed to initialize the app:', error);
      } finally {
        setIsInitialized(true);
      }
    };
    
    initializeApp();
  }, [rootStore]);
  
  // Показываем null, пока хранилище не инициализировано
  if (!isInitialized) {
    return null;
  }
  
  return (
    <StoreContext.Provider value={rootStore}>
      {children}
    </StoreContext.Provider>
  );
};

export default StoreContext;
