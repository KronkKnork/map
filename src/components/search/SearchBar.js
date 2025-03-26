import React, { useRef, useEffect } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, Keyboard, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';

/**
 * Компонент строки поиска 
 * 
 * @param {String} value - Текущее значение поля ввода
 * @param {Function} onChangeText - Колбэк изменения текста
 * @param {Function} onSubmit - Колбэк отправки формы
 * @param {Function} onFocus - Колбэк фокуса на поле
 * @param {Function} onBlur - Колбэк потери фокуса
 * @param {Function} onClear - Колбэк очистки поля
 * @param {Boolean} isLoading - Флаг загрузки результатов
 */
const SearchBar = ({
  value,
  onChangeText,
  onSubmit,
  onFocus,
  onBlur,
  onClear,
  isLoading = false
}) => {
  const inputRef = useRef(null);
  
  // Функция-обработчик нажатия на кнопку
  const handleButtonPress = () => {
    if (value.trim() === '') {
      // Если поле пустое, запускаем голосовой поиск
      // В реальной реализации здесь должна быть логика для голосового поиска
    } else {
      // Если есть текст, очищаем поле
      onChangeText?.('');
      onClear?.();
    }
  };
  
  return (
    <View style={styles.container}>
      <View style={styles.searchInputContainer}>
        <Ionicons name="search" size={20} color={theme.colors.textSecondary} style={styles.searchIcon} />
        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder="Поиск мест и адресов"
          placeholderTextColor={theme.colors.placeholder}
          value={value}
          onChangeText={onChangeText}
          onFocus={onFocus}
          onBlur={onBlur}
          onSubmitEditing={onSubmit}
          returnKeyType="search"
        />
      </View>
      
      {isLoading ? (
        <View style={styles.actionButton}>
          <ActivityIndicator size="small" color="#FFF" />
        </View>
      ) : (
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleButtonPress}
        >
          <Ionicons
            name={value ? 'close' : 'mic'}
            size={20}
            color="#FFF"
          />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: "#606470",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
    zIndex: 10,
    alignItems: 'center',
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchIcon: {
    marginLeft: 16,
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: "#333",
  },
  actionButton: {
    backgroundColor: '#5853FC',
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
    marginVertical: 6,
  },
  loaderContainer: {
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default SearchBar;