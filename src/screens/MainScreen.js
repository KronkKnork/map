import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { observer } from 'mobx-react';
import { theme } from '../theme';
import { useStore } from '../../App';

// Импортируем компоненты главного экрана
import {
  UserHeader,
  WeatherCard,
  NearbyPlacesSection,
  LastRouteCard,
  AdvertBanner
} from '../components/main';

const MainScreen = observer(({ navigation }) => {
  const store = useStore();
  const [hasLastRoute, setHasLastRoute] = useState(false); // Для демонстрации изменений состояния

  // Проверяем, есть ли сохраненный маршрут при загрузке
  useEffect(() => {
    // В реальном приложении здесь бы была проверка сохраненных маршрутов
    // Для демонстрации используем таймер
    const timer = setTimeout(() => {
      // Для демонстрации показываем маршрут
      if (Math.random() > 0.5) {
        setHasLastRoute(true);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  // Обработчики нажатий на компонентах
  const handleWeatherPress = () => {
    Alert.alert('Погода', 'Здесь будет подробный прогноз погоды');
  };

  const handlePlacesPress = () => {
    Alert.alert('Места поблизости', 'Здесь будет список интересных мест рядом с вами');
    // В реальном приложении здесь бы был переход на экран мест
    // navigation.navigate('Places');
  };

  const handleRoutePress = () => {
    Alert.alert('Маршрут', 'Здесь будет построение маршрута до выбранной точки');
    // В реальном приложении здесь бы был переход на экран маршрута
    // navigation.navigate('Route');
    
    // Для демонстрации переключаем состояние
    setHasLastRoute(true);
  };

  const handleAdvertPress = () => {
    Alert.alert('Реклама', 'Здесь будет подробная информация о рекламном предложении');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <UserHeader username="Пользователь" />
        
        <View style={styles.content}>
          {/* Карточка с погодой по геолокации */}
          <WeatherCard onPress={handleWeatherPress} />
          
          {/* Секция с местами рядом */}
          <NearbyPlacesSection onPress={handlePlacesPress} />
          
          {/* Карточка с последним маршрутом */}
          <LastRouteCard hasRoute={hasLastRoute} onPress={handleRoutePress} />
          
          {/* Рекламный баннер */}
          <AdvertBanner onPress={handleAdvertPress} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingBottom: theme.spacing.xl,
  },
});

export default MainScreen;
