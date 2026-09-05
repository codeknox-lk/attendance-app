import { defineConfig } from "@prisma/config";

export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL || "postgresql://neondb_owner:npg_ZPbqFIE2WYk7@ep-weathered-mode-azl26d7m-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require",
  },
});
