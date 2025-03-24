import { colors } from './colors';
import { spacing } from './spacing';
import { typography } from './typography';

// Экспортируем тему приложения
export const lightTheme = {
  colors: {
    ...colors,
    background: colors.background,
    card: colors.card,
    text: colors.textPrimary,
    textSecondary: colors.textSecondary,
    border: colors.border,
    divider: colors.divider,
  },
  spacing,
  typography,
};

// Темная тема
export const darkTheme = {
  colors: {
    ...colors,
    background: colors.backgroundDark,
    card: colors.cardDark,
    text: colors.textPrimaryDark,
    textSecondary: colors.textSecondaryDark,
    border: colors.borderDark,
    divider: colors.dividerDark,
  },
  spacing,
  typography,
};

// Экспортируем все стили одним объектом
export const theme = {
  light: lightTheme,
  dark: darkTheme,
  colors: {
    ...colors,
    // Добавляем основные цвета напрямую для упрощения доступа
    primary: '#2196F3',
    secondary: '#FF9800',
    accent: '#03A9F4',
    background: '#F5F5F5',
    error: '#F44336',
    success: '#4CAF50',
    warning: '#FFC107',
    info: '#2196F3',
    textPrimary: '#212121',
    textSecondary: '#757575',
    border: colors.border,
    divider: '#BDBDBD',
    white: '#FFFFFF',
    black: '#000000',
    gray: '#9E9E9E',
    lightGray: '#EEEEEE',
    routeDriving: '#2196F3',
    routeWalk: '#4CAF50',
    routeBike: '#FF9800',
    routeTransit: '#9C27B0',
    trafficFree: '#4CAF50',
    trafficModerate: '#FFC107',
    trafficHeavy: '#FF9800',
    trafficSevere: '#F44336',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  typography,
  fontSize: {
    small: 12,
    medium: 14,
    large: 16,
    xlarge: 18,
    xxlarge: 22,
  },
  borderRadius: {
    small: 4,
    medium: 8,
    large: 12,
  },
  shadows: {
    small: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.18,
      shadowRadius: 1.0,
      elevation: 1,
    },
    medium: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.23,
      shadowRadius: 2.62,
      elevation: 4,
    },
    large: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.30,
      shadowRadius: 4.65,
      elevation: 8,
    },
  },
};

export default theme;
