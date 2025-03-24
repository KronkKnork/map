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
    primary: colors.primary,
    secondary: colors.secondary,
    background: colors.background,
    error: colors.error,
    success: colors.success,
    warning: colors.warning,
    info: colors.info,
    textPrimary: colors.textPrimary,
    textSecondary: colors.textSecondary,
    border: colors.border,
    divider: colors.divider,
    white: '#FFFFFF',
  },
  spacing,
  typography,
};

export default theme;
