import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

declare global {
  // eslint-disable-next-line no-var
  var __dbClient: ReturnType<typeof postgres> | undefined;
}

const connectionString = process.env.DATABASE_URL;

function buildClient() {
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Add it to .env.local before using the database.",
    );
  }
  return postgres(connectionString, {
    prepare: false,
    max: 10,
    idle_timeout: 20,
  });
}

const client = globalThis.__dbClient ?? buildClient();
if (process.env.NODE_ENV !== "production") {
  globalThis.__dbClient = client;
}

export const db = drizzle(client, { schema, casing: "snake_case" });
export type DB = typeof db;
