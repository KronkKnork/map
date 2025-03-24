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
      onClear?.();
      Keyboard.dismiss();
    } else {
      // Если есть текст, очищаем поле
      onChangeText?.('');
      onClear?.();
    }
  };
  
  return (
    <View style={styles.container}>
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
        clearButtonMode="while-editing"
      />
      
      {isLoading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
        </View>
      ) : (
        <TouchableOpacity
          style={styles.button}
          onPress={handleButtonPress}
        >
          <Ionicons
            name={value ? 'close' : 'search'}
            size={24}
            color={theme.colors.primary}
          />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 10,
  },
  input: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: "#333",
  },
  button: {
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderContainer: {
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
    width: 48,
    height: 48,
  }
});

export default SearchBar; 