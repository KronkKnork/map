const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

// Correct casing to use
const correctCasing = 'MapEase';
const incorrectCasing = 'mapease';

// Extensions to process
const extensions = ['.js', '.jsx', '.ts', '.tsx', '.json'];

// Directories to exclude
const excludeDirs = ['node_modules', '.git', 'dist', '.expo'];

async function getAllFiles(dir) {
  const files = [];
  
  const items = await readdir(dir);
  
  for (const item of items) {
    if (excludeDirs.includes(item)) continue;
    
    const fullPath = path.join(dir, item);
    const stats = await stat(fullPath);
    
    if (stats.isDirectory()) {
      const subFiles = await getAllFiles(fullPath);
      files.push(...subFiles);
    } else if (stats.isFile() && extensions.includes(path.extname(fullPath))) {
      files.push(fullPath);
    }
  }
  
  return files;
}

async function fixCasingInFile(filePath) {
  try {
    const content = await readFile(filePath, 'utf8');
    
    // Check if the file contains incorrect casing
    if (!content.includes(incorrectCasing)) {
      return false;
    }
    
    // Replace all occurrences of incorrect casing with correct casing
    const updatedContent = content.replace(new RegExp(incorrectCasing, 'g'), correctCasing);
    
    if (content !== updatedContent) {
      await writeFile(filePath, updatedContent, 'utf8');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`Error processing file ${filePath}:`, error);
    return false;
  }
}

async function main() {
  try {
    const rootDir = path.resolve(__dirname);
    console.log(`Starting to fix casing issues in ${rootDir}`);
    
    const files = await getAllFiles(rootDir);
    console.log(`Found ${files.length} files to process`);
    
    let fixedCount = 0;
    
    for (const file of files) {
      const wasFixed = await fixCasingInFile(file);
      if (wasFixed) {
        fixedCount++;
        console.log(`Fixed casing in: ${file}`);
      }
    }
    
    console.log(`\nCompleted! Fixed casing in ${fixedCount} files.`);
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
