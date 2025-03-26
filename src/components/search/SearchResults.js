import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Dimensions, Keyboard } from 'react-native';
import { theme } from '../../theme';

/**
 * Компонент для отображения результатов поиска
 */
const SearchResults = ({ results, onSelectResult, isVisible }) => {
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const screenHeight = Dimensions.get('window').height;
  
  // Отслеживаем высоту клавиатуры
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      (event) => {
        setKeyboardHeight(event.endCoordinates.height);
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

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

  // Рассчитываем высоту контейнера результатов
  const resultsHeight = screenHeight - keyboardHeight; // 140px - примерная высота верхней части экрана

  return (
    <View style={[styles.container, { maxHeight: resultsHeight }]}>
      <ScrollView 
        style={[styles.scrollView, { maxHeight: resultsHeight }]}
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
    top: 0, // Позиция под строкой поиска
    left: 0,
    right: 0,
    backgroundColor: 'white',
    elevation: 8,
    zIndex: 9,
    paddingTop: 115,
  },
  scrollView: {
    width: '100%',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
  },
  resultItem: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  resultItemPressed: {
    backgroundColor: '#f5f5f5',
  },
  resultContent: {
    flexDirection: 'column',
  },
  resultName: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  resultAddress: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
  resultDistance: {
    fontSize: 12,
    color: theme.colors.textTertiary,
    marginTop: 2,
  },
});

export default SearchResults;