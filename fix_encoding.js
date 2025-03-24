const fs = require('fs');
const path = require('path');

// Функция для конвертации закодированных Unicode символов в обычный текст
function decodeUnicode(str) {
  return str.replace(/u([0-9a-fA-F]{4})/g, (match, hex) => {
    return String.fromCharCode(parseInt(hex, 16));
  });
}

// Обрабатывает файл
function processFile(filePath) {
  try {
    // Проверяем, что это файл JavaScript или JSON
    if (!['.js', '.jsx', '.json', '.ts', '.tsx'].includes(path.extname(filePath))) {
      return false;
    }
    
    // Читаем содержимое файла
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Проверяем, есть ли закодированные символы
    if (!content.includes('u04')) {
      return false;
    }
    
    // Преобразуем закодированные символы
    const decodedContent = decodeUnicode(content);
    
    // Записываем обновленное содержимое
    fs.writeFileSync(filePath, decodedContent, 'utf8');
    
    return true;
  } catch (err) {
    console.error(`Ошибка при обработке файла ${filePath}:`, err);
    return false;
  }
}

// Рекурсивно ищем файлы в директории
function findFiles(directory) {
  const results = [];
  
  function traverse(dir) {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        // Пропускаем node_modules и .git
        if (file !== 'node_modules' && file !== '.git') {
          traverse(fullPath);
        }
      } else {
        results.push(fullPath);
      }
    }
  }
  
  traverse(directory);
  return results;
}

// Основная функция
function main() {
  const projectRoot = process.cwd();
  console.log(`Поиск файлов с закодированными символами в ${projectRoot}...`);
  
  const files = findFiles(projectRoot);
  let fixedFilesCount = 0;
  
  for (const file of files) {
    const wasFixed = processFile(file);
    if (wasFixed) {
      console.log(`Исправлен файл: ${file}`);
      fixedFilesCount++;
    }
  }
  
  console.log(`Готово! Исправлено файлов: ${fixedFilesCount}`);
}

main();
