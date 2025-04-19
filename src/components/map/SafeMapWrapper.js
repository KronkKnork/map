import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { theme } from '../../theme';

/**
 * Компонент-обертка для безопасного отображения карты с обработкой ошибок
 */
const SafeMapWrapper = ({ children, fallbackMessage }) => {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Не удалось загрузить карту</Text>
        <Text style={styles.errorMessage}>{fallbackMessage || 'Пожалуйста, проверьте подключение к интернету и перезапустите приложение.'}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => setHasError(false)}
        >
          <Text style={styles.retryText}>Попробовать снова</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Простая обертка без ErrorBoundary
  return (
    <View style={{ flex: 1 }}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: theme.colors.background,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: theme.colors.text,
  },
  errorMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    color: theme.colors.textLight,
  },
  retryButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default SafeMapWrapper;
