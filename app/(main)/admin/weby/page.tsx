import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { MainRootLayout } from "../../main-root-layout";
import { requireAdminSession } from "@/lib/admin";
import { callWebsBot } from "@/lib/webs/bot";
import { DocumentTitle } from "@/components/document-title";
import { buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, SiteChecklist, statusLabel, type SiteOverviewData } from "@/components/webs/site-checklist";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

/** Přehled všech webů agentury pro správce (ADMIN_EMAILS): stav, měření, nasazení, leady. */
export default async function Page() {
  const { user } = await requireAdminSession();
  let sites: SiteOverviewData[] = [];
  let error = "";
  try {
    const { status, data } = await callWebsBot<{ sites?: SiteOverviewData[]; error?: string }>("/cms/overview", {
      op: "all",
      email: user.email,
      admin: true,
    });
    if (status !== 200) error = data.error ?? `Bot vrátil ${status}.`;
    sites = data.sites ?? [];
  } catch (e) {
    error = (e as Error).message;
  }
  const order = (s: SiteOverviewData) => (s.status === "live" ? 0 : 1);
  sites.sort((a, b) => order(a) - order(b) || a.name.localeCompare(b.name, "cs"));
  const todo = (s: SiteOverviewData) => s.checks.filter((c) => c.state === "todo").length;

  return (
    <MainRootLayout>
      <DocumentTitle title="Weby" />
      <div className="max-w-screen-xl mx-auto p-4 md:p-6 space-y-6">
        <Link className={cn(buttonVariants({ variant: "outline", size: "xs" }), "inline-flex")} href="/admin">
          <ArrowLeft />
          Admin
        </Link>
        <header>
          <h1 className="font-semibold tracking-tight text-lg md:text-2xl">Weby</h1>
          <p className="text-sm text-muted-foreground">
            Stav všech webů z bota: doména, měření, poslední nasazení a poptávky (bez náhledů). Údaje jsou z registru
            bota po posledním nasazení.
          </p>
        </header>
        {error && (
          <div role="alert" className="rounded-lg border border-red-300 p-4 text-sm text-red-700">
            {error}
          </div>
        )}
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Web</TableHead>
                <TableHead>Stav</TableHead>
                <TableHead>Měření</TableHead>
                <TableHead>Nasazeno</TableHead>
                <TableHead className="text-right">Leady 7 / 30 dní</TableHead>
                <TableHead className="text-right">Nedoručeno</TableHead>
                <TableHead className="text-right">AI tento měsíc</TableHead>
                <TableHead>Co chybí</TableHead>
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
                  </TableCell>
                  <TableCell>
                    {statusLabel[s.status] ?? s.status}
                    <div className="text-xs text-muted-foreground">
                      {s.domainActive ? "doména aktivní" : "bez domény"} · {s.indexable ? "indexace povolená" : "robots zakazuje"}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">
                    {s.measurement.gtm ? "GTM" : "bez GTM"} · {s.measurement.ga4 ? "GA4" : "bez GA4"} · {s.measurement.gsc ? "GSC" : "bez GSC"}
                    <div className="text-muted-foreground">
                      přístupy: {s.measurement.clientAccess}
                      {s.measurement.gtmOwner === "client" ? " · GTM klienta" : ""}
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{formatDate(s.lastDeployAt)}</TableCell>
                  <TableCell className="text-right">
                    {s.leads.last7} / {s.leads.last30}
                  </TableCell>
                  <TableCell className={cn("text-right", s.leads.failed30 && "font-semibold text-red-600")}>{s.leads.failed30}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">{s.aiSpendMonthUsd.toFixed(2)} USD</TableCell>
                  <TableCell className="min-w-64">
                    {todo(s) ? <SiteChecklist compact checks={s.checks.filter((c) => c.state === "todo")} /> : <span className="text-xs text-emerald-700">vše hotovo</span>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {!sites.length && !error && <p className="p-8 text-center text-muted-foreground">Žádné weby.</p>}
        </div>
      </div>
    </MainRootLayout>
  );
}
