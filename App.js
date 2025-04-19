import React, { useEffect } from 'react';
import { LogBox, Alert, TouchableOpacity, Text, StyleSheet, View, ActivityIndicator } from 'react-native';
import { initDebugMode } from './src/utils/DebugHelper';

// Инициализируем отладочный режим
initDebugMode();
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

// Компонент кнопки отладки (невидимая, активируется тройным нажатием)
const DebugButton = () => {
  let lastTap = 0;
  let tapCount = 0;
  
  const handleTap = () => {
    const now = new Date().getTime();
    if (now - lastTap < 500) {
      tapCount++;
      if (tapCount >= 2) { // Активация после 3 быстрых нажатий
        global.showLogs();
        tapCount = 0;
      }
    } else {
      tapCount = 1;
    }
    lastTap = now;
  };
  
  return (
    <TouchableOpacity 
      onPress={handleTap}
      style={{
        position: 'absolute',
        bottom: 10,
        right: 10,
        width: 50,
        height: 50,
        zIndex: 9999,
        opacity: 0 // Невидимая кнопка
      }}
    />
  );
};

// Основное приложение
const App = observer(() => {
  // Устанавливаем игнорирование предупреждений
  useEffect(() => {
    // Игнорируем предупреждения в dev-режиме
    LogBox.ignoreLogs([
      'Non-serializable values were found in the navigation state',
      'Possible Unhandled Promise Rejection',
      'Setting a timer',
      'ViewPropTypes',
      '"new NativeEventEmitter()"' // Добавляем частые предупреждения
    ]);
    
    console.log('App запущен в ' + (__DEV__ ? 'development' : 'release') + ' режиме');
  }, []);
  
  return (
    <StoreProvider>
      <SafeAreaProvider>
        <NavigationContainer>
          <AppNavigator />
          <StatusBar style="auto" />
          <DebugButton />
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
