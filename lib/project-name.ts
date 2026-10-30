/** Display labels only; repository identity and access checks use the original name. */
export function projectName(repo: string, config?: Record<string, any> | null): string {
  if (!repo.startsWith("webs-obsah-")) return repo;
  const hostname = (value: unknown): string | undefined => {
    if (typeof value !== "string") return;
    try {
      const url = new URL(value);
      if (["https:", "http:"].includes(url.protocol)) return url.hostname.replace(/^www\./, "");
    } catch { /* Missing or invalid URL: keep the fallback label. */ }
  };
  const fromFields = (items: any[]): string | undefined => {
    for (const item of items) {
      const domain = hostname(item?.options?.preview?.url);
      if (domain) return domain;
      const nested = fromFields(Array.isArray(item?.fields) ? item.fields : []);
      if (nested) return nested;
      const grouped = fromFields(Array.isArray(item?.items) ? item.items : []);
      if (grouped) return grouped;
    }
  };
  return hostname(config?.site?.url) ?? fromFields(Array.isArray(config?.content) ? config.content : []) ?? repo.slice("webs-obsah-".length);
}
