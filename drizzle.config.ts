import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_DIRECT_URL ?? process.env.DATABASE_URL ?? "",
  },
  schemaFilter: ["public"],
  casing: "snake_case",
  verbose: true,
  strict: true,
});
