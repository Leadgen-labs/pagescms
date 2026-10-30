import type { SiteAlert, SiteOverviewData } from "@/components/webs/site-checklist";

export type WebsiteFilter = "all" | "attention" | "live" | "draft";
export type AlertGroup = { slug: string; name: string; level: "error" | "warning"; alerts: SiteAlert[] };

export function groupWebsiteAlerts(alerts: SiteAlert[]): AlertGroup[] {
  const groups = new Map<string, AlertGroup>();
  for (const alert of alerts) {
    const group = groups.get(alert.slug) ?? { slug: alert.slug, name: alert.name, level: alert.level, alerts: [] };
    if (alert.level === "error") group.level = "error";
    if (!group.alerts.some(item => item.text === alert.text)) group.alerts.push(alert);
    groups.set(alert.slug, group);
  }
  return [...groups.values()].sort((a,b) => Number(b.level === "error") - Number(a.level === "error") || a.name.localeCompare(b.name));
}

export function dashboardSummary(sites: SiteOverviewData[], alerts: SiteAlert[]) {
  const spend = sites.map(site => site.aiSpendMonthUsd).filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  return {
    total: sites.length,
    live: sites.filter(site => site.status === "live").length,
    draft: sites.filter(site => site.status === "draft").length,
    attention: new Set(alerts.map(alert => alert.slug)).size,
    enquiries30: sites.reduce((sum,site) => sum + site.leads.last30,0),
    enquiries7: sites.reduce((sum,site) => sum + site.leads.last7,0),
    failed30: sites.reduce((sum,site) => sum + site.leads.failed30,0),
    spend: spend.length > 0 && spend.length === sites.length ? spend.reduce((sum,value) => sum + value,0) : null,
  };
}

const searchable = (value: string) => value.normalize("NFD").replace(/\p{Diacritic}/gu,"").toLocaleLowerCase();

export function filterDashboardSites(sites: SiteOverviewData[], alerts: SiteAlert[], query: string, filter: WebsiteFilter, language: "cs" | "en") {
  const attention = new Set(alerts.map(alert => alert.slug));
  const errors = new Set(alerts.filter(alert => alert.level === "error").map(alert => alert.slug));
  const search = searchable(query.trim());
  return sites.filter(site =>
    (!search || searchable([site.name,site.domain ?? "",site.slug].join(" ")).includes(search)) &&
    (filter === "all" || (filter === "attention" ? attention.has(site.slug) : site.status === filter)),
  ).sort((a,b) => Number(errors.has(b.slug)) - Number(errors.has(a.slug)) || Number(attention.has(b.slug)) - Number(attention.has(a.slug)) || a.name.localeCompare(b.name,language));
}
