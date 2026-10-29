"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useConfig } from "@/contexts/config-context";
import { Button } from "@/components/ui/button";
import { formatDate, requestLabel, SiteChecklist, statusLabel, type SiteOverviewData } from "@/components/webs/site-checklist";

/** Úvodní stránka webu v administraci: co je hotové a co ne + návod na jednu stránku. */
export function SiteOverview() {
  const { config } = useConfig();
  const [site, setSite] = useState<SiteOverviewData | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const base = config ? `/${config.owner}/${config.repo}/${encodeURIComponent(config.branch)}` : "";

  const load = useCallback(async () => {
    if (!config) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api${base}/webs-overview`, { method: "POST", cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw Error(data.error || data.message || "Přehled se nepodařilo načíst.");
      setSite(data.site);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [base, config]);
  useEffect(() => void load(), [load]);

  return (
    <section className="mx-auto max-w-4xl space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{site?.name ?? "Přehled webu"}</h1>
          {site && (
            <p className="mt-1 text-sm text-muted-foreground">
              {statusLabel[site.status] ?? site.status} ·{" "}
              <a className="underline" href={site.url} target="_blank" rel="noopener noreferrer">
                {site.domain && site.status === "live" ? site.domain : "náhled webu"}
              </a>
              {site.lastDeployAt && <> · poslední nasazení {formatDate(site.lastDeployAt)}</>}
            </p>
          )}
        </div>
        <Button variant="outline" disabled={busy} onClick={() => void load()}>
          Obnovit
        </Button>
      </div>

      {error && (
        <div role="alert" className="rounded-lg border border-red-300 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {site && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border p-5">
            <h2 className="mb-3 font-semibold">Co je hotové</h2>
            <SiteChecklist checks={site.checks} />
            {site.openRequest && (
              <p className="mt-4 text-sm">
                Rozpracovaná úprava: <strong>{requestLabel[site.openRequest.state] ?? site.openRequest.state}</strong>
                {site.openRequest.previewUrl && (
                  <>
                    {" "}·{" "}
                    <a className="underline" href={site.openRequest.previewUrl} target="_blank" rel="noopener noreferrer">
                      náhled
                    </a>
                  </>
                )}
              </p>
            )}
          </div>
          <div className="rounded-lg border p-5">
            <h2 className="mb-3 font-semibold">Poptávky</h2>
            <dl className="grid grid-cols-3 gap-3 text-center">
              <div>
                <dt className="text-xs text-muted-foreground">7 dní</dt>
                <dd className="text-2xl font-semibold">{site.leads.last7}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">30 dní</dt>
                <dd className="text-2xl font-semibold">{site.leads.last30}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Nedoručeno</dt>
                <dd className={site.leads.failed30 ? "text-2xl font-semibold text-red-600" : "text-2xl font-semibold"}>{site.leads.failed30}</dd>
              </div>
            </dl>
            {config?.repo.startsWith("webs-obsah-") && (
              <Link className="mt-4 inline-block text-sm underline" href={`${base}/submissions`}>
                Formuláře a poptávky
              </Link>
            )}
          </div>
        </div>
      )}

      <article className="space-y-4 rounded-lg border p-5 text-sm leading-relaxed">
        <h2 className="text-lg font-semibold">Jak web spravovat</h2>
        <div>
          <h3 className="font-medium">Texty, fotky a články upravíte sami</h3>
          <p>
            V levém menu jsou stránky webu, články a nastavení (titulky pro Google). Článek je po uložení na webu
            zhruba do minuty, změna textů a fotek stránek za 3 až 5 minut. Novou stránku nebo změnu vzhledu
            zadejte botovi.
          </p>
        </div>
        <div>
          <h3 className="font-medium">Větší úpravy zadáte botovi</h3>
          <p>
            Napište, co chcete změnit, třeba „přidejte stránku s ceníkem“ nebo „změňte telefon“. Stačí tlačítko
            Napsat botovi vpravo dole, WhatsApp, e-mail nebo váš AI chat (Claude, ChatGPT) s konektorem{" "}
            <code>https://mcp.mobilut.com/mcp</code>. Bot připraví náhled a změna se nasadí, až ji potvrdíte tlačítkem
            Nasadit.
          </p>
        </div>
        <div>
          <h3 className="font-medium">Kam chodí poptávky</h3>
          <p>
            Odeslané formuláře chodí na e-maily nastavené u webu, případně rovnou do vašeho systému nebo k partnerovi.
            Přehled odeslání a jejich výsledek najdete v sekci Formuláře a poptávky.
          </p>
        </div>
        <div>
          <h3 className="font-medium">Návštěvnost a měření</h3>
          <p>
            Web měří přes Google Tag Manager a Google Analytics, jen se souhlasem z cookie lišty. Přístup vám dáme
            na váš Google účet, stačí nám napsat jeho e-mail.
          </p>
        </div>
        <div>
          <h3 className="font-medium">Když něco nefunguje</h3>
          <p>
            Napište botovi stejně jako u úprav, dotaz předá nám. Když se nedoručí poptávka, upozornění dostaneme
            i my.
          </p>
        </div>
      </article>
    </section>
  );
}
