const fs = require('fs');
const path = require('path');

const target = process.argv[2];
if (target !== 'edge' && target !== 'nodejs') {
  console.error("Usage: node set-runtime.js <edge|nodejs>");
  process.exit(1);
}

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

walkDir(appDir, (filePath) => {
  const ext = path.extname(filePath);
  if (ext === '.tsx' || ext === '.ts') {
    const base = path.basename(filePath);
    if (base === 'page.tsx' || base === 'route.ts') {
      let content = fs.readFileSync(filePath, 'utf8');
      const pattern = /export\s+const\s+runtime\s*=\s*(?:['"](?:edge|nodejs)['"]|process\.env\.NODE_ENV\s*===\s*['"]production['"]\s*\?\s*['"]edge['"]\s*:\s*['"]nodejs['"])\s*;?/g;
      if (pattern.test(content)) {
        console.log(`Setting runtime in ${filePath} to '${target}'...`);
        const updated = content.replace(pattern, `export const runtime = '${target}';`);
        fs.writeFileSync(filePath, updated, 'utf8');
      }
    }
  }
});

console.log(`Successfully set all routes runtime to '${target}'`);
console.log('Note: lib/db.ts uses Drizzle ORM — skipping Prisma rewrite.');
