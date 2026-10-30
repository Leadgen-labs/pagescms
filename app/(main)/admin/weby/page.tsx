import { ErrorText } from "@/components/error-text";
import { ui } from "@/lib/ui-source";
import { UiText } from "@/components/ui-text";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { MainRootLayout } from "../../main-root-layout";
import { requireAdminSession } from "@/lib/admin";
import { callWebsBot } from "@/lib/webs/bot";
import { DocumentTitle } from "@/components/document-title";
import { buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, SiteChecklist, SiteLinks, statusLabel, type SiteAlert, type SiteOverviewData } from "@/components/webs/site-checklist";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

/** Přehled všech webů agentury pro správce (ADMIN_EMAILS): stav, měření, nasazení, leady. */
export default async function Page() {
  const { user } = await requireAdminSession();
  let sites: SiteOverviewData[] = [];
  let alerts: SiteAlert[] = [];
  let checkedFor = 0;
  let error = "";
  try {
    const { status, data } = await callWebsBot<{ sites?: SiteOverviewData[]; alerts?: SiteAlert[]; checkedForSeconds?: number; error?: string }>("/cms/overview", {
      op: "all",
      email: user.email,
      admin: true,
    });
    if (status !== 200) error = data.error ?? `Bot vrátil ${status}.`;
    sites = data.sites ?? [];
    alerts = data.alerts ?? [];
    checkedFor = data.checkedForSeconds ?? 0;
  } catch (e) {
    error = (e as Error).message;
  }
  const order = (s: SiteOverviewData) => (s.status === "live" ? 0 : 1);
  sites.sort((a, b) => order(a) - order(b) || a.name.localeCompare(b.name, "cs"));
  const todo = (s: SiteOverviewData) => s.checks.filter((c) => c.state === "todo").length;

  return (
    <MainRootLayout>
      <DocumentTitle title={ui("Superadmin overview")} />
      <div className="max-w-screen-xl mx-auto p-4 md:p-6 space-y-6">
        <div className="flex flex-wrap gap-2"><Link className={cn(buttonVariants({ variant: "outline", size: "xs" }), "inline-flex")} href="/">
          <ArrowLeft />
          <UiText text="My websites" /></Link>
          <Link className={buttonVariants({ variant: "outline", size: "xs" })} href="/admin"><UiText text="User administration" /></Link></div>
        <header>
          <h1 className="font-semibold tracking-tight text-lg md:text-2xl"><UiText text="Superadmin overview" /></h1>
          <p className="text-sm text-muted-foreground">
            <UiText text={"Stav všech webů z bota: doména, měření, poslední nasazení a poptávky (bez náhledů). Dostupnost, robots.txt a nasazení se kontrolují nejvýš jednou za"}/>{Math.round(checkedFor / 60) || 5} <UiText text={"minut."}/></p>
        </header>
        {error && (
          <div role="alert" className="rounded-lg border border-red-300 p-4 text-sm text-red-700">
            <ErrorText text={String(error)}/>
          </div>
        )}
        {!error && (
          <section aria-label={ui("Co řešit")} className="space-y-2">
            {alerts.length ? (
              alerts.map((a, i) => (
                <div
                  key={`${a.slug}-${i}`}
                  role={a.level === "error" ? "alert" : undefined}
                  className={cn(
                    "rounded-lg border p-3 text-sm",
                    a.level === "error" ? "border-red-300 bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-200" : "border-amber-300 bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200",
                  )}
                >
                  <strong>{a.name}:</strong> {a.text}
                </div>
              ))
            ) : (
              <p className="rounded-lg border p-3 text-sm text-emerald-700"><UiText text={"Nic k řešení: poptávky se doručují, spuštěné weby odpovídají a měří."}/></p>
            )}
          </section>
        )}
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead><UiText text={"Web"}/></TableHead>
                <TableHead><UiText text={"Stav"} /></TableHead>
                <TableHead><UiText text={"Měření"}/></TableHead>
                <TableHead><UiText text={"Nasazeno"}/></TableHead>
                <TableHead className="text-right"><UiText text={"Leady 7 / 30 dní"}/></TableHead>
                <TableHead className="text-right"><UiText text={"Nedoručeno"}/></TableHead>
                <TableHead className="text-right"><UiText text={"AI tento měsíc"}/></TableHead>
                <TableHead><UiText text={"Co chybí"}/></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sites.map((s) => (
                <TableRow key={s.slug} className="align-top">
                  <TableCell>
                    <a className="font-medium underline" href={s.url} target="_blank" rel="noopener noreferrer">
                      {s.name}
                    </a>
                    <div className="text-xs text-muted-foreground">{s.domain ?? s.slug}</div>
                    <SiteLinks className="mt-1 text-xs" links={s.links} />
                  </TableCell>
                  <TableCell>
                    {statusLabel[s.status] ?? s.status}
                    <div className="text-xs text-muted-foreground">
                      {s.status === "live" && s.reachable === false ? ui("doména neodpovídá") : s.domainActive ? ui("doména aktivní") : ui("bez domény")} ·{" "}
                      {s.indexable ? ui("indexace povolená") : ui("robots zakazuje")}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">
                    {s.measurement.gtm ? "GTM" : ui("bez GTM")} · {s.measurement.ga4 ? "GA4" : ui("bez GA4")} · {s.measurement.gsc ? "GSC" : ui("bez GSC")}
                    <div className="text-muted-foreground">
                      <UiText text={"přístupy:"}/>{s.measurement.clientAccess}
                      {s.measurement.gtmOwner === "client" ? ui(" · GTM klienta") : ""}
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{formatDate(s.lastDeployAt)}</TableCell>
                  <TableCell className="text-right">
                    {s.leads.last7} / {s.leads.last30}
                  </TableCell>
                  <TableCell className={cn("text-right", s.leads.failed30 && "font-semibold text-red-600")}>{s.leads.failed30}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">{s.aiSpendMonthUsd != null ? `${s.aiSpendMonthUsd.toFixed(2)} USD` : "-"}</TableCell>
                  <TableCell className="min-w-64">
                    {todo(s) ? <SiteChecklist compact checks={s.checks.filter((c) => c.state === "todo")} /> : <span className="text-xs text-emerald-700"><UiText text={"vše hotovo"}/></span>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {!sites.length && !error && <p className="p-8 text-center text-muted-foreground"><UiText text={"Žádné weby."}/></p>}
        </div>
      </div>
    </MainRootLayout>
  );
}
