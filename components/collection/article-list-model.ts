export type ArticleCollectionEntry = {
  type: "file" | "dir";
  name: string;
  path: string;
  sha?: string;
  fields?: Record<string, unknown>;
};

export type ArticleStatus = "draft" | "scheduled" | "published";
export type ArticleFilter = "all" | ArticleStatus;
export type ArticleSort = "newest" | "oldest" | "title-asc" | "title-desc";

function readArticle(entry: ArticleCollectionEntry, now: string) {
  const title = entry.fields?.title;
  const value = entry.fields?.published_at;
  // The collection API normalizes dates to a local Prague time without an offset.
  const publishedAt = typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value + "Z"))
    ? value : "";
  const status: ArticleStatus = entry.fields?.status !== "published"
    ? "draft"
    : publishedAt > now ? "scheduled" : "published";

  return {
    ...entry,
    title: typeof title === "string" && title.trim() ? title.trim() : entry.name,
    publishedAt,
    status,
  };
}

function searchText(value: string, locale: string) {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase(locale);
}

export function selectArticleRows(
  entries: ArticleCollectionEntry[],
  { now, filter, query, sort, locale }: {
    now: string;
    filter: ArticleFilter;
    query: string;
    sort: ArticleSort;
    locale: string;
  },
) {
  const needle = searchText(query.trim(), locale);
  const collator = new Intl.Collator(locale, { sensitivity: "base", numeric: true });
  const rows = entries.map((entry) => readArticle(entry, now));
  const counts = { all: 0, draft: 0, scheduled: 0, published: 0 };

  for (const row of rows) {
    if (row.type === "file") {
      counts.all += 1;
      counts[row.status] += 1;
    }
  }

  const visible = rows.filter((row) => (
    (filter === "all" || (row.type === "file" && row.status === filter)) &&
    (!needle || searchText(`${row.title} ${row.name}`, locale).includes(needle))
  ));
  visible.sort((first, second) => {
    if (first.type !== second.type) return first.type === "dir" ? -1 : 1;
    const titleOrder = collator.compare(first.title, second.title);
    if (first.type === "dir" || sort === "title-asc") return titleOrder;
    if (sort === "title-desc") return -titleOrder;
    if (first.publishedAt === second.publishedAt) return titleOrder;
    if (!first.publishedAt || !second.publishedAt) return first.publishedAt ? -1 : 1;
    return sort === "newest"
      ? second.publishedAt.localeCompare(first.publishedAt)
      : first.publishedAt.localeCompare(second.publishedAt);
  });

  return { rows: visible, counts };
}
