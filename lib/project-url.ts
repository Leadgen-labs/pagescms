import { CONTENT_REPO_PREFIX, LEGACY_CONTENT_OWNER, ORGANIZATION_CONTENT_OWNER } from "@/lib/github-owner-scope";

const RESERVED = new Set(["api", "admin", "auth", "sign-in", "settings", "_next", LEGACY_CONTENT_OWNER, ORGANIZATION_CONTENT_OWNER]);
const SECTIONS = new Set(["prehled", "pristupy", "collection", "file", "media", "configuration", "actions", "cache", "submissions", "transfer"]);
const validSlug = (slug: string) => /^[a-z0-9][a-z0-9-]{1,40}$/.test(slug) && !RESERVED.has(slug);

export function publicProjectPath(pathname: string): string {
  const match = pathname.match(/^\/leadgen-labs(?:-cz)?\/webs-obsah-([a-z0-9-]+)\/main(?:\/(.*))?$/i);
  if (!match || !validSlug(match[1].toLowerCase())) return pathname;
  const slug = match[1].toLowerCase();
  const suffix = (match[2] ?? "").replace(/\/$/, "");
  if (!suffix || suffix === "prehled") return "/" + slug;
  return "/" + slug + "/" + (suffix === "collaborators" ? "pristupy" : suffix);
}

export function internalProjectPath(pathname: string): string {
  const match = pathname.match(/^\/([a-z0-9-]+)(?:\/(.*))?$/);
  if (!match || !validSlug(match[1])) return pathname;
  const suffix = (match[2] ?? "").replace(/\/$/, "");
  if (suffix && !SECTIONS.has(suffix.split("/")[0])) return pathname;
  const section = !suffix || suffix === "prehled" ? "prehled" : suffix === "pristupy" ? "collaborators" : suffix;
  // Nevoláme is still owned by the original account.
  const owner = match[1] === "nevolame" ? LEGACY_CONTENT_OWNER : ORGANIZATION_CONTENT_OWNER;
  return "/" + owner + "/" + CONTENT_REPO_PREFIX + match[1] + "/main/" + section;
}
