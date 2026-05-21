import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

declare global {
  var __db: DrizzleDB | undefined;
}

type DrizzleDB = ReturnType<typeof drizzle<typeof schema>>;

function createDb(): DrizzleDB {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set. Add it to .env.local before using the database.");
  const client = postgres(url, { prepare: false, max: 1 });
  return drizzle(client, { schema, casing: "snake_case" });
}

// Lazy singleton: module loads without throwing; DB only connects on first query.
const handler: ProxyHandler<object> = {
  get(_, prop, receiver) {
    // Reuse a single connection across hot-reloads / serverless invocations.
    global.__db ??= createDb();
    return Reflect.get(global.__db, prop, receiver);
  },
};

export const db = new Proxy({}, handler) as DrizzleDB;
export type DB = DrizzleDB;
