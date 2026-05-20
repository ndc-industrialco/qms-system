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
      
      // Match export const runtime = 'edge' or 'nodejs' (conditional or static)
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

// Also update lib/db.ts and lib/prisma.ts contents based on the target runtime
const dbFile = path.join(__dirname, '..', 'lib', 'db.ts');
const prismaFile = path.join(__dirname, '..', 'lib', 'prisma.ts');

if (target === 'edge') {
  console.log(`Writing edge-specific code (Neon Driver Adapter) to ${dbFile}...`);
  const edgeDbContent = `import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "../app/generated/prisma/edge";

function createPrismaClient() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  const adapter = new PrismaNeon({ connectionString: url });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
`;
  fs.writeFileSync(dbFile, edgeDbContent, 'utf8');

  console.log(`Writing edge-specific code (Neon Driver Adapter) to ${prismaFile}...`);
  const edgePrismaContent = `import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "../app/generated/prisma/edge";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function getPrismaInstance() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  const adapter = new PrismaNeon({ connectionString: url });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma || getPrismaInstance();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
export default prisma;
`;
  fs.writeFileSync(prismaFile, edgePrismaContent, 'utf8');
} else {
  console.log(`Writing nodejs/development code to ${dbFile}...`);
  const nodeDbContent = `import { PrismaClient } from "../app/generated/prisma";

function createPrismaClient() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }

  // Local dev: use pg adapter (Node.js only)
  const pgName = "pg";
  const pgAdapterName = "@prisma/adapter-pg";
  const pg = typeof require !== "undefined" ? require(pgName) : null;
  const { PrismaPg } = typeof require !== "undefined" ? require(pgAdapterName) : { PrismaPg: null };
  if (!pg || !PrismaPg) {
    throw new Error("Local pg adapter is required in development environment");
  }
  const pool = new pg.Pool({ connectionString: url });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
`;
  fs.writeFileSync(dbFile, nodeDbContent, 'utf8');

  console.log(`Writing nodejs/development code to ${prismaFile}...`);
  const nodePrismaContent = `import { PrismaClient } from "../app/generated/prisma";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function getPrismaInstance() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }

  // Local dev: use pg adapter (Node.js only)
  const pgName = "pg";
  const pgAdapterName = "@prisma/adapter-pg";
  const pg = typeof require !== "undefined" ? require(pgName) : null;
  const { PrismaPg } = typeof require !== "undefined" ? require(pgAdapterName) : { PrismaPg: null };
  if (!pg || !PrismaPg) {
    throw new Error("Local pg adapter is required in development environment");
  }
  const pool = new pg.Pool({ connectionString: url });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma || getPrismaInstance();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
export default prisma;
`;
  fs.writeFileSync(prismaFile, nodePrismaContent, 'utf8');
}

// Update all alias imports (@/app/generated/prisma) in app, lib, components, types, services
const rootDir = path.join(__dirname, '..');
const dirsToScan = ['app', 'lib', 'components', 'types', 'services'];

dirsToScan.forEach(dirName => {
  const dirPath = path.join(rootDir, dirName);
  if (fs.existsSync(dirPath)) {
    walkDir(dirPath, (filePath) => {
      const ext = path.extname(filePath);
      if (ext === '.tsx' || ext === '.ts') {
        let content = fs.readFileSync(filePath, 'utf8');
        const pathPattern = /@\/app\/generated\/prisma(?:\/edge)?/g;
        if (pathPattern.test(content)) {
          const replacement = `@/app/generated/prisma${target === 'edge' ? '/edge' : ''}`;
          const updated = content.replace(pathPattern, replacement);
          fs.writeFileSync(filePath, updated, 'utf8');
        }
      }
    });
  }
});

console.log(`Successfully updated all generated Prisma Client imports to target '${target}'`);
