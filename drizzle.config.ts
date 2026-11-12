import "./db/envConfig";
import { defineConfig } from "drizzle-kit";
import { getHetznerPostgresCredentials } from "./db/hetzner-postgres";

export default defineConfig({
  dialect: "postgresql",
  schema: "./db/schema.ts",
  out: "./db/migrations",
  strict: true,
  verbose: true,
  dbCredentials: getHetznerPostgresCredentials() ?? { url: process.env.DATABASE_URL! },
});
