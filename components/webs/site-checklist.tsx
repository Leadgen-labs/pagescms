import { ui } from "@/lib/ui-source";
import { CheckCircle2, Circle, MinusCircle } from "lucide-react";
import { cn } from "@/lib/utils";

/** Stav webu z bota (POST /cms/overview). */
export type SiteCheck = { id: string; label: string; state: "done" | "todo" | "na"; detail?: string };
export type SiteOverviewData = {
  slug: string;
  name: string;
  status: string;
  url: string;
  domain: string | null;
  domainActive: boolean;
  reachable: boolean | null;
  links: { site: string; preview: string | null; ga4?: string; gtm?: string; gsc?: string };
  indexable: boolean;
  measurement: { gtm: boolean; gtmOwner: string; ga4: boolean; gsc: boolean; clientAccess: number };
  missing: string[] | null;
  lastDeployAt: string | null;
  openRequest: { state: string; previewUrl: string | null } | null;
  leads: { last7: number; last30: number; failed30: number };
  /** Jen v přehledu pro správce. */
  aiSpendMonthUsd?: number;
  checks: SiteCheck[];
};

export type SiteAlert = { slug: string; name: string; level: "error" | "warning"; text: string };

/** Odkazy webu: web, náhled na Cloudflaru, Google Analytics, Tag Manager, Search Console. */
export function SiteLinks({ links, className, language = "cs" }: { links: SiteOverviewData["links"]; className?: string; language?: "cs" | "en" }) {
  const items: [string, string | null | undefined][] = [
    ["Web", links.site],
    [language === "en" ? ui("Preview") : ui("Náhled"), links.preview],
    ["GA4", links.ga4],
    ["GTM", links.gtm],
    ["Search Console", links.gsc],
  ];
  return (
    <span className={cn("flex flex-wrap gap-x-3 gap-y-1", className)}>
      {items
        .filter((item): item is [string, string] => Boolean(item[1]))
        .map(([label, href]) => (
          <a key={label} className="underline" href={href} target="_blank" rel="noopener noreferrer">
            {label}
          </a>
        ))}
    </span>
  );
}

/** Stav rozpracované úpravy (konverzace bota) pro klienta. */
export const requestLabel: Record<string, string> = {
  collecting: "sbíráme zadání",
  queued: "ve frontě",
  running: "připravuje se",
  preview: "náhled čeká na vaše potvrzení",
  awaiting_admin: "čeká na nás",
  deploying: "nasazuje se",
  failed: "zasekla se, řešíme ji",
};

export const statusLabel: Record<string, string> = { live: "Spuštěný", draft: "Rozpracovaný", paused: "Pozastavený" };

/** Datum z D1 (UTC bez zóny) v češtině. */
export const formatDate = (value: string | null, language: "cs" | "en" = "cs") =>
  value ? new Date(value.includes("T") ? value : `${value.replace(" ", "T")}Z`).toLocaleDateString(language === "en" ? "en-GB" : "cs-CZ", { timeZone: "Europe/Prague" }) : "-";

const icon = { done: CheckCircle2, todo: Circle, na: MinusCircle };
const tone = { done: "text-emerald-600", todo: "text-amber-600", na: "text-muted-foreground" };

/** Kontrolní seznam „co je hotové a co ne“. */
const englishChecks: Record<string, string> = { web: "Website built and approved", data: "All website information completed", domain: "Website running on its own domain", index: "Search engines can crawl the website", gtm: "Traffic measurement (Google Analytics)", gsc: "Google Search Console", access: "Analytics access handed over", forms: "Form enquiries are being delivered" };
export function SiteChecklist({ checks, compact = false, language = "cs" }: { checks: SiteCheck[]; compact?: boolean; language?: "cs" | "en" }) {
  return (
    <ul className={cn("grid", compact ? "gap-1 text-xs" : "gap-2 text-sm")}>
      {checks.map((check) => {
        const Icon = icon[check.state];
        return (
          <li key={check.id} className="flex items-start gap-2">
            <Icon aria-hidden className={cn("mt-0.5 shrink-0", compact ? "size-3.5" : "size-4", tone[check.state])} />
            <span>
              <span className="sr-only">{language === "en" ? ({done:"Done: ",todo:"Missing: ",na:"Not applicable: "}[check.state]) : check.state === "done" ? ui("Hotovo: ") : check.state === "todo" ? ui("Chybí: ") : ui("Netýká se: ")}</span>
              {language === "en" ? englishChecks[check.id] ?? check.label : check.label}
              {check.detail && <span className="text-muted-foreground"> ({language === "en" && check.id === "forms" ? check.detail.replace(/× nedoručeno za 30 dní/, " undelivered in 30 days") : check.detail})</span>}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
