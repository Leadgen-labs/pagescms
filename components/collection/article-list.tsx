"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  CircleDashed,
  Ellipsis,
  FileText,
  Folder,
  Plus,
  RefreshCw,
  Search,
} from "lucide-react";
import { useLanguage } from "@/contexts/language-context";
import { FileOptions } from "@/components/file/file-options";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { pragueDateTime } from "@/lib/editorial-article";
import { ErrorText } from "@/components/error-text";
import {
  selectArticleRows,
  type ArticleCollectionEntry,
  type ArticleFilter,
  type ArticleSort,
  type ArticleStatus,
} from "./article-list-model";

const PAGE_SIZE = 25;
const FILTERS: ArticleFilter[] = ["all", "draft", "scheduled", "published"];
const STATUS_STYLE = {
  draft: { icon: CircleDashed, classes: "bg-muted text-foreground" },
  scheduled: { icon: CalendarClock, classes: "bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-200" },
  published: { icon: CircleCheck, classes: "bg-emerald-50 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200" },
} satisfies Record<ArticleStatus, { icon: typeof CircleDashed; classes: string }>;

type ArticleListProps = {
  name: string;
  entries: ArticleCollectionEntry[];
  editHref: (path: string) => string;
  addHref: string;
  onFolder: (path: string) => void;
  onDelete: (path: string) => void;
  onRename: (path: string, newPath: string) => void;
  canCreate: boolean;
  canDelete: boolean;
  canRename: boolean;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  onRefresh: () => void;
};

export function ArticleList({
  name, entries, editHref, addHref, onFolder, onDelete, onRename, canCreate, canDelete,
  canRename, loading, refreshing, error, onRefresh,
}: ArticleListProps) {
  const { language, t } = useLanguage();
  const [filter, setFilter] = useState<ArticleFilter>("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<ArticleSort>("newest");
  const [page, setPage] = useState(0);
  const [now, setNow] = useState(pragueDateTime);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(pragueDateTime()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const { rows, counts } = useMemo(
    () => selectArticleRows(entries, { now, filter, query, sort, locale: language }),
    [entries, now, filter, query, sort, language],
  );
  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat(language === "cs" ? "cs-CZ" : "en-GB", {
      dateStyle: "medium", timeStyle: "short", timeZone: "UTC",
    }),
    [language],
  );

  const filterLabels = {
    all: t("Všechny", "All"),
    draft: t("Koncepty", "Drafts"),
    scheduled: t("Naplánované", "Scheduled"),
    published: t("K vydání", "Set to publish"),
  };
  const statusLabels = {
    draft: t("Koncept", "Draft"),
    scheduled: t("Naplánováno", "Scheduled"),
    published: t("Zveřejnění nastaveno", "Set to publish"),
  };
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const firstRow = currentPage * PAGE_SIZE;
  const shown = rows.slice(firstRow, firstRow + PAGE_SIZE);
  const hasFilters = filter !== "all" || !!query.trim();
  const clearFilters = () => {
    setFilter("all");
    setQuery("");
    setPage(0);
  };
  const newArticle = t("Nový článek", "New article");
  const refresh = t("Obnovit seznam", "Refresh list");
  const search = t("Hledat články", "Search articles");
  const sortLabel = t("Řazení článků", "Sort articles");

  return (
    <section className="mx-auto max-w-6xl space-y-5" aria-labelledby="articles-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 id="articles-heading" className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {t("Články", "Articles")}
        </h1>
        {canCreate && (
          <Button asChild className="h-11">
            <Link href={addHref}><Plus aria-hidden />{newArticle}</Link>
          </Button>
        )}
      </div>

      <div className="@container/list overflow-hidden rounded-xl border bg-card text-card-foreground">
        <div className="space-y-3 border-b p-3 sm:p-4">
          <div className="flex flex-wrap gap-1.5" role="group" aria-label={t("Stav článku", "Article status")}>
            {FILTERS.map((value) => (
              <Button
                key={value}
                type="button"
                variant={value === filter ? "secondary" : "ghost"}
                aria-pressed={value === filter}
                onClick={() => { setFilter(value); setPage(0); }}
                className={cn(
                  "h-10 gap-1.5 px-2.5",
                  value === filter && "bg-primary/10 text-primary hover:bg-primary/15 dark:bg-primary/15",
                )}
              >
                {filterLabels[value]}
                {!loading && <span className="tabular-nums opacity-80">{counts[value]}</span>}
              </Button>
            ))}
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 @min-[560px]/list:flex @min-[560px]/list:items-center">
            <div className="relative col-span-2 min-w-0 @min-[560px]/list:mr-auto @min-[560px]/list:w-80">
              <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                value={query}
                onChange={(event) => { setQuery(event.target.value); setPage(0); }}
                placeholder={search}
                aria-label={search}
                className="h-11 pl-9"
              />
            </div>
            <select
              value={sort}
              onChange={(event) => { setSort(event.target.value as ArticleSort); setPage(0); }}
              aria-label={sortLabel}
              className="h-11 min-w-0 rounded-md border bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <option value="newest">{t("Nejnovější vydání", "Newest publication")}</option>
              <option value="oldest">{t("Nejstarší vydání", "Oldest publication")}</option>
              <option value="title-asc">{t("Nadpis od A do Z", "Title from A to Z")}</option>
              <option value="title-desc">{t("Nadpis od Z do A", "Title from Z to A")}</option>
            </select>
            <Button type="button" variant="outline" size="icon" className="size-11"
              onClick={onRefresh} disabled={refreshing} aria-label={refresh} title={refresh}>
              <RefreshCw aria-hidden className={cn(refreshing && "animate-spin motion-reduce:animate-none")} />
            </Button>
          </div>
        </div>

        {error && (
          <div role="alert" className="flex flex-wrap items-center justify-between gap-3 border-b border-destructive/30 bg-destructive/5 p-4">
            <div>
              <p className="text-sm font-medium">{t("Seznam se nepodařilo načíst", "Could not load the list")}</p>
              <p className="mt-1 text-sm text-muted-foreground wrap-anywhere"><ErrorText text={error} /></p>
            </div>
            <Button type="button" variant="outline" disabled={refreshing} onClick={onRefresh}>{t("Zkusit znovu", "Try again")}</Button>
          </div>
        )}

        {loading ? (
          <div className="divide-y" role="status">
            <span className="sr-only">{t("Načítáme články…", "Loading articles…")}</span>
            {[0, 1, 2, 3, 4].map((index) => (
              <div key={index} className="flex h-16 items-center gap-3 px-4" aria-hidden>
                <Skeleton className="size-8 shrink-0" />
                <Skeleton className="h-4 w-1/2 max-w-80" />
              </div>
            ))}
          </div>
        ) : shown.length ? (
          <Table className="table-fixed">
            <TableHeader className="bg-muted/45">
              <TableRow>
                <TableHead scope="col" className="px-4">{t("Nadpis", "Title")}</TableHead>
                <TableHead scope="col" className="hidden w-44 @min-[680px]/list:table-cell">{t("Stav v redakci", "Editorial status")}</TableHead>
                <TableHead scope="col" className="hidden w-40 @min-[680px]/list:table-cell">{t("Datum vydání", "Publication date")}</TableHead>
                <TableHead scope="col" className="w-15 text-right"><span className="sr-only">{t("Akce", "Actions")}</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shown.map((row) => {
                if (row.type === "dir") {
                  return (
                    <TableRow key={row.path}>
                      <TableCell colSpan={4} className="px-4 py-2">
                        <Button type="button" variant="ghost" className="h-11 max-w-full justify-start px-2" onClick={() => onFolder(row.path)}>
                          <Folder aria-hidden className="text-muted-foreground" /><span className="truncate">{row.title}</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                }
                const { icon: StatusIcon, classes } = STATUS_STYLE[row.status];
                const status = (
                  <Badge className={cn("px-2 py-1", classes)}>
                    <StatusIcon aria-hidden />{statusLabels[row.status]}
                  </Badge>
                );
                const date = row.publishedAt
                  ? <time dateTime={row.publishedAt}>{dateFormatter.format(new Date(row.publishedAt + "Z"))}</time>
                  : null;
                return (
                  <TableRow key={row.path}>
                    <TableCell className="px-4 py-2 whitespace-normal">
                      <div className="flex items-start gap-3">
                        <span className="mt-1 hidden size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground lg:flex" aria-hidden>
                          <FileText className="size-4" />
                        </span>
                        <div className="min-w-0">
                          <Link href={editHref(row.path)} className="flex min-h-11 items-center rounded-sm py-1 font-medium wrap-anywhere hover:text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                            {row.title}
                          </Link>
                          <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground @min-[680px]/list:hidden">
                            {status}{date}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden @min-[680px]/list:table-cell">{status}</TableCell>
                    <TableCell className="hidden text-muted-foreground @min-[680px]/list:table-cell">{date ?? "—"}</TableCell>
                    <TableCell className="pr-3 text-right">
                      {row.sha && (
                        <FileOptions type="collection" name={name} path={row.path} sha={row.sha}
                          canDelete={canDelete} canRename={canRename} onDelete={onDelete} onRename={onRename}>
                          <Button type="button" variant="ghost" size="icon" className="size-11" aria-label={t(`Akce pro článek ${row.title}`, `Actions for ${row.title}`)}>
                            <Ellipsis aria-hidden />
                          </Button>
                        </FileOptions>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : !error && (
          <div className="flex flex-col items-center gap-2 p-8 text-center sm:p-12">
            <FileText aria-hidden className="mb-1 size-6 text-muted-foreground" />
            <h2 className="font-semibold">{hasFilters ? t("Žádné odpovídající články", "No matching articles") : t("Zatím žádné články", "No articles yet")}</h2>
            {hasFilters && (
              <Button type="button" variant="outline" className="mt-2" onClick={clearFilters}>{t("Zrušit filtry", "Clear filters")}</Button>
            )}
          </div>
        )}

        {!loading && !!shown.length && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-2">
            <p className="text-sm tabular-nums text-muted-foreground" role="status">
              {t(`${firstRow + 1}–${firstRow + shown.length} z ${rows.length}`, `${firstRow + 1}–${firstRow + shown.length} of ${rows.length}`)}
            </p>
            {pageCount > 1 && (
              <nav className="flex items-center gap-1" aria-label={t("Stránkování článků", "Article pagination")}>
                <Button type="button" variant="outline" size="icon" className="size-10" disabled={currentPage === 0}
                  aria-label={t("Předchozí stránka", "Previous page")} onClick={() => setPage(currentPage - 1)}>
                  <ChevronLeft aria-hidden />
                </Button>
                <Button type="button" variant="outline" size="icon" className="size-10" disabled={currentPage === pageCount - 1}
                  aria-label={t("Další stránka", "Next page")} onClick={() => setPage(currentPage + 1)}>
                  <ChevronRight aria-hidden />
                </Button>
              </nav>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
