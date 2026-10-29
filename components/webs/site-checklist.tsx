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
export function SiteLinks({ links, className }: { links: SiteOverviewData["links"]; className?: string }) {
  const items: [string, string | null | undefined][] = [
    ["Web", links.site],
    ["Náhled", links.preview],
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
export const formatDate = (value: string | null) =>
  value ? new Date(value.includes("T") ? value : `${value.replace(" ", "T")}Z`).toLocaleDateString("cs-CZ") : "-";

const icon = { done: CheckCircle2, todo: Circle, na: MinusCircle };
const tone = { done: "text-emerald-600", todo: "text-amber-600", na: "text-muted-foreground" };

/** Kontrolní seznam „co je hotové a co ne“. */
export function SiteChecklist({ checks, compact = false }: { checks: SiteCheck[]; compact?: boolean }) {
  return (
    <ul className={cn("grid", compact ? "gap-1 text-xs" : "gap-2 text-sm")}>
      {checks.map((check) => {
        const Icon = icon[check.state];
        return (
          <li key={check.id} className="flex items-start gap-2">
            <Icon aria-hidden className={cn("mt-0.5 shrink-0", compact ? "size-3.5" : "size-4", tone[check.state])} />
            <span>
              <span className="sr-only">{check.state === "done" ? "Hotovo: " : check.state === "todo" ? "Chybí: " : "Netýká se: "}</span>
              {check.label}
              {check.detail && <span className="text-muted-foreground"> ({check.detail})</span>}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
