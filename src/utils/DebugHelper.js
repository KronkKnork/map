import { Alert } from 'react-native';

// Массив для хранения логов
const debugLogs = [];

// Флаг режима отладки
let isDebugMode = true;

/**
 * Инициализирует отладочный режим
 */
export const initDebugMode = () => {
  // Создаем глобальные функции для отладки
  global.showLogs = showDebugLogs;
  global.toggleDebug = toggleDebugMode;
  
  // Переопределяем console.log
  const originalConsoleLog = console.log;
  console.log = (...args) => {
    originalConsoleLog(...args);
    
    // Сохраняем лог в массив
    debugLogs.push({
      time: new Date().toISOString(),
      type: 'INFO',
      message: args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ')
    });
    
    // Ограничиваем размер массива
    if (debugLogs.length > 200) {
      debugLogs.shift();
    }
  };
  
  // Переопределяем console.error
  const originalConsoleError = console.error;
  console.error = (...args) => {
    originalConsoleError(...args);
    
    // Сохраняем ошибку в массив
    debugLogs.push({
      time: new Date().toISOString(),
      type: 'ERROR',
      message: args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ')
    });
  };
  
  // Устанавливаем обработчик ошибок
  global.ErrorUtils.setGlobalHandler((error, isFatal) => {
    const errorMsg = error?.message || String(error);
    console.log(`Перехвачена ${isFatal ? 'критическая' : ''} ошибка: ${errorMsg}`);
    
    // Сохраняем ошибку в массив
    debugLogs.push({
      time: new Date().toISOString(),
      type: 'FATAL',
      message: `${isFatal ? 'Критическая' : 'Обработанная'} ошибка: ${errorMsg}`
    });
    
    // Выводим логи при критической ошибке
    if (isFatal) {
      setTimeout(() => {
        showDebugLogs();
      }, 500);
    }
  });
  
  // Добавляем инициализационные логи
  console.log('DebugHelper: Отладочный режим инициализирован');
};

/**
 * Показывает отладочные логи
 */
export const showDebugLogs = () => {
  if (debugLogs.length === 0) {
    Alert.alert('Отладочные логи', 'Логи пусты');
    return;
  }
  
  const formatTime = (timeStr) => {
    try {
      return timeStr.split('T')[1].split('.')[0];
    } catch (e) {
      return timeStr;
    }
  };
  
  const typeIcons = {
    'INFO': '',
    'ERROR': '❌ ',
    'FATAL': '☠️ ',
    'MAP': '🗺️ ',
  };
  
  const logsText = debugLogs.slice(-15).map(log => 
    `${formatTime(log.time)} ${typeIcons[log.type] || ''}${log.message}`
  ).join('\n');
  
  Alert.alert(
    'Отладочные логи',
    logsText,
    [
      { text: 'Очистить', onPress: () => { debugLogs.length = 0; } },
      { text: 'OK' }
    ]
  );
};

/**
 * Добавляет специальный лог для карты
 */
export const logMapInfo = (message) => {
  const msg = `MAP: ${message}`;
  console.log(msg);
  
  // Добавляем специальный тип для логов карты
  debugLogs.push({
    time: new Date().toISOString(),
    type: 'MAP',
    message: msg
  });
};

/**
 * Переключает режим отладки
 */
export const toggleDebugMode = () => {
  isDebugMode = !isDebugMode;
  console.log(`DebugHelper: Режим отладки ${isDebugMode ? 'включен' : 'выключен'}`);
};

/**
 * Проверяет, включен ли режим отладки
 */
export const isDebugEnabled = () => isDebugMode;
