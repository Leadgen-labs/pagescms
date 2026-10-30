"use client";
import { useState } from "react";
import Link from "next/link";
import { LayoutDashboard } from "lucide-react";
import { useWebsites } from "@/hooks/use-websites";
import { websiteHref } from "@/lib/websites";
import { projectName } from "@/lib/project-name";
import { useUi } from "@/components/use-ui";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function WebsiteDashboard() {
  const ui = useUi();
  const { data, isLoading, isValidating, mutate } = useWebsites();
  const [search, setSearch] = useState("");
  const websites = (data?.websites || []).filter((website) => (website.displayName || projectName(website.repo)).toLocaleLowerCase().includes(search.toLocaleLowerCase()));
  return (
    <section className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      <header className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-2xl font-semibold">{ui("All websites")}</h1><p className="mt-1 text-muted-foreground">{ui("Choose a website to open its overview and manage its content.")}</p></div><Button variant="outline" disabled={isValidating} onClick={() => void mutate()}>{ui("Refresh")}</Button></header>
      <Input aria-label={ui("Search websites…")} placeholder={ui("Search websites…")} value={search} onChange={(event) => setSearch(event.target.value)} />
      {data?.failedAccounts ? <p role="alert" className="rounded-lg border p-4 text-sm">{ui("Some websites could not be loaded. Open the overview to retry.")}</p> : null}
      {isLoading ? <p role="status">{ui("Loading websites…")}</p> : websites.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{websites.map((website) => <article key={website.owner + "/" + website.repo} className="flex items-center gap-3 rounded-lg border p-5"><LayoutDashboard className="size-6 shrink-0 text-muted-foreground" /><Link className="min-w-0 flex-1 truncate font-medium hover:underline" href={websiteHref(website)}>{website.displayName || projectName(website.repo)}</Link><Link className={buttonVariants({variant:"outline",size:"sm"})} href={websiteHref(website)}>{ui("Open")}</Link></article>)}</div>
      ) : <p className="rounded-lg border p-6 text-muted-foreground">{search ? ui("No websites match your search.") : ui("No websites yet. Ask the website administrator for access.")}</p>}
    </section>
  );
}
