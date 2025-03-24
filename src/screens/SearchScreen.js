import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, FlatList } from 'react-native';
import { observer } from 'mobx-react';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { useStore } from '../../App';

// Безопасные значения для случая отсутствия theme.spacing
const SPACING = {
  xs: 4,
  s: 8,
  m: 16,
  l: 24,
  xl: 32
};

// Получаем безопасно значение из темы
const getSpacing = (size) => {
  if (theme && theme.spacing && theme.spacing[size] !== undefined) {
    return theme.spacing[size];
  }
  return SPACING[size] || SPACING.m; // Используем резервное значение
};

const SearchScreen = observer(() => {
  const store = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  
  // Показательные данные для демонстрации экрана
  const demoPlaces = [
    { id: '1', name: 'Парк Горького', category: 'Парк' },
    { id: '2', name: 'Ресторан «Пушкин»', category: 'Ресторан' },
    { id: '3', name: 'ТЦ «Мега»', category: 'Торговый центр' },
  ];
  
  const handleSearch = () => {
    if (searchQuery.trim() === '') {
      setSearchResults([]);
      return;
    }
    
    // Имитация поиска для демонстрации
    // В реальном приложении здесь будет вызов API
    const filteredResults = demoPlaces.filter(
      place => place.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    setSearchResults(filteredResults);
  };
  
  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.resultItem}>
      <View style={styles.itemContent}>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.itemCategory}>{item.category}</Text>
      </View>
      <Ionicons name="chevron-forward" size={24} color={theme?.colors?.textSecondary || '#5f6368'} />
    </TouchableOpacity>
  );
  
  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Поиск мест, адресов, категорий..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
        />
        <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
          <Ionicons name="search" size={24} color={theme?.colors?.textLight || '#ffffff'} />
        </TouchableOpacity>
      </View>
      
      {searchResults.length > 0 ? (
        <FlatList
          data={searchResults}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.resultsList}
        />
      ) : (
        <View style={styles.emptyStateContainer}>
          <Ionicons name="search" size={60} color={theme?.colors?.textSecondary || '#5f6368'} />
          <Text style={styles.emptyStateText}>
            {searchQuery ? 'Ничего не найдено' : 'Введите запрос для поиска'}
          </Text>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme?.colors?.background || '#ffffff',
  },
  searchContainer: {
    flexDirection: 'row',
    margin: getSpacing('m'),
    marginBottom: getSpacing('s'),
  },
  searchInput: {
    flex: 1,
    backgroundColor: theme?.colors?.backgroundSecondary || '#f5f5f5',
    borderRadius: getSpacing('s'),
    padding: getSpacing('m'),
    paddingRight: 50,
    fontSize: 16,
    color: theme?.colors?.textPrimary || '#202124',
  },
  searchButton: {
    backgroundColor: theme?.colors?.primary || '#1a73e8',
    borderRadius: getSpacing('s'),
    justifyContent: 'center',
    alignItems: 'center',
    padding: getSpacing('s'),
    marginLeft: -45,
    zIndex: 1,
    width: 40,
    height: 40,
    alignSelf: 'center',
  },
  resultsList: {
    padding: getSpacing('m'),
  },
  resultItem: {
    backgroundColor: theme?.colors?.backgroundSecondary || '#f5f5f5',
    borderRadius: getSpacing('s'),
    padding: getSpacing('m'),
    marginBottom: getSpacing('s'),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemContent: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme?.colors?.textPrimary || '#202124',
    marginBottom: 4,
  },
  itemCategory: {
    fontSize: 14,
    color: theme?.colors?.textSecondary || '#5f6368',
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: getSpacing('xl'),
  },
  emptyStateText: {
    fontSize: 16,
    color: theme?.colors?.textSecondary || '#5f6368',
    textAlign: 'center',
    marginTop: getSpacing('m'),
  },
});

export default SearchScreen;
