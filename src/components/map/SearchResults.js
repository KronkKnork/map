import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';

/**
 * Компонент для отображения результатов поиска
 * @param {Array} results - Массив результатов поиска
 * @param {Boolean} isLoading - Флаг загрузки
 * @param {Function} onSelectResult - Колбэк при выборе результата
 * @param {Boolean} showDistance - Показывать ли расстояние до объекта
 */
const SearchResults = ({ 
  results = [], 
  isLoading = false, 
  onSelectResult,
  showDistance = true
}) => {
  // Форматируем расстояние для отображения
  const formatDistance = (distance) => {
    if (!distance) return '';
    
    if (distance < 1) {
      // Если расстояние меньше 1 км, показываем в метрах
      return `${Math.round(distance * 1000)} м`;
    } else {
      // Иначе показываем в километрах с одним знаком после запятой
      return `${distance.toFixed(1)} км`;
    }
  };

  // Если нет результатов и нет загрузки, не показываем компонент
  if (results.length === 0 && !isLoading) {
    return null;
  }

  // Рендер одного результата поиска
  const renderResultItem = ({ item }) => (
    <TouchableOpacity
      style={styles.resultItem}
      onPress={() => onSelectResult(item)}
      activeOpacity={0.7}
    >
      <View style={styles.resultIconContainer}>
        <Ionicons 
          name={item.type === 'address' ? 'location-outline' : 'business-outline'} 
          size={20} 
          color={theme.colors.primary} 
        />
      </View>
      
      <View style={styles.resultInfo}>
        <Text style={styles.resultTitle} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.resultAddress} numberOfLines={1}>
          {item.address}
        </Text>
      </View>
      
      {showDistance && item.distance && (
        <View style={styles.distanceContainer}>
          <Text style={styles.distanceText}>
            {formatDistance(item.distance)}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Поиск...</Text>
        </View>
      ) : (
        <FlatList
          data={results}
          renderItem={renderResultItem}
          keyExtractor={(item, index) => `search-result-${index}`}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Ничего не найдено</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    marginHorizontal: 0,
    maxHeight: 300,
    // Увеличиваем высоту для видимости
    minHeight: 50,
    // Усиливаем тень для лучшей видимости
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 15,
    zIndex: 999, // Повышаем z-index чтобы быть над всеми элементами
    marginTop: -8, // Негативный отступ для присоединения к строке поиска
    // Добавляем обводку для лучшей видимости
    borderWidth: 1,
    borderColor: theme.colors.border,
    position: 'absolute', // Позиционируем абсолютно
    top: '100%', // Размещаем сразу под строкой поиска
    left: 0,
    right: 0,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingVertical: 8,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12, // Увеличиваем для лучшей нажимаемости
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  resultIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primary + '15', // полупрозрачный фон
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  resultInfo: {
    flex: 1,
  },
  resultTitle: {
    fontSize: 16, // Увеличиваем размер шрифта
    fontWeight: '500',
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  resultAddress: {
    fontSize: 14, // Увеличиваем размер шрифта
    color: theme.colors.textSecondary,
  },
  distanceContainer: {
    marginLeft: 8,
    paddingLeft: 8,
    borderLeftWidth: 1,
    borderLeftColor: theme.colors.border,
  },
  distanceText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  loadingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  emptyContainer: {
    padding: 16,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
});

export default SearchResults;
