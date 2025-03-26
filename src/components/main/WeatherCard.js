import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import * as Location from 'expo-location';

const WeatherCard = ({ onPress }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [weatherData, setWeatherData] = useState({
    city: 'Загрузка...',
    date: '',
    temperature: '',
    condition: '',
    humidity: '',
  });

  useEffect(() => {
    getLocationAndWeather();
  }, []);

  const getLocationAndWeather = async () => {
    try {
      setLoading(true);
      
      // Запрос разрешения на использование геолокации
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        setError('Для получения погоды необходим доступ к местоположению');
        setLoading(false);
        return;
      }
      
      // Получение текущего местоположения
      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;
      
      // Получение названия местоположения
      const geocode = await Location.reverseGeocodeAsync({
        latitude,
        longitude
      });
      
      const cityName = geocode[0]?.city || geocode[0]?.region || 'Неизвестное место';
      
      // Получение данных о погоде по координатам
      await fetchWeather(latitude, longitude, cityName);
    } catch (err) {
      setError('Не удалось получить данные о погоде');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchWeather = async (latitude, longitude, cityName) => {
    try {
      // Используем бесплатный API Open-Meteo без необходимости API ключа
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code&timezone=auto`
      );
      
      const data = await response.json();
      
      if (data && data.current) {
        // Форматирование даты
        const date = new Date();
        const options = { weekday: 'short', day: 'numeric', month: 'long' };
        const formattedDate = date.toLocaleDateString('ru-RU', options);
        
        // Получение описания погоды на основе кода
        const weatherCondition = getWeatherCondition(data.current.weather_code);
        
        setWeatherData({
          city: cityName,
          date: formattedDate,
          temperature: `${Math.round(data.current.temperature_2m)}°C`,
          condition: weatherCondition,
          humidity: `${Math.round(data.current.relative_humidity_2m)}%`,
          icon: getWeatherIcon(data.current.weather_code)
        });
      } else {
        setError('Ошибка получения данных о погоде');
      }
    } catch (err) {
      setError('Не удалось загрузить данные о погоде');
      console.error(err);
    }
  };

  // Функция для определения описания погоды на основе кода погоды Open-Meteo
  const getWeatherCondition = (code) => {
    // Коды погоды Open-Meteo: https://open-meteo.com/en/docs
    const weatherCodes = {
      0: 'Ясно',
      1: 'Преимущественно ясно',
      2: 'Переменная облачность',
      3: 'Пасмурно',
      45: 'Туман',
      48: 'Иней',
      51: 'Легкая морось',
      53: 'Умеренная морось',
      55: 'Сильная морось',
      56: 'Легкий ледяной дождь',
      57: 'Сильный ледяной дождь',
      61: 'Небольшой дождь',
      63: 'Умеренный дождь',
      65: 'Сильный дождь',
      66: 'Легкий ледяной дождь',
      67: 'Сильный ледяной дождь',
      71: 'Небольшой снег',
      73: 'Умеренный снег',
      75: 'Сильный снег',
      77: 'Снежные зерна',
      80: 'Легкий ливень',
      81: 'Умеренный ливень',
      82: 'Сильный ливень',
      85: 'Небольшой снегопад',
      86: 'Сильный снегопад',
      95: 'Гроза',
      96: 'Гроза с небольшим градом',
      99: 'Гроза с сильным градом'
    };
    
    return weatherCodes[code] || 'Неизвестные погодные условия';
  };

  // Функция для определения иконки погоды на основе кода погоды Open-Meteo
  const getWeatherIcon = (code) => {
    if (code === 0) return 'sunny';
    if (code === 1) return 'partly-sunny';
    if (code === 2) return 'partly-sunny';
    if (code === 3) return 'cloudy';
    if (code >= 45 && code <= 48) return 'cloudy';
    if (code >= 51 && code <= 67) return 'rainy';
    if (code >= 71 && code <= 77) return 'snow';
    if (code >= 80 && code <= 82) return 'rainy';
    if (code >= 85 && code <= 86) return 'snow';
    if (code >= 95) return 'thunderstorm';
    return 'partly-sunny';
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#FFF" />
        <Text style={styles.loadingText}>Загрузка погоды...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.errorContainer]}>
        <Ionicons name="alert-circle" size={40} color="#FFF" />
        <Text style={styles.errorText}>{error}</Text>
        <Text style={styles.retryText} onPress={getLocationAndWeather}>Повторить</Text>
      </View>
    );
  }

  return (
    <View style={styles.container} onTouchEnd={onPress}>
      <View style={styles.leftContent}>
        <Text style={styles.city}>{weatherData.city}</Text>
        <Text style={styles.date}>{weatherData.date}</Text>
        <Text style={styles.temperature}>{weatherData.temperature}</Text>
        <Text style={styles.condition}>{weatherData.condition}</Text>
      </View>
      <View style={styles.rightContent}>
        <View style={styles.weatherIcon}>
          <Ionicons name={weatherData.icon || 'partly-sunny'} size={50} color="#FFF" />
        </View>
        <Text style={styles.humidity}>Влажность: {weatherData.humidity}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: theme.spacing.m,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.spacing.m,
    marginHorizontal: theme.spacing.m,
    marginBottom: theme.spacing.l,
    minHeight: 150,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFF',
    marginTop: theme.spacing.s,
    fontSize: 16,
  },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#FFF',
    marginTop: theme.spacing.s,
    fontSize: 16,
    textAlign: 'center',
  },
  retryText: {
    color: '#FFF',
    marginTop: theme.spacing.m,
    fontSize: 16,
    textDecorationLine: 'underline',
  },
  leftContent: {
    flex: 2,
  },
  rightContent: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  city: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 2,
  },
  date: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: theme.spacing.s,
  },
  temperature: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 4,
  },
  condition: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  weatherIcon: {
    marginBottom: theme.spacing.s,
  },
  humidity: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'right',
  },
});

export default WeatherCard;
