"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useConfig } from "@/contexts/config-context";
import { DocumentTitle } from "@/components/document-title";
import { RepoActionButtons } from "@/components/repo/repo-action-buttons";
import { getRootActions } from "@/lib/actions";
import { buttonVariants } from "@/components/ui/button";
import { Tabs } from "radix-ui";

export function ContentTransfer({ defaultTab = "content" }: { defaultTab?: string }) {
  const { config } = useConfig();
  const groups = useMemo(() => {
    const actions = getRootActions(config?.object);
    return [
      {
        key: "content",
        label: "Obsah",
        description: "Články a titulky a popisy stránek v souborech CSV nebo Excel.",
        review: "kontrola-importu",
        export: actions.filter((a) => ["export", "sablona-importu"].includes(a.name)),
        preview: actions.filter((a) => a.name === "import"),
        apply: actions.filter((a) => a.name === "import-potvrdit"),
      },
      {
        key: "redirects",
        label: "Přesměrování",
        description: "Pravidla pro přesměrování původních adres na nové adresy webu.",
        review: "kontrola-presmerovani",
        export: actions.filter((a) => a.name === "presmerovani-export"),
        preview: actions.filter((a) => a.name === "presmerovani-nahled"),
        apply: actions.filter((a) => a.name === "presmerovani-potvrdit"),
      },
    ].filter((group) => group.export.length + group.preview.length + group.apply.length > 0);
  }, [config?.object]);

  if (!config) return null;
  const base = `/${config.owner}/${config.repo}/${encodeURIComponent(config.branch)}`;
  const hasFiles = config.object.media?.some((item: { name?: string }) => item.name === "soubory");
  const buttons = (actions: ReturnType<typeof getRootActions>) => (
    <RepoActionButtons actions={actions} owner={config.owner} repo={config.repo}
      refName={config.branch} contextType="repo" />
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <DocumentTitle title="Export a import" />
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Export a import</h1>
        <p className="text-muted-foreground">Stáhněte data pro Excel nebo nahrajte změny zpět. Import nejdřív připraví náhled; použije se až po vaší kontrole a potvrzení.</p>
      </header>
      {hasFiles && (
        <section className="flex flex-wrap items-center justify-between gap-4 rounded-lg border p-5">
          <div>
            <h2 className="font-medium">Soubory pro export a import</h2>
            <p className="text-sm text-muted-foreground">Tady najdete vytvořené exporty a šablony a nahrajete soubor k importu.</p>
          </div>
          <Link className={buttonVariants({ variant: "outline" })} href={`${base}/media/soubory`}>Otevřít soubory</Link>
        </section>
      )}
      {groups.length > 0 ? (
        <Tabs.Root defaultValue={groups.some((group) => group.key === defaultTab) ? defaultTab : groups[0].key}>
          <Tabs.List className="inline-flex gap-1 rounded-lg bg-muted p-1" aria-label="Co chcete exportovat nebo importovat">
            {groups.map((group) => <Tabs.Trigger className="rounded-md px-4 py-2 text-sm font-medium focus-visible:outline focus-visible:outline-2 data-[state=active]:bg-background data-[state=active]:shadow-sm" key={group.key} value={group.key}>{group.label}</Tabs.Trigger>)}
          </Tabs.List>
          {groups.map((group) => (
            <Tabs.Content key={group.key} value={group.key} className="space-y-4 pt-4">
              <p className="text-sm text-muted-foreground">{group.description}</p>
              {group.export.length > 0 && (
                <section className="space-y-3 rounded-lg border p-5">
                  <h2 className="text-lg font-medium">Export a šablona</h2>
                  <p className="text-sm text-muted-foreground">Připravte aktuální data nebo prázdnou šablonu. Po dokončení je najdete v souborech. Web se nezmění.</p>
                  {buttons(group.export)}
                </section>
              )}
              {group.preview.length > 0 && (
                <section className="space-y-3 rounded-lg border p-5">
                  <h2 className="text-lg font-medium">Připravit a zkontrolovat import</h2>
                  <p className="text-sm text-muted-foreground">Nahrajte soubor, připravte náhled a otevřete kontrolu. Opravte upozornění a vyberte záznamy, které chcete použít. Web se zatím nezmění.</p>
                  {buttons(group.preview)}
                  <Link className={buttonVariants({ variant: "outline" })} href={`${base}/collection/${group.review}`}>{group.key === "redirects" ? "Kontrola přesměrování" : "Kontrola importu"}</Link>
                </section>
              )}
              {group.apply.length > 0 && (
                <section className="space-y-3 rounded-lg border p-5">
                  <h2 className="text-lg font-medium">Potvrdit zkontrolovaný import</h2>
                  <p className="text-sm text-muted-foreground">Použijte ID dávky z kontroly importu. {group.key === "content" ? "Nové články vzniknou jako koncepty. Změny již zveřejněných článků a SEO stránek se projeví na webu." : "Potvrzená pravidla nahradí aktuální přesměrování a spustí nasazení webu."}</p>
                  {buttons(group.apply)}
                </section>
              )}
            </Tabs.Content>
          ))}
        </Tabs.Root>
      ) : <p className="text-muted-foreground">Export a import pro tento web zatím není nastavený.</p>}
    </div>
  );
}