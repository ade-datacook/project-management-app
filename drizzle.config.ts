import "dotenv/config";
import { defineConfig } from "drizzle-kit";

// Connection string check removed for SQLite local dev

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle",
  dialect: "mysql",
  dbCredentials: {
    url: process.env.DATABASE_URL || "",
  },
});
