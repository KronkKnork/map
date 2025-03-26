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
 * @param {Function} onVoiceSearch - Колбэк для голосового поиска
 */
const SearchBar = ({
  value,
  onChangeText,
  onSubmit,
  onFocus,
  onBlur,
  onClear,
  isLoading = false,
  onVoiceSearch
}) => {
  const inputRef = useRef(null);
  
  // Функция-обработчик нажатия на кнопку
  const handleButtonPress = () => {
    if (value.trim() === '') {
      // Если поле пустое, запускаем голосовой поиск
      onVoiceSearch?.();
    } else {
      // Если есть текст, очищаем поле
      onChangeText?.('');
      onClear?.();
    }
  };
  
  return (
    <View style={styles.container}>
      <View style={styles.searchIcon}>
        <Ionicons name="search" size={20} color={theme.colors.textSecondary} />
      </View>
      
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
      
      {isLoading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
        </View>
      ) : (
        <TouchableOpacity
          style={[styles.button, value ? styles.clearButton : styles.voiceButton]}
          onPress={handleButtonPress}
        >
          <Ionicons
            name={value ? 'close' : 'mic'}
            size={20}
            color="white"
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
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 8,
    zIndex: 10,
    alignItems: 'center',
    height: 50,
  },
  searchIcon: {
    paddingLeft: 16,
    paddingRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: "#333",
  },
  button: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  voiceButton: {
    backgroundColor: theme.colors.primary,
  },
  clearButton: {
    backgroundColor: theme.colors.primary,
  },
  loaderContainer: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
});

export default SearchBar;