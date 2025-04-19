import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';

/**
 * Компонент оверлея для отображения статуса геолокации
 * @param {Object} props - Пропсы компонента
 * @param {boolean} props.permissionDenied - Флаг отказа в разрешении
 * @param {boolean} props.isLoading - Флаг загрузки местоположения
 * @param {function} props.onRequestPermission - Функция запроса разрешения
 */
const LocationPermissionOverlay = ({ 
  permissionDenied, 
  isLoading,
  onRequestPermission 
}) => {
  if (!permissionDenied && !isLoading) return null;
  
  return (
    <View style={styles.overlay}>
      <View style={styles.container}>
        {permissionDenied ? (
          <>
            <Ionicons name="location-off" size={64} color={theme.colors.error} />
            <Text style={styles.title}>Требуется доступ к геолокации</Text>
            <Text style={styles.description}>
              Для корректной работы приложения и определения вашего местоположения,
              необходимо разрешение на доступ к геолокации.
            </Text>
            <TouchableOpacity 
              style={styles.button}
              onPress={onRequestPermission}
            >
              <Text style={styles.buttonText}>Разрешить доступ</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.title}>Определяем ваше местоположение</Text>
            <Text style={styles.description}>
              Пожалуйста, подождите немного, пока мы определяем ваше местоположение
              для наиболее точной работы карты.
            </Text>
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.9)',
    zIndex: 1000,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    padding: 20,
    width: '90%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  button: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default LocationPermissionOverlay;
