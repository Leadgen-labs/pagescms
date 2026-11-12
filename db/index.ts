import "./envConfig";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { getHetznerPostgresCredentials } from "./hetzner-postgres";

declare global {
  // eslint-disable-next-line no-var
  var __pagesCmsPostgresClient: ReturnType<typeof postgres> | undefined;
}

function createClient() {
  const max = parseInt(process.env.POSTGRES_MAX_CONNECTIONS || "5", 10);
  const credentials = getHetznerPostgresCredentials();
  return credentials
    ? postgres({ ...credentials, max, connect_timeout: 10 })
    : postgres(process.env.DATABASE_URL!, { max });
}

const client = globalThis.__pagesCmsPostgresClient ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__pagesCmsPostgresClient = client;
}

export const db = drizzle(client, { schema });
