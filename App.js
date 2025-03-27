import React from 'react';
import { StyleSheet, View, Text, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { observer } from 'mobx-react';
import 'react-native-gesture-handler'; // Важная зависимость для работы навигации

// Импортируем наши хранилища данных
import { StoreProvider } from './src/stores/StoreContext';

// Импорт темы приложения
import { theme } from './src/theme';

// Импортируем навигационные компоненты
import { AppNavigator } from './src/navigation';

// Компонент загрузки
const LoadingScreen = () => (
  <View style={styles.loading}>
    <ActivityIndicator size="large" color={theme.colors.primary} />
    <Text style={styles.loadingText}>Загрузка MapEase...</Text>
  </View>
);

// Основное приложение
const App = observer(() => {
  return (
    <StoreProvider>
      <SafeAreaProvider>
        <NavigationContainer>
          <AppNavigator />
          <StatusBar style="auto" />
        </NavigationContainer>
      </SafeAreaProvider>
    </StoreProvider>
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
