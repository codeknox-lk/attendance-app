import { defineConfig } from "@prisma/config";

export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL || "postgresql://neondb_owner:npg_q0lpVnhcRMy5@ep-lively-sunset-ay1bwio6.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require",
  },
});
