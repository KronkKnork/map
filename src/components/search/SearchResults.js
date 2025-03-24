import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Pressable } from 'react-native';
import { theme } from '../../theme';

/**
 * Компонент для отображения результатов поиска
 */
const SearchResults = ({ results, onSelectResult, isVisible }) => {
  if (!isVisible || !results || results.length === 0) {
    return null;
  }

  // Функция-обработчик нажатия на результат
  const handlePress = (result, index) => {
    console.log(`Нажатие на результат #${index}: ${result.name}`);
    
    // Базовая проверка результата
    if (!result || !result.latitude || !result.longitude) {
      console.error('Результат без координат:', result);
      return;
    }
    
    // Убедимся, что координаты - числа
    const cleanResult = {
      ...result,
      latitude: typeof result.latitude === 'string' ? parseFloat(result.latitude) : result.latitude,
      longitude: typeof result.longitude === 'string' ? parseFloat(result.longitude) : result.longitude
    };
    
    // Вызов родительского обработчика
    onSelectResult(cleanResult);
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        keyboardShouldPersistTaps="always"
        contentContainerStyle={styles.scrollContent}
      >
        {results.map((item, index) => (
          <Pressable
            key={item.id || `result-${index}`}
            style={({ pressed }) => [
              styles.resultItem,
              pressed && styles.resultItemPressed
            ]}
            onPress={() => handlePress(item, index)}
            android_ripple={{ color: '#eee' }}
          >
            <View style={styles.resultContent}>
              <Text style={styles.resultName} numberOfLines={1}>
                {item.name || "Без названия"}
              </Text>
              {item.address && (
                <Text style={styles.resultAddress} numberOfLines={1}>
                  {item.address}
                </Text>
              )}
              {item.distance !== undefined && (
                <Text style={styles.resultDistance}>
                  {item.distance < 1 
                    ? `${Math.round(item.distance * 1000)} м` 
                    : `${item.distance.toFixed(1)} км`}
                </Text>
              )}
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 58,
    left: 10,
    right: 10,
    backgroundColor: 'white',
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    maxHeight: 300,
    zIndex: 99,
  },
  scrollView: {
    maxHeight: 300,
  },
  scrollContent: {
    flexGrow: 1,
  },
  resultItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  resultItemPressed: {
    backgroundColor: '#f0f0f0',
  },
  resultContent: {
    flexDirection: 'column',
    justifyContent: 'flex-start',
  },
  resultName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: "#333",
    marginBottom: 4,
  },
  resultAddress: {
    fontSize: 14,
    color: "#666",
    marginBottom: 2,
  },
  resultDistance: {
    fontSize: 14,
    color: theme.colors.primary,
    textAlign: 'right',
  },
});

export default SearchResults; 