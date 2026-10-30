"use client";

import { UiText } from "@/components/ui-text";
import { ui, useUi } from "@/components/use-ui";
import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { internalProjectPath, publicProjectPath } from "@/lib/project-url";
import { RepoSidebar } from "@/components/repo/repo-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { useConfig } from "@/contexts/config-context";
import { useRepo } from "@/contexts/repo-context";
import { projectName } from "@/lib/project-name";
import { trackVisit } from "@/lib/tracker";
import {
  RepoHeaderProvider,
  useRepoHeaderState,
} from "@/components/repo/repo-header-context";
import { BotChat } from "@/components/webs/bot-chat";

function RepoHeader() {
  const { header } = useRepoHeaderState();
  const hasHeaderContent =
    header !== null &&
    header !== undefined &&
    header !== false &&
    header !== "";

  if (!hasHeaderContent) return null;

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center border-b bg-background px-4 md:px-6">
      <SidebarTrigger className="mr-2 md:hidden" />
      <div className="min-w-0 flex-1">{header}</div>
    </header>
  );
}

export function RepoLayout({ children }: { children: React.ReactNode }) {
  const ui = useUi();
  const { config } = useConfig();
  const { owner, repo } = useRepo();
  const pathname = internalProjectPath(usePathname());
  const review = config?.repo.startsWith("webs-obsah-")
    ? ["kontrola-importu", "kontrola-presmerovani"].find((name) => {
        const path = `/${config.owner}/${config.repo}/${encodeURIComponent(config.branch)}/collection/${name}`;
        return pathname === path || pathname.startsWith(path + "/");
      })
    : undefined;

  useEffect(() => {
    if (config?.owner && config?.repo && config?.branch) {
      trackVisit(owner, repo, config.branch, projectName(repo, config.object));
    }
  }, [config, owner, repo]);

  return (
    <SidebarProvider>
      <RepoHeaderProvider>
        <RepoSidebar />
        <SidebarInset className="min-h-screen">
          <RepoHeader />
          <main className="min-w-0 flex-1 p-4 md:p-6">
            {review && config && (
              <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border bg-muted/40 px-4 py-3 text-sm">
                <Link className="font-medium underline underline-offset-4" href={publicProjectPath(`/${config.owner}/${config.repo}/${encodeURIComponent(config.branch)}/transfer`) + (review === "kontrola-presmerovani" ? "?tab=redirects" : "?tab=content")}><UiText text={"← Export a import"}/></Link>
                <span className="text-muted-foreground">/ {review === "kontrola-presmerovani" ? ui("Kontrola přesměrování") : ui("Kontrola importu")}</span>
              </div>
            )}
            {children}
          </main>
          <BotChat />
        </SidebarInset>
      </RepoHeaderProvider>
    </SidebarProvider>
  );
}
