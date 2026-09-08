import { Pool } from "pg";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://neondb_owner:npg_ZPbqFIE2WYk7@ep-weathered-mode-azl26d7m-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";

const globalForDb = globalThis as unknown as {
  prisma?: PrismaClient;
  pgPool?: Pool;
  prismaAdapter?: PrismaPg;
};

const pool =
  globalForDb.pgPool ??
  new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 20000,
  });


if (process.env.NODE_ENV !== "production") {
  globalForDb.pgPool = pool;
}

const adapter = globalForDb.prismaAdapter ?? new PrismaPg(pool);
if (process.env.NODE_ENV !== "production") {
  globalForDb.prismaAdapter = adapter;
}

export const db =
  globalForDb.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.prisma = db;
}

