import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { observer } from 'mobx-react';
import 'react-native-gesture-handler'; // Важная зависимость для работы навигации

// Импортируем наши хранилища данных
import RootStore from './src/stores/RootStore';

// Импорт темы приложения
import { theme } from './src/theme';

// Импортируем навигационные компоненты
import { AppNavigator } from './src/navigation';

// Создаем контекст для хранилища данных
const StoreContext = React.createContext(null);

// Хук для использования хранилища данных в компонентах
export const useStore = () => React.useContext(StoreContext);

// Основное приложение
const App = observer(() => {
  // Создаем экземпляр хранилища данных
  const [rootStore] = useState(() => new RootStore());
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Инициализируем хранилище при запуске приложения
  useEffect(() => {
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
  
  // Показываем загрузочный экран, пока приложение инициализируется
  if (!isInitialized) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Загрузка MapEase...</Text>
      </View>
    );
  }
  
  return (
    <StoreContext.Provider value={rootStore}>
      <SafeAreaProvider>
        <NavigationContainer>
          <AppNavigator />
          <StatusBar style="auto" />
        </NavigationContainer>
      </SafeAreaProvider>
    </StoreContext.Provider>
  );
});

// Стили
const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    marginTop: theme.spacing.m,
    ...theme.typography.textBody,
    color: theme.colors.textPrimary,
  },
});

export default App;
