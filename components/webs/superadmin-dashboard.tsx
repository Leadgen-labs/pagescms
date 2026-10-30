"use client";

import { useMemo, useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Activity, ArrowLeft, ArrowRight, ArrowUpRight, Check, ChevronDown, CircleAlert, CircleCheck, Clock3, Coins, Globe2, Inbox, RefreshCw, Search, Settings2, ShieldCheck, X } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";
import { useUi } from "@/components/use-ui";
import { ErrorText } from "@/components/error-text";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { publicProjectPath } from "@/lib/project-url";
import { dashboardSummary, filterDashboardSites, groupWebsiteAlerts, type WebsiteFilter } from "@/lib/webs/dashboard";
import { formatDate, SiteChecklist, type SiteAlert, type SiteOverviewData } from "./site-checklist";

const websitePath = (slug: string) => publicProjectPath(`/Leadgen-labs/webs-obsah-${encodeURIComponent(slug)}/main/prehled`);
const avatarTones = ["bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300","bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300","bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300","bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"];

function StatCard({ label, value, note, icon, warning = false }: {label:string;value:ReactNode;note:ReactNode;icon:ReactNode;warning?:boolean}) {
  return <div className="rounded-2xl border border-border/70 bg-background p-4 shadow-sm shadow-black/[0.015] sm:p-5">
    <div className="flex items-center justify-between gap-2 text-xs font-medium text-muted-foreground sm:text-sm"><span>{label}</span><span className={cn("rounded-lg bg-muted/70 p-2 text-muted-foreground",warning && "bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-300")}>{icon}</span></div>
    <div className="mt-3 text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">{value}</div>
    <div className="mt-2 text-xs text-muted-foreground">{note}</div>
  </div>;
}

export function SuperadminDashboard({ sites, alerts, checkedForSeconds, error }: {sites:SiteOverviewData[];alerts:SiteAlert[];checkedForSeconds:number;error:string}) {
  const ui = useUi();
  const { language } = useLanguage();
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<WebsiteFilter>("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const summary = useMemo(() => dashboardSummary(sites,alerts),[sites,alerts]);
  const groups = useMemo(() => groupWebsiteAlerts(alerts),[alerts]);
  const visible = useMemo(() => filterDashboardSites(sites,alerts,search,filter,language),[sites,alerts,search,filter,language]);
  const amount = (value: number | null | undefined) => value == null ? "—" : new Intl.NumberFormat(language === "cs" ? "cs-CZ" : "en-GB",{style:"currency",currency:"USD",currencyDisplay:"code"}).format(value);
  const count = (value: number) => new Intl.NumberFormat(language === "cs" ? "cs-CZ" : "en-GB").format(value);
  const refresh = () => startRefresh(() => router.refresh());
  const alertText = (text: string) => {
    const failed = text.match(/^(\d+) nedoručených poptávek za 30 dní$/);
    if (failed) return ui("Undelivered enquiries: {0}",failed[1]);
    if (text === "Spuštěný web neměří (chybí GTM)") return ui("GTM container is missing");
    if (text === "Spuštěný web zakazuje vyhledávače (robots.txt)") return ui("Search indexing is blocked");
    const domain=text.match(/^Doména (.+) neodpovídá$/);
    if(domain)return ui("Domain {0} is not responding",domain[1]);
    return ui(text);
  };
  const filters: {key:WebsiteFilter;label:string;count:number}[] = [
    {key:"all",label:ui("All websites"),count:summary.total},
    {key:"attention",label:ui("Needs attention"),count:summary.attention},
    {key:"live",label:ui("Live"),count:summary.live},
    {key:"draft",label:ui("In preparation"),count:summary.draft},
  ];

  return <div className="min-h-[calc(100vh-4rem)] bg-muted/35">
    <div className="mx-auto max-w-[1440px] space-y-7 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
      <header className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <Link href="/" className="mb-5 inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"><ArrowLeft className="size-3.5"/>{ui("My websites")}</Link>
          <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary"><ShieldCheck className="size-3.5"/>{ui("Superadmin")}</div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{ui("Website portfolio")}</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">{ui("Website health, enquiries and tasks in one place.")}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin" className={cn(buttonVariants({variant:"outline",size:"sm"}),"h-9 bg-background")}><Settings2 className="size-4"/>{ui("User administration")}</Link>
          <Button variant="outline" size="sm" className="h-9 bg-background" onClick={refresh} disabled={refreshing}><RefreshCw className={cn("size-4",refreshing && "animate-spin")}/>{ui("Refresh")}</Button>
        </div>
      </header>

      {error ? <section role="alert" className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-destructive/20 bg-background p-6">
        <div className="flex items-start gap-3"><CircleAlert className="mt-0.5 size-5 shrink-0 text-destructive"/><div><h2 className="font-medium">{ui("The overview could not be loaded.")}</h2><p className="mt-1 text-sm text-muted-foreground"><ErrorText text={error}/></p></div></div>
        <Button variant="outline" onClick={refresh} disabled={refreshing}>{ui("Try again")}</Button>
      </section> : <>
        <section aria-label={ui("Portfolio summary")} className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
          <StatCard label={ui("Websites")} value={count(summary.total)} note={ui("Live: {0}",summary.live)} icon={<Globe2 className="size-4"/>}/>
          <StatCard label={ui("Enquiries in 30 days")} value={count(summary.enquiries30)} note={ui("Last 7 days: {0}",count(summary.enquiries7))} icon={<Inbox className="size-4"/>}/>
          <StatCard label={ui("Websites needing attention")} value={<span className={summary.attention ? "text-amber-600 dark:text-amber-400" : "text-primary"}>{count(summary.attention)}</span>} note={summary.failed30 ? ui("Undelivered enquiries: {0}",count(summary.failed30)) : ui("No failed deliveries")} icon={<CircleAlert className="size-4"/>} warning={summary.attention>0}/>
          <StatCard label={ui("AI this month")} value={<span className="text-xl sm:text-2xl xl:text-3xl">{amount(summary.spend)}</span>} note={summary.spend == null ? ui("Cost data is unavailable") : ui("Across all websites")} icon={<Coins className="size-4"/>}/>
        </section>

        {groups.length ? <section className="rounded-2xl border border-border/70 bg-background">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 px-5 py-4"><h2 className="flex items-center gap-2 text-sm font-semibold"><span className="flex size-6 items-center justify-center rounded-full bg-amber-50 text-amber-600 dark:bg-amber-950"><CircleAlert className="size-3.5"/></span>{ui("Needs attention")}<span className="text-xs font-normal text-muted-foreground">{ui("websites: {0}",groups.length)}</span></h2><button type="button" className="text-xs font-medium text-primary hover:underline" onClick={()=>setFilter("attention")}>{ui("Show affected websites")}<ArrowRight className="ml-1 inline size-3.5"/></button></div>
          <div className={cn("grid gap-px overflow-hidden rounded-b-2xl bg-border/50 md:grid-cols-2",groups.length>2&&"xl:grid-cols-3")}>{groups.map(group=><div key={group.slug} className="flex gap-3 bg-background p-5 last:rounded-b-2xl">
            <span className={cn("mt-0.5 size-2 shrink-0 rounded-full",group.level==="error"?"bg-rose-500":"bg-amber-400")}/>
            <div className="min-w-0 flex-1"><Link href={websitePath(group.slug)} className="text-sm font-semibold hover:text-primary">{group.name}<ArrowUpRight className="ml-1 inline size-3.5 text-muted-foreground"/></Link><ul className="mt-2 space-y-1.5">{group.alerts.map((alert,index)=><li key={index} className={cn("text-xs leading-5",alert.level==="error"?"text-rose-600 dark:text-rose-400":"text-muted-foreground")}>{alertText(alert.text)}</li>)}</ul></div>
          </div>)}</div>
        </section> : <div className="flex items-center gap-2 rounded-xl border border-primary/15 bg-primary/5 px-4 py-3 text-sm text-primary"><CircleCheck className="size-4 shrink-0"/>{ui("No operational alerts")}</div>}

        <section className="overflow-hidden rounded-2xl border border-border/70 bg-background">
          <div className="flex flex-wrap items-center justify-between gap-4 p-5"><div><h2 className="font-semibold">{ui("Websites")}</h2><p className="mt-1 text-xs text-muted-foreground">{ui("Open a website to manage its content.")}</p></div><div className="relative w-full sm:w-72"><Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"/><Input value={search} onChange={event=>setSearch(event.target.value)} placeholder={ui("Search name or domain…")} aria-label={ui("Search name or domain…")} className="h-9 bg-muted/30 pl-9 pr-8"/>{search&&<button type="button" aria-label={ui("Clear search")} onClick={()=>setSearch("")} className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"><X className="size-3.5"/></button>}</div></div>
          <div className="flex flex-wrap gap-1 border-b border-border/60 px-4 pb-4" role="group" aria-label={ui("Filter websites")}>{filters.map(item=><button key={item.key} type="button" aria-pressed={filter===item.key} onClick={()=>setFilter(item.key)} className={cn("inline-flex min-h-8 items-center gap-2 rounded-lg px-3 text-xs font-medium transition-colors",filter===item.key?"bg-foreground text-background":"text-muted-foreground hover:bg-muted hover:text-foreground")}>{item.label}<span className={cn("rounded px-1.5 py-0.5 text-[10px] tabular-nums",filter===item.key?"bg-background/15":"bg-muted")}>{item.count}</span></button>)}</div>
          <div className="hidden grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)_minmax(0,.65fr)_minmax(0,1fr)_minmax(0,.8fr)_7rem] items-center gap-4 border-b border-border/60 bg-muted/30 px-5 py-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground lg:grid"><span>{ui("Website")}</span><span>{ui("Status")}</span><span>{ui("Enquiries")}</span><span>{ui("Analytics")}</span><span>{ui("Checklist")}</span><span className="sr-only">{ui("Actions")}</span></div>
          <ul className="divide-y divide-border/60">{visible.map(site=>{
            const open=expanded===site.slug;
            const missing=site.checks.filter(check=>check.state==="todo").length;
            const siteAlerts=alerts.filter(alert=>alert.slug===site.slug);
            const live=site.status==="live";
            const status=live?ui("Live"):site.status==="paused"?ui("Paused"):site.status==="draft"?ui("In preparation"):site.status;
            const toolLinks: [string,string|null|undefined][] = [[ui("Website"),site.links.site],[ui("Preview"),site.links.preview],["GA4",site.links.ga4],["GTM",site.links.gtm],["Search Console",site.links.gsc]];
            const avatarIndex=[...site.slug].reduce((sum,char)=>sum+char.charCodeAt(0),0)%avatarTones.length;
            return <li key={site.slug} className={cn("transition-colors",open&&"bg-muted/20")}>
              <div className="grid items-center gap-4 p-5 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)_minmax(0,.65fr)_minmax(0,1fr)_minmax(0,.8fr)_7rem]">
                <div className="flex min-w-0 items-center gap-3"><span aria-hidden className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl text-sm font-semibold",avatarTones[avatarIndex])}>{site.name.slice(0,2).toLocaleUpperCase(language)}</span><div className="min-w-0"><h3 className="truncate text-sm font-semibold"><Link href={websitePath(site.slug)} className="hover:text-primary">{site.name}</Link></h3><a href={site.url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex max-w-full items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><span className="truncate">{site.domain??site.slug}</span><ArrowUpRight className="size-3 shrink-0"/></a></div></div>
                <div className="flex items-center justify-between gap-2 lg:block"><span className={cn("inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium",live?"bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300":site.status==="paused"?"bg-muted text-muted-foreground":"bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300")}><span className={cn("size-1.5 rounded-full",live?"bg-emerald-500":site.status==="paused"?"bg-muted-foreground":"bg-sky-500")}/>{status}</span><p className={cn("text-[11px] leading-5 lg:mt-1",siteAlerts.some(alert=>alert.level==="error")?"text-rose-600 dark:text-rose-400":"text-muted-foreground")}>{site.leads.failed30?ui("Undelivered: {0}",site.leads.failed30):live&&site.reachable===false?ui("Website not responding"):ui("Deployed: {0}",formatDate(site.lastDeployAt,language))}</p></div>
                <div className="grid grid-cols-2 items-center gap-3 sm:grid-cols-3 lg:contents">
                  <div><span className="mb-1 block text-[10px] uppercase tracking-wide text-muted-foreground lg:hidden">{ui("Enquiries")}</span><span className="text-sm font-semibold tabular-nums">{count(site.leads.last30)}</span><span className="ml-1 text-[10px] text-muted-foreground">{ui("30 days")}</span><p className="mt-1 text-[11px] text-muted-foreground">{ui("7 days: {0}",count(site.leads.last7))}</p></div>
                  <div><span className="mb-1 block text-[10px] uppercase tracking-wide text-muted-foreground lg:hidden">{ui("Analytics")}</span><div className="flex flex-wrap gap-1">{([['GTM',site.measurement.gtm],['GA4',site.measurement.ga4],['GSC',site.measurement.gsc]] as const).map(([label,ready])=><span key={label} title={ready?ui("Connected: {0}",label):ui("Not connected: {0}",label)} className={cn("inline-flex items-center gap-0.5 rounded border px-1 py-0.5 text-[10px] font-medium",ready?"border-border text-muted-foreground":"border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300")}><span className="sr-only">{ready?ui("Connected"):ui("Not connected")}</span>{ready?<Check className="size-2.5"/>:<X className="size-2.5"/>}{label}</span>)}</div></div>
                  <div className="col-span-2 flex items-center justify-between gap-2 sm:col-span-1 lg:block"><button type="button" aria-label={ui("Show details for {0}",site.name)} aria-expanded={open} aria-controls={open?`website-details-${site.slug}`:undefined} onClick={()=>setExpanded(open?null:site.slug)} className="inline-flex min-h-8 items-center gap-1 rounded-md text-xs text-muted-foreground hover:text-foreground">{missing?<><span className="size-1.5 rounded-full bg-amber-400"/>{ui("To complete: {0}",missing)}</>:<><CircleCheck className="size-3.5 text-primary"/>{ui("Complete")}</>}<ChevronDown className={cn("ml-1 size-3.5 transition-transform",open&&"rotate-180")}/></button><Link href={websitePath(site.slug)} className={cn(buttonVariants({variant:"outline",size:"sm"}),"lg:hidden")}>{ui("Manage")}<ArrowRight className="size-3.5"/></Link></div>
                </div>
                <Link href={websitePath(site.slug)} aria-label={ui("Manage {0}",site.name)} className={cn(buttonVariants({variant:"outline",size:"sm"}),"hidden justify-between text-xs lg:inline-flex")}>{ui("Manage")}<ArrowRight className="size-3.5"/></Link>
              </div>
              {open&&<div id={`website-details-${site.slug}`} className="grid gap-6 border-t border-border/60 bg-muted/30 p-5 md:grid-cols-[1.4fr_1fr] md:gap-10 md:px-8 md:py-6">
                <div><h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{ui("Website checklist")}</h4><SiteChecklist checks={site.checks} language={language}/></div>
                <div><h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{ui("Tools and operations")}</h4><div className="flex flex-wrap gap-2">{toolLinks.filter((item):item is [string,string]=>Boolean(item[1])).map(([label,href])=><a key={label} href={href} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants({variant:"outline",size:"xs"}),"bg-background")}>{label}<ArrowUpRight className="size-3"/></a>)}</div><dl className="mt-5 space-y-3 text-xs"><div className="flex justify-between gap-4"><dt className="text-muted-foreground">{ui("Deployed")}</dt><dd>{formatDate(site.lastDeployAt,language)}</dd></div><div className="flex justify-between gap-4"><dt className="text-muted-foreground">{ui("AI this month")}</dt><dd className="tabular-nums">{amount(site.aiSpendMonthUsd)}</dd></div><div className="flex justify-between gap-4"><dt className="text-muted-foreground">{ui("Analytics access")}</dt><dd>{site.measurement.clientAccess}</dd></div></dl>{site.openRequest&&<div className="mt-4 rounded-lg border bg-background p-3 text-xs"><p className="flex items-center gap-1.5 font-medium"><Activity className="size-3.5"/>{ui("An update is in progress")}</p>{site.openRequest.previewUrl&&<a href={site.openRequest.previewUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-primary hover:underline">{ui("Open preview")}<ArrowUpRight className="size-3"/></a>}</div>}</div>
              </div>}
            </li>;
          })}</ul>
          {!visible.length&&<div className="flex flex-col items-center px-6 py-14 text-center"><Globe2 className="mb-4 size-8 text-muted-foreground/50"/><h3 className="text-sm font-medium">{sites.length?ui("No websites match your filters."):ui("No websites available yet.")}</h3>{sites.length>0&&<Button variant="ghost" size="sm" className="mt-3" onClick={()=>{setSearch("");setFilter("all");}}>{ui("Reset filters")}</Button>}</div>}
          <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 px-5 py-3 text-[11px] text-muted-foreground"><span aria-live="polite">{ui("Showing {0} of {1} websites",visible.length,sites.length)}</span><span className="inline-flex items-center gap-1"><Clock3 className="size-3"/>{ui("Website check interval: {0} min",Math.round(checkedForSeconds/60)||5)}</span></footer>
        </section>
      </>}
    </div>
  </div>;
}
