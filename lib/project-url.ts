/** Public URL aliases only. Repository identity and authorization are unchanged. */
const OWNER = "leadgen-labs";
const PREFIX = "webs-obsah-";
const RESERVED = new Set(["api", "admin", "auth", "sign-in", "settings", "_next", OWNER]);
const SECTIONS = new Set(["prehled", "pristupy", "collection", "file", "media", "configuration", "actions", "cache", "submissions", "transfer"]);
const validSlug = (slug: string) => /^[a-z0-9][a-z0-9-]{1,40}$/.test(slug) && !RESERVED.has(slug);

export function publicProjectPath(pathname: string): string {
  const match = pathname.match(/^\/leadgen-labs\/webs-obsah-([a-z0-9-]+)\/main(?:\/(.*))?$/i);
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
  return "/" + OWNER + "/" + PREFIX + match[1] + "/main/" + section;
}
