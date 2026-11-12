import { execFileSync } from "node:child_process";

// The legacy Neon connection is read-only. A preview can migrate only when
// it has its own Hetzner configuration. Production still migrates after build.
if (process.env.VERCEL_ENV === "preview" &&
    !process.env.PAGES_CMS_HETZNER_DATABASE_URL && !process.env.PAGES_CMS_HETZNER_TLS) {
  console.log("Skipping database migrations in a preview without a Hetzner database.");
} else {
  execFileSync(process.execPath, [process.env.npm_execpath, "run", "db:migrate"], { stdio: "inherit" });
}
