import { PrismaClient } from "../app/generated/prisma";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient;
};

function getPrismaInstance() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }

  const isAccelerate = url.startsWith("prisma://") || url.startsWith("prisma+postgres://");

  if (isAccelerate) {
    return new PrismaClient({
      accelerateUrl: url,
    });
  } else {
    // Use pg adapter for local PostgreSQL database in Node.js development
    // Use dynamic variables to prevent Next.js bundler from statically analyzing and bundling node-only packages on Edge build
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
}

export const prisma = globalForPrisma.prisma || getPrismaInstance();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
export default prisma;
