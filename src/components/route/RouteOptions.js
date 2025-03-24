import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';

/**
 * Компонент для отображения опций маршрута
 * @param {string} routeType - Тип маршрута (car, walk, public_transport)
 * @param {object} options - Объект с опциями маршрута
 * @param {function} onOptionChange - Функция обратного вызова при изменении опции
 */
const RouteOptions = ({ 
  routeType = 'car',
  options = {
    avoidTolls: false,
    avoidHighways: false,
    preferSubway: true,
    preferBus: false,
  },
  onOptionChange 
}) => {
  // Получаем опции в зависимости от типа маршрута
  const getOptionsForType = () => {
    switch (routeType) {
      case 'car':
        return [
          { id: 'avoidTolls', label: 'Избегать платных дорог', value: options.avoidTolls || false },
          { id: 'avoidHighways', label: 'Избегать автомагистралей', value: options.avoidHighways || false },
        ];
      case 'public_transport':
      case 'subway':
        return [
          { id: 'preferSubway', label: 'Предпочитать метро', value: options.preferSubway || false },
          { id: 'preferBus', label: 'Предпочитать автобусы', value: options.preferBus || false },
        ];
      default:
        return [];
    }
  };

  const routeOptions = getOptionsForType();

  // Если нет опций для данного типа маршрута, не отображаем компонент
  if (routeOptions.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Опции маршрута</Text>
      
      {routeOptions.map(option => (
        <View key={option.id} style={styles.optionRow}>
          <Text style={styles.optionLabel}>{option.label}</Text>
          <Switch
            value={option.value}
            onValueChange={(newValue) => onOptionChange(option.id, newValue)}
            trackColor={{ false: '#E1E1E8', true: `${theme.colors.primary}70` }}
            thumbColor={option.value ? theme.colors.primary : '#F5F5F5'}
            ios_backgroundColor="#E1E1E8"
          />
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 12,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  optionLabel: {
    fontSize: 15,
    color: theme.colors.textPrimary,
  },
});

export default RouteOptions; 