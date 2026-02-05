import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Load .env.local first (has priority), then .env as fallback
config({ path: ".env.local" });
config({ path: ".env" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL!,
  },
  migrations: {
    path: "prisma/migrations",
  },
});
