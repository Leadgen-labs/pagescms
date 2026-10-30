"use client";

// Společné kousky polí seo-title a seo-description (úpravy agentury webs):
// výchozí hodnota z jiného pole, přípona titulku z Nastavení webu, šířka textu
// v pixelech jako v Googlu a živý náhled výsledku vyhledávání.

import { UiText } from "@/components/ui-text";
import { ui, useUi } from "@/components/use-ui";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useWatch } from "react-hook-form";
import { useParams } from "next/navigation";
import slugify from "slugify";
import { useConfig } from "@/contexts/config-context";
import { cn } from "@/lib/utils";

/** Limity Google (desktop): titulek 600 px při 20 px, popis 920 px při 14 px. */
export const SERP = { titlePx: 600, titleSize: 20, descriptionPx: 920, descriptionSize: 14 } as const;

/** Pod touhle délkou Google popis většinou nahradí úryvkem z textu. */
export const DESCRIPTION_MIN = 70;

export type SeoOptions = {
  /** Sourozenecké pole, jehož hodnota je výchozí (nadpis, perex). */
  fallback?: string;
  /** Přidávat k výchozímu titulku příponu brandu z Nastavení webu. */
  suffix?: boolean;
  /** Název webu: výchozí přípona " | <název>". */
  site_name?: string;
  /** Soubor a položka .pages.yml s nastavením přípony ({ brand, suffix }). */
  settings_file?: string;
  settings_entry?: string;
  /** Náhled v Googlu (pole seo-description). */
  preview?: {
    /** Pole SEO titulku a jeho výchozí pole. */
    title?: string;
    title_fallback?: string;
    /** Adresa webu (https://firma.cz) a začátek cesty (/blog/). */
    url?: string;
    path?: string;
    /** Sourozenecké pole s celou cestou stránky (místo adresy z názvu souboru). */
    path_field?: string;
  };
};

/** Cesta sourozeneckého pole ve formuláři (stejná úroveň jako `name`). */
export function siblingName(name: string, sibling: string): string {
  return name.includes(".") ? name.replace(/\.[^.]+$/, `.${sibling}`) : sibling;
}

export function useSibling(name: string, sibling?: string): string {
  const value = useWatch({ name: sibling ? siblingName(name, sibling) : "__webs_none__" });
  return sibling && typeof value === "string" ? value : "";
}

const plain = (text: string) =>
  text
    .replace(/<[^>]+>/g, " ")
    .replace(/[*_`#>[\]]/g, "")
    .replace(/\s+/g, " ")
    .trim();

/** Stejné pravidlo jako titleSuffix() v @webs/kit/config. */
function normalizeSuffix(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  return /^[|\-–·:]/.test(trimmed) ? ` ${trimmed}` : ` | ${trimmed}`;
}

const settingsCache = new Map<string, Promise<Record<string, unknown> | null>>();

/** Přípona titulku podle Nastavení webu (brand vypnutý = žádná). */
export function useTitleSuffix(options: SeoOptions | undefined): string {
  const { config } = useConfig();
  const fallback = options?.site_name ? ` | ${options.site_name}` : "";
  const [suffix, setSuffix] = useState(fallback);
  const file = options?.settings_file;
  const entry = options?.settings_entry;

  useEffect(() => {
    if (!options?.suffix || !config || !file || !entry) return;
    const url = `/api/${config.owner}/${config.repo}/${encodeURIComponent(config.branch)}/entries/${encodeURIComponent(file)}?name=${encodeURIComponent(entry)}`;
    if (!settingsCache.has(url)) {
      settingsCache.set(
        url,
        fetch(url)
          .then((res) => (res.ok ? res.json() : null))
          .then((json) => (json?.data?.contentObject as Record<string, unknown>) ?? null)
          .catch(() => null),
      );
    }
    let alive = true;
    settingsCache.get(url)!.then((data) => {
      if (!alive || !data) return;
      if (data.brand === false) setSuffix("");
      else if (typeof data.suffix === "string" && data.suffix.trim()) setSuffix(normalizeSuffix(data.suffix));
    });
    return () => {
      alive = false;
    };
  }, [config, entry, file, options?.suffix]);

  return options?.suffix ? suffix : "";
}

/** Celý titulek: vlastní, jinak výchozí pole s příponou (bez zdvojení přípony). */
export function effectiveTitle(own: string, fallback: string, suffix: string): { text: string; isDefault: boolean } {
  if (own.trim()) return { text: own.trim(), isDefault: false };
  const base = plain(fallback);
  if (!base) return { text: "", isDefault: true };
  if (!suffix || base.endsWith(suffix.trim())) return { text: base, isDefault: true };
  return { text: `${base}${suffix}`, isDefault: true };
}

/** true až v prohlížeči: šířku textu měří canvas, na serveru by se lišila (hydratace). */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

let canvas: HTMLCanvasElement | null = null;

/** Šířka textu v px písmem Arial (Google ve výsledcích). */
export function textWidth(text: string, sizePx: number): number {
  if (typeof document === "undefined") return text.length * sizePx * 0.5;
  canvas ??= document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return text.length * sizePx * 0.5;
  ctx.font = `${sizePx}px Arial, sans-serif`;
  return ctx.measureText(text).width;
}

/** Zkrátí text na šířku se „…“, jako Google. */
export function truncateToWidth(text: string, sizePx: number, maxPx: number): { text: string; truncated: boolean } {
  if (textWidth(text, sizePx) <= maxPx) return { text, truncated: false };
  const ell = textWidth(" …", sizePx);
  let out = "";
  for (const ch of text) {
    if (textWidth(out + ch, sizePx) + ell > maxPx) break;
    out += ch;
  }
  return { text: `${out.replace(/\s+\S*$/, "") || out} …`, truncated: true };
}

export function Counter({ tone, children }: { tone: "ok" | "warn" | "muted"; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "mt-1.5 flex flex-wrap items-center gap-x-2 text-xs",
        tone === "ok" && "text-emerald-700 dark:text-emerald-400",
        tone === "warn" && "text-amber-700 dark:text-amber-400",
        tone === "muted" && "text-muted-foreground",
      )}
      aria-live="polite"
    >
      {children}
    </div>
  );
}

/** Adresa článku z názvu souboru (úprava) nebo z nadpisu (nový článek). */
function useEntrySlug(titleFallback: string): string {
  const params = useParams<{ path?: string }>();
  return useMemo(() => {
    const raw = params?.path ? decodeURIComponent(String(params.path)) : "";
    const file = raw.split("/").pop()?.replace(/\.[a-z0-9]+$/i, "");
    if (file) return file;
    return titleFallback ? slugify(plain(titleFallback), { lower: true, strict: true }) : "";
  }, [params?.path, titleFallback]);
}

/** Náhled výsledku v Googlu (desktop). */
export function GooglePreview({
  title,
  description,
  url,
  siteName,
}: {
  title: string;
  description: string;
  url: string;
  siteName: string;
}) {
  const ui = useUi();
  const t = truncateToWidth(title || "Titulek stránky", SERP.titleSize, SERP.titlePx);
  const d = truncateToWidth(description || "Google sem doplní úryvek z textu stránky.", SERP.descriptionSize, SERP.descriptionPx);
  let host = url;
  let crumbs: string[] = [];
  try {
    const parsed = new URL(url);
    host = parsed.hostname;
    crumbs = parsed.pathname.split("/").filter(Boolean);
  } catch {}
  const name = siteName || host;

  return (
    <div className="mt-3 rounded-md border bg-white p-4 text-left dark:bg-white" aria-label={ui("Náhled ve výsledcích Googlu")}>
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-500"><UiText text={"Náhled v Googlu"}/></div>
      <div className="flex items-center gap-3">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-neutral-100 text-xs font-semibold text-neutral-600">
          {name.slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0 leading-tight" style={{ fontFamily: "Arial, sans-serif" }}>
          <div className="truncate text-sm text-neutral-900">{name}</div>
          <div className="truncate text-xs text-neutral-600">
            {host}
            {crumbs.length ? ` › ${crumbs.join(" › ")}` : ""}
          </div>
        </div>
      </div>
      <div
        className={cn("mt-1.5 text-[20px] leading-[26px] text-[#1a0dab]", !title && "text-neutral-400")}
        style={{ fontFamily: "Arial, sans-serif" }}
      >
        {t.text}
      </div>
      <div
        className={cn("mt-1 text-sm leading-[22px] text-[#474747] line-clamp-2", !description && "italic text-neutral-400")}
        style={{ fontFamily: "Arial, sans-serif" }}
      >
        {d.text}
      </div>
    </div>
  );
}

/** Data pro náhled: titulek, popis a adresa podle sourozeneckých polí. */
export function usePreview(name: string, options: SeoOptions | undefined, description: string) {
  const preview = options?.preview;
  const ownTitle = useSibling(name, preview?.title);
  const titleFallback = useSibling(name, preview?.title_fallback);
  const pagePath = useSibling(name, preview?.path_field);
  const suffix = useTitleSuffix(options);
  const slug = useEntrySlug(titleFallback);
  if (!preview) return null;
  const title = effectiveTitle(ownTitle, titleFallback, suffix).text;
  const base = (preview.url ?? "").replace(/\/+$/, "");
  const path = preview.path_field ? pagePath || "/" : `${preview.path ?? "/"}${slug ? `${slug}/` : ""}`;
  return { title, description, url: `${base}${path.startsWith("/") ? path : `/${path}`}`, siteName: options?.site_name ?? "" };
}
