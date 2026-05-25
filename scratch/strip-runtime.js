const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      walkDir(dirPath, callback);
    } else {
      callback(dirPath);
    }
  });
}

const appDir = path.join(__dirname, '..', 'app');
let modifiedFiles = 0;

walkDir(appDir, (filePath) => {
  const ext = path.extname(filePath);
  if (ext === '.tsx' || ext === '.ts') {
    let content = fs.readFileSync(filePath, 'utf8');
    // Match and remove: export const runtime = 'edge'; or nodejs or anything similar
    const pattern = /export\s+const\s+runtime\s*=\s*(?:['"](?:edge|nodejs)['"]|process\.env\.NODE_ENV\s*===\s*['"]production['"]\s*\?\s*['"]edge['"]\s*:\s*['"]nodejs['"])\s*;?\r?\n?/g;
    
    if (pattern.test(content)) {
      console.log(`Stripping runtime from ${filePath}...`);
      const updated = content.replace(pattern, '');
      fs.writeFileSync(filePath, updated, 'utf8');
      modifiedFiles++;
    }
  }
});

console.log(`Successfully stripped runtime config from ${modifiedFiles} files.`);
