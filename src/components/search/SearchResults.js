import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { theme } from '../../theme';

/**
 * Компонент для отображения результатов поиска
 * 
 * @param {Array} results - Массив результатов поиска
 * @param {Function} onSelectResult - Колбэк при выборе результата
 * @param {Boolean} isVisible - Флаг видимости списка результатов
 */
const SearchResults = ({ results, onSelectResult, isVisible }) => {
  if (!isVisible || !results || !results.length) {
    return null;
  }
  
  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {results.map((result, index) => (
          <TouchableOpacity
            key={result.id || index}
            style={styles.resultItem}
            onPress={() => onSelectResult(result)}
          >
            <View style={styles.resultContent}>
              <Text style={styles.resultName}>
                {result.name || "Без названия"}
              </Text>
              {result.address && (
                <Text style={styles.resultAddress} numberOfLines={1}>
                  {result.address}
                </Text>
              )}
              {result.distance && (
                <Text style={styles.resultDistance}>
                  {result.distance < 1 
                    ? `${Math.round(result.distance * 1000)} м` 
                    : `${result.distance.toFixed(1)} км`}
                </Text>
              )}
            </View>
          </TouchableOpacity>
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
    zIndex: 9,
  },
  scrollView: {
    maxHeight: 300,
  },
  resultItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
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