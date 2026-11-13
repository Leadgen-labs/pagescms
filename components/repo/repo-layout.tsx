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
import { cn } from "@/lib/utils";

function RepoHeader({ editorial }: { editorial: boolean }) {
  const { header } = useRepoHeaderState();
  const hasHeaderContent =
    header !== null &&
    header !== undefined &&
    header !== false &&
    header !== "";

  return (
    <header className={cn(
      "sticky top-0 z-30 flex min-h-14 shrink-0 items-center border-b bg-background px-3 md:px-6",
      !hasHeaderContent && "md:hidden",
      editorial && "min-h-16 py-2.5",
    )}>
      <SidebarTrigger className="mr-2 shrink-0 md:hidden" />
      {hasHeaderContent && <div className="min-w-0 flex-1 self-center">{header}</div>}
    </header>
  );
}

export function RepoLayout({ children }: { children: React.ReactNode }) {
  const ui = useUi();
  const { config } = useConfig();
  const { owner, repo } = useRepo();
  const pathname = internalProjectPath(usePathname());
  const contentWorkspace = config?.repo.toLowerCase().startsWith("webs-obsah-") === true
    && config.branch === "main";
  const editorial = contentWorkspace && /\/collection\/blog-[a-z]{2}(?:-[a-z]{2})?(?:\/|$)/.test(pathname);
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
    <SidebarProvider data-editorial={editorial || undefined}>
      <RepoHeaderProvider>
        <RepoSidebar editorial={contentWorkspace} />
        <SidebarInset className="min-h-screen">
          <RepoHeader editorial={editorial} />
          <div className={cn("min-w-0 flex-1 p-4 md:p-6", editorial && "bg-[var(--editorial-work)] px-3 sm:px-6")}>
            {review && config && (
              <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border bg-muted/40 px-4 py-3 text-sm">
                <Link className="font-medium underline underline-offset-4" href={publicProjectPath(`/${config.owner}/${config.repo}/${encodeURIComponent(config.branch)}/transfer`) + (review === "kontrola-presmerovani" ? "?tab=redirects" : "?tab=content")}><UiText text={"← Export a import"}/></Link>
                <span className="text-muted-foreground">/ {review === "kontrola-presmerovani" ? ui("Kontrola přesměrování") : ui("Kontrola importu")}</span>
              </div>
            )}
            {children}
          </div>
          <BotChat inline={editorial} />
        </SidebarInset>
      </RepoHeaderProvider>
    </SidebarProvider>
  );
}
