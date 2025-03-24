import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  View, 
  TextInput, 
  TouchableOpacity, 
  ActivityIndicator, 
  Platform,
  Keyboard,
  TouchableWithoutFeedback
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';

/**
 * Компонент строки поиска для карты
 */
const SearchBar = ({
  searchText,
  onChangeText,
  onSubmitEditing,
  onFocus,
  onBlur,
  onClear,
  onVoiceSearch,
  isSearchLoading = false,
  debounceTimeout = 300, // Время дебонса в мс
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [localSearchText, setLocalSearchText] = useState(searchText);
  const debounceTimer = useRef(null);
  const inputRef = useRef(null);

  // При изменении searchText из пропсов обновляем локальное состояние
  useEffect(() => {
    setLocalSearchText(searchText);
  }, [searchText]);

  // Обработчик фокуса
  const handleFocus = () => {
    setIsFocused(true);
    if (onFocus) onFocus();
  };

  // Обработчик потери фокуса
  const handleBlur = () => {
    setIsFocused(false);
    if (onBlur) onBlur();
  };

  // Очистка текста поиска
  const handleClear = () => {
    setLocalSearchText('');
    if (onClear) onClear();
    Keyboard.dismiss();
  };

  // Обработчик изменения текста с дебонсом
  const handleTextChange = (text) => {
    setLocalSearchText(text);
    
    // Отменяем предыдущий таймер, если он есть
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    
    // Устанавливаем новый таймер
    debounceTimer.current = setTimeout(() => {
      if (onChangeText) {
        onChangeText(text);
      }
    }, debounceTimeout);
  };

  // Очищаем таймер при размонтировании компонента
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  // Метод для программного скрытия клавиатуры
  const dismissKeyboard = () => {
    Keyboard.dismiss();
    if (inputRef.current) {
      inputRef.current.blur();
    }
    
    if (onBlur) {
      onBlur();
    }
  };

  return (
    <TouchableWithoutFeedback onPress={dismissKeyboard}>
      <View style={styles.container}>
        <View style={[
          styles.searchContainer,
          isFocused && styles.searchContainerFocused,
        ]}>
          {/* Иконка поиска */}
          <View style={styles.searchIconContainer}>
            <Ionicons 
              name="search" 
              size={20} 
              color={isFocused ? theme.colors.primary : theme.colors.textSecondary} 
            />
          </View>
          
          {/* Поле ввода */}
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder="Куда вы направляетесь?"
            value={localSearchText}
            onChangeText={handleTextChange}
            onSubmitEditing={() => {
              if (onSubmitEditing) {
                onSubmitEditing();
              }
              dismissKeyboard();
            }}
            onFocus={handleFocus}
            onBlur={handleBlur}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
            placeholderTextColor={theme.colors.textTertiary}
          />
          
          {/* Кнопка очистки текста */}
          {localSearchText.length > 0 ? (
            <TouchableOpacity 
              style={styles.iconButton}
              onPress={handleClear}
              activeOpacity={0.7}
            >
              <Ionicons name="close-circle" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          ) : (
            // Кнопка голосового поиска
            <TouchableOpacity 
              style={styles.voiceButton}
              onPress={onVoiceSearch}
              activeOpacity={0.7}
            >
              <Ionicons name="mic" size={20} color="white" />
            </TouchableOpacity>
          )}
          
          {/* Индикатор загрузки */}
          {isSearchLoading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator 
                size="small" 
                color={theme.colors.primary} 
              />
            </View>
          )}
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchContainerFocused: {
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  searchIconContainer: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.textPrimary,
    paddingVertical: 0,
  },
  iconButton: {
    padding: 4,
  },
  voiceButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default SearchBar;
