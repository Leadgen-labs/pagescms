const articlePathPattern = /^blog\/([a-z]{2}(?:-[a-z]{2})?)\/[^/\\\p{Cc}]+\.md$/u;

export function editorialCollection(repo: string, branch: string, name: string, path?: string) {
  return repo.toLowerCase().startsWith("webs-obsah-")
    && branch === "main"
    && /^blog-[a-z]{2}(?:-[a-z]{2})?$/.test(name)
    && (!path || editorialArticlePath(path, name));
}

export function editorialArticlePath(path: string, name?: string) {
  const locale = path.match(articlePathPattern)?.[1];
  return Boolean(locale && (!name || name === `blog-${locale}`));
}

export const articleRevisionPattern = /^[0-9a-f]{32}$/;

export type ArticleReceipt = {
  state: "pending" | "draft" | "scheduled" | "live" | "archived";
  publishedAt: string | null;
  previewUrl: string | null;
  publicUrl: string | null;
};

const pragueDateFormat = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Europe/Prague",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export function pragueDateTime(date = new Date()) {
  return pragueDateFormat.format(date).replace(" ", "T");
}
