"use client";
import { ui, useUi } from "@/components/use-ui";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useConfig } from "@/contexts/config-context";
import { useLanguage } from "@/contexts/language-context";
import { LanguageSwitcher } from "@/components/webs/language-switcher";
import { ManagementGuide } from "@/components/webs/management-guide";
import { Button } from "@/components/ui/button";
import { formatDate, requestLabel, SiteChecklist, SiteLinks, statusLabel, type SiteOverviewData } from "@/components/webs/site-checklist";

const englishStates: Record<string, string> = {live:"Live",draft:"Draft",paused:"Paused",collecting:"collecting requirements",queued:"queued",running:"in progress",preview:"preview awaiting your approval",awaiting_admin:"awaiting our team",deploying:"deploying",failed:"needs attention"};
export function SiteOverview() {
  const ui = useUi();
  const { config } = useConfig();
  const { language, t } = useLanguage();
  const [site, setSite] = useState<SiteOverviewData | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(true);
  const controller = useRef<AbortController | null>(null);
  const base = config ? `/${config.owner}/${config.repo}/${encodeURIComponent(config.branch)}` : "";
  const load = useCallback(async () => {
    if (!base) return;
    controller.current?.abort();
    const pending = new AbortController();
    controller.current = pending;
    setBusy(true); setError("");
    try {
      const res = await fetch(`/api${base}/webs-overview`, { method: "POST", cache: "no-store", signal: pending.signal });
      const data = await res.json();
      if (!res.ok) throw Error(data.error || data.message || "Přehled se nepodařilo načíst.");
      if (!data.site?.checks || !data.site?.leads || !data.site?.measurement || !data.site?.links) throw Error(ui("Server vrátil neúplná data."));
      if (!pending.signal.aborted) setSite(data.site);
    } catch (e) { if (!pending.signal.aborted) setError((e as Error).message); }
    finally { if (!pending.signal.aborted) setBusy(false); }
  }, [base, ui]);
  useEffect(() => { setSite(null); void load(); return () => controller.current?.abort(); }, [load]);
  return <section lang={language} className="mx-auto max-w-5xl space-y-6 p-4 pb-24 md:p-6 md:pb-24">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><h1 className="text-2xl font-semibold">{site?.name ?? t("Přehled webu", "Website overview")}</h1>
        {site && <><p className="mt-1 text-sm text-muted-foreground">{(language === "en" ? englishStates : statusLabel)[site.status] ?? site.status} · <a className="underline" href={site.url} target="_blank" rel="noopener noreferrer">{site.domain && site.status === "live" ? site.domain : t("náhled webu", "website preview")}</a>{site.lastDeployAt && <> · {t("poslední nasazení", "last deployed")} {formatDate(site.lastDeployAt, language)}</>}</p>
        <SiteLinks language={language} className="mt-2 text-sm" links={site.measurement.clientAccess ? site.links : { site: site.links.site, preview: site.links.preview }}/></>}
      </div>
      <div className="flex flex-wrap items-center gap-2"><LanguageSwitcher/><Button variant="outline" disabled={busy} onClick={() => void load()}>{busy ? t("Načítání…", "Loading…") : t("Obnovit", "Refresh")}</Button></div>
    </div>
    {error && <div role="alert" className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm"><p className="font-medium">{t("Přehled se nepodařilo načíst.", "Could not load the overview.")}</p><p className="mt-1 text-muted-foreground">{t(error, "Please refresh and try again. If the problem continues, contact your administrator.")}</p><p className="mt-2 text-muted-foreground">{t("Návod níže i úpravy obsahu v menu můžete používat dál.", "You can still use the guide below and edit content from the menu.")}</p></div>}
    {busy && !site && <p role="status" className="rounded-xl border p-5 text-sm text-muted-foreground">{t("Načítáme stav webu a poptávky…", "Loading website status and enquiries…")}</p>}
    {site && <div className="grid gap-4 md:grid-cols-2">
      <section className="rounded-xl border p-5"><h2 className="mb-3 font-semibold">{t("Co je hotové", "Website checklist")}</h2><SiteChecklist language={language} checks={site.checks}/>
        {site.openRequest && <p className="mt-4 text-sm">{t("Rozpracovaná úprava:", "Change in progress:")} <strong>{(language === "en" ? englishStates : requestLabel)[site.openRequest.state] ?? site.openRequest.state}</strong>{site.openRequest.previewUrl && <> · <a className="underline" href={site.openRequest.previewUrl} target="_blank" rel="noopener noreferrer">{t("náhled", "preview")}</a></>}</p>}
      </section>
      <section className="rounded-xl border p-5"><h2 className="mb-3 font-semibold">{t("Poptávky", "Enquiries")}</h2><dl className="grid grid-cols-3 gap-3 text-center">
        {[ [t("7 dní", "7 days"),site.leads.last7], [t("30 dní", "30 days"),site.leads.last30], [t("Nedoručeno", "Undelivered"),site.leads.failed30] ].map(([label, count], i) => <div key={label}><dt className="text-xs text-muted-foreground">{label}</dt><dd className={`text-2xl font-semibold ${i === 2 && count ? "text-destructive" : ""}`}>{count}</dd></div>)}
      </dl><Link className="mt-4 inline-block text-sm underline" href={`${base}/submissions`}>{t("Formuláře a poptávky", "Forms and enquiries")}</Link></section>
    </div>}
    <ManagementGuide/>
  </section>;
}
