import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { getEnv } from "@/lib/env";
import * as schema from "./schema";

function createDb() {
  const client = postgres(getEnv().DATABASE_URL, { max: 10 });
  return drizzle({ client, schema, casing: "snake_case" });
}

let db: ReturnType<typeof createDb> | undefined;

export function getDb() {
  db ??= createDb();
  return db;
}
