import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator, Pressable, Keyboard, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { observer } from 'mobx-react-lite';

/**
 * Компонент для отображения результатов поиска
 */
const SearchResults = observer(({ 
  results, 
  onSelectPlace, 
  loading, 
  visible, 
  onClose,
  searchQuery
}) => {
  const [displayedResults, setDisplayedResults] = useState([]);
  const [displayLimit, setDisplayLimit] = useState(10);
  const [allResults, setAllResults] = useState([]);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const screenHeight = Dimensions.get('window').height;
  
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

  useEffect(() => {
    // При изменении результатов сбрасываем лимит и обновляем список
    if (results && results.length > 0) {
      setAllResults(results);
      setDisplayLimit(10);
    } else {
      setAllResults([]);
    }
  }, [results]);

  useEffect(() => {
    // Обновляем отображаемые результаты при изменении лимита или всех результатов
    setDisplayedResults(allResults.slice(0, displayLimit));
  }, [allResults, displayLimit]);

  const loadMoreResults = () => {
    if (displayLimit < allResults.length) {
      setDisplayLimit(prevLimit => prevLimit + 10);
    }
  };

  // Функция-обработчик нажатия на результат
  const handlePress = (result) => {
    console.log(`Нажатие на результат: ${result.name}`);
    
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
    onSelectPlace(cleanResult);
  };

  // Определяем, какую иконку показывать в зависимости от типа результата
  const getIconForType = (type) => {
    switch (type) {
      case 'address':
        return 'location';
      case 'business':
        return 'business';
      default:
        return 'pin';
    }
  };

  const renderItem = ({ item }) => {
    // Форматирование расстояния
    const distanceText = item.distance 
      ? item.distance < 1 
        ? `${Math.round(item.distance * 1000)} м` 
        : `${item.distance.toFixed(1)} км` 
      : '';

    return (
      <Pressable
        style={({ pressed }) => [
          styles.resultItem,
          pressed && styles.resultItemPressed
        ]}
        onPress={() => handlePress(item)}
        android_ripple={{ color: '#eee' }}
      >
        <View style={styles.iconContainer}>
          <Ionicons 
            name={getIconForType(item.type)} 
            size={22} 
            color={theme.colors.primary} 
          />
        </View>
        <View style={styles.resultContent}>
          <Text style={styles.resultName} numberOfLines={1}>{item.name || "Без названия"}</Text>
          {item.address && (
            <Text style={styles.resultAddress} numberOfLines={1}>{item.address}</Text>
          )}
        </View>
        {distanceText ? (
          <View style={styles.distanceContainer}>
            <Text style={styles.resultDistance}>{distanceText}</Text>
          </View>
        ) : null}
      </Pressable>
    );
  };

  const renderFooter = () => {
    if (displayLimit < allResults.length) {
      return (
        <TouchableOpacity 
          style={styles.loadMoreButton} 
          onPress={loadMoreResults}
        >
          <Text style={styles.loadMoreText}>Загрузить еще</Text>
        </TouchableOpacity>
      );
    } else if (allResults.length > 0) {
      return (
        <View style={styles.endOfResultsContainer}>
          <Text style={styles.endOfResultsText}>Больше результатов нет</Text>
        </View>
      );
    }
    return null;
  };

  if (!visible) return null;

  // Рассчитываем высоту списка результатов, учитывая клавиатуру
  const resultsHeight = screenHeight - keyboardHeight; // 115px для верхней панели и поиска

  return (
    <View style={[styles.container, { height: resultsHeight }]}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Поиск мест...</Text>
        </View>
      ) : displayedResults.length > 0 ? (
        <FlatList
          data={displayedResults}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          ListFooterComponent={renderFooter}
          onEndReached={loadMoreResults}
          onEndReachedThreshold={0.5}
          keyboardShouldPersistTaps="always"
        />
      ) : (
        <View style={styles.noResultsContainer}>
          <Ionicons name="search-outline" size={48} color={theme.colors.textSecondary} style={styles.noResultsIcon} />
          <Text style={styles.noResultsText}>
            {searchQuery ? `Ничего не найдено по запросу "${searchQuery}"` : 'Введите запрос для поиска'}
          </Text>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    paddingTop: 115,
    zIndex: 9,
  },
  resultItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    flexDirection: 'row',
    alignItems: 'center',
  },
  resultItemPressed: {
    backgroundColor: '#f5f5f5',
  },
  iconContainer: {
    marginRight: 12,
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultContent: {
    flex: 1,
    justifyContent: 'center',
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
  },
  distanceContainer: {
    marginLeft: 8,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  resultDistance: {
    fontSize: 14,
    color: theme.colors.primary,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: theme.colors.textPrimary,
  },
  noResultsContainer: {
    padding: 30,
    alignItems: 'center',
  },
  noResultsIcon: {
    marginBottom: 10,
    opacity: 0.5,
  },
  noResultsText: {
    fontSize: 16,
    textAlign: 'center',
    color: theme.colors.textPrimary,
  },
  loadMoreButton: {
    padding: 15,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  loadMoreText: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.primary,
  },
  endOfResultsContainer: {
    padding: 15,
    alignItems: 'center',
  },
  endOfResultsText: {
    fontSize: 14,
    color: '#999',
  },
  highlightedText: {
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
  }
});

export default SearchResults;