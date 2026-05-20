import "dotenv/config"; 
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // ใช้ process.env และใส่ค่า String ปลอมสำรองไว้ เพื่อไม่ให้ระบบพังตอน Build บน Cloudflare
    url: process.env.DATABASE_URL || "postgresql://mock:mock@localhost:5432/mock",
  },
});